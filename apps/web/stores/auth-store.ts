import { create } from 'zustand'

import {
  authenticatedFetch,
  AuthClientError,
  cloudSessionFetch,
  logoutCloudAccount,
  logoutCloudSession,
  type LoginCredentials,
} from '@/service/auth-client'
import { browserAuthRequest, type BrowserAccessGrant } from '@/service/browser-auth-client'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'
import { deploymentProfile, type DeploymentProfile } from '@/utils/deployment-profile'

import { browserSessionStorage, clearStoredToken } from './auth-session'
import { createBrowserAuthSync, type BrowserAuthSync } from './browser-auth-sync'

type SessionStatus = 'checking' | 'authenticated' | 'anonymous' | 'unavailable'
interface AuthState {
  profile: DeploymentProfile
  token: string | null
  isAuthenticated: boolean
  status: SessionStatus
  principal: string | null
  sessionId: string | null
  issuer: string | null
  authEpoch: number
  recoveryReason: 'network' | 'upgrade' | 'browser'
  accessExpiresAt: number
  clear: () => void
  restore: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  connect: () => () => void
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}
interface AuthStoreOptions {
  profile?: DeploymentProfile
  storage?: Storage | null
  fetcher?: typeof fetch
  origin?: string
  cloudConsoleUrl?: string
  redirectToCloudConsole?: (url: string) => void
  sync?: BrowserAuthSync
  now?: () => number
}
const authChanged = () =>
  new DOMException('Authentication changed during the request', 'AbortError')
const isSessionRefusal = (error: unknown) =>
  error instanceof AuthClientError &&
  error.status === 401 &&
  error.code === 'control.unauthenticated'

export function createAuthStore(options: AuthStoreOptions = {}) {
  const profile = options.profile ?? deploymentProfile
  const fetcher = options.fetcher ?? fetch
  const consoleUrl = options.cloudConsoleUrl ?? cloudConsoleUrl
  const now = options.now ?? Date.now
  const storage = options.storage === undefined ? browserSessionStorage() : options.storage
  if (profile === 'on-prem') clearStoredToken(storage)
  let sync = options.sync
  const coordinator = () => (sync ??= createBrowserAuthSync())
  let restoring: Promise<void> | null = null
  let requests = new AbortController()
  let appliedRevision = ''
  const store = create<AuthState>((set, get) => {
    const invalidate = (status: SessionStatus) => {
      requests.abort()
      requests = new AbortController()
      set({
        token: null,
        isAuthenticated: false,
        principal: null,
        issuer: null,
        sessionId: null,
        accessExpiresAt: 0,
        status,
        authEpoch: get().authEpoch + 1,
      })
    }
    const accept = (grant: BrowserAccessGrant) => {
      if (
        get().sessionId &&
        (get().principal !== grant.principal ||
          get().sessionId !== grant.sessionId ||
          get().issuer !== grant.issuer)
      )
        invalidate('checking')
      set({
        token: grant.token,
        principal: grant.principal,
        issuer: grant.issuer,
        sessionId: grant.sessionId,
        accessExpiresAt: Date.parse(grant.accessExpiresAt),
        isAuthenticated: true,
        status: 'authenticated',
      })
    }
    return {
      profile,
      token: null,
      isAuthenticated: profile === 'cloud',
      status: profile === 'cloud' ? 'authenticated' : 'checking',
      principal: null,
      issuer: null,
      sessionId: null,
      authEpoch: 0,
      accessExpiresAt: 0,
      recoveryReason: 'network',
      clear: () => invalidate('anonymous'),
      restore: async () => {
        if (profile === 'cloud') return
        if (restoring)
          return restoring.catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return get().restore()
            throw error
          })
        const epoch = get().authEpoch
        set({ status: 'checking' })
        restoring = coordinator()
          .read(async () => {
            const revision = coordinator().revision()
            const grant = await browserAuthRequest('session', fetcher)
            if (get().authEpoch !== epoch || coordinator().revision() !== revision)
              throw authChanged()
            if (grant) {
              appliedRevision = revision
              accept(grant)
            }
          })
          .catch((error: unknown) => {
            if (get().authEpoch !== epoch) throw authChanged()
            if (isSessionRefusal(error)) invalidate('anonymous')
            else
              set({
                status: 'unavailable',
                recoveryReason:
                  error instanceof AuthClientError && error.kind === 'browser'
                    ? 'browser'
                    : error instanceof AuthClientError &&
                        (error.status === 404 || error.status === 405)
                      ? 'upgrade'
                      : 'network',
              })
            throw error
          })
          .finally(() => {
            restoring = null
          })
        return restoring
      },
      login: async (credentials) => {
        if (profile === 'cloud') return
        invalidate('checking')
        const epoch = get().authEpoch
        try {
          const result = await coordinator().mutate(() =>
            browserAuthRequest('login', fetcher, credentials),
          )
          if (get().authEpoch !== epoch || coordinator().revision() !== result.revision)
            throw authChanged()
          if (result.value) {
            appliedRevision = result.revision
            accept(result.value)
          }
        } catch (error) {
          if (get().authEpoch === epoch) {
            try {
              await get().restore()
            } catch {
              /* restore records the recoverable authority state. */
            }
          }
          throw error
        }
      },
      logout: async () => {
        if (profile === 'cloud') {
          try {
            await logoutCloudSession(fetcher, options.origin)
          } catch {
            /* The control plane also revokes recorded Cluster sessions. */
          }
          await logoutCloudAccount(fetcher, consoleUrl)
          return
        }
        invalidate('checking')
        try {
          await coordinator().mutate(() => browserAuthRequest('logout', fetcher))
          invalidate('anonymous')
        } catch (error) {
          try {
            await get().restore()
          } catch {
            /* A successful session check restores the existing account. */
          }
          if (!get().isAuthenticated && get().status !== 'anonymous') set({ status: 'unavailable' })
          throw error
        }
      },
      connect: () => {
        if (profile === 'cloud') return () => undefined
        const changed = () => {
          invalidate('checking')
          void get()
            .restore()
            .catch(() => undefined)
        }
        const resume = () => {
          if (document.visibilityState === 'visible') {
            if (coordinator().revision() !== appliedRevision) changed()
            else
              void get()
                .restore()
                .catch(() => undefined)
          }
        }
        const unsubscribe = coordinator().subscribe(changed)
        window.addEventListener('focus', resume)
        window.addEventListener('pageshow', resume)
        document.addEventListener('visibilitychange', resume)
        void get()
          .restore()
          .catch(() => undefined)
        return () => {
          unsubscribe()
          window.removeEventListener('focus', resume)
          window.removeEventListener('pageshow', resume)
          document.removeEventListener('visibilitychange', resume)
        }
      },
      apiFetch: async (input, init = {}) => {
        if (profile === 'cloud') {
          const response = await cloudSessionFetch(input, init, fetcher, options.origin)
          if (response.status === 401) {
            get().clear()
            ;(options.redirectToCloudConsole ?? replaceWithCloudConsole)(consoleUrl)
          }
          return response
        }
        const origin = options.origin ?? window.location.origin
        const target = input instanceof Request ? input.url : input.toString()
        if (new URL(target, origin).origin !== origin)
          throw new AuthClientError('protocol', 'workbench requests must use the current origin')
        const starting = get()
        const expected = starting.sessionId
        const principal = starting.principal
        if (
          !starting.token ||
          (starting.accessExpiresAt && starting.accessExpiresAt <= now() + 60_000) ||
          (sync && coordinator().revision() !== appliedRevision)
        )
          await get().restore()
        if (expected && (get().sessionId !== expected || get().principal !== principal))
          throw authChanged()
        const epoch = get().authEpoch
        const revision = sync?.revision() ?? ''
        const stable = () => {
          if (epoch !== get().authEpoch || (sync && sync.revision() !== revision))
            throw authChanged()
        }
        const signal = AbortSignal.any([
          requests.signal,
          ...(init.signal ? [init.signal] : []),
          ...(input instanceof Request ? [input.signal] : []),
        ])
        const retryInput = input instanceof Request ? input.clone() : input
        const send = () =>
          authenticatedFetch(
            retryInput instanceof Request ? retryInput.clone() : retryInput,
            { ...init, signal },
            get().token,
            fetcher,
          )
        const response = await send()
        stable()
        if (response.status !== 401) return response
        const payload: unknown = await response
          .clone()
          .json()
          .catch(() => null)
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('code' in payload) ||
          payload.code !== 'control.unauthenticated'
        )
          return response
        const identity = get().sessionId
        const retryPrincipal = get().principal
        await get().restore()
        stable()
        if (get().sessionId !== identity || get().principal !== retryPrincipal) throw authChanged()
        if (typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream)
          return response
        const retried = await send()
        stable()
        return retried
      },
    }
  })
  return store
}
export const useAuthStore = createAuthStore()
