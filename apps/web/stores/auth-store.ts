import { create } from 'zustand'

import {
  authenticatedFetch,
  cloudSessionFetch,
  logoutCloudAccount,
  logoutCloudSession,
} from '@/service/auth-client'
import { cloudConsoleUrl } from '@/utils/cloud-console'
import { deploymentProfile, type DeploymentProfile } from '@/utils/deployment-profile'

import {
  browserSessionStorage,
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from './auth-session'

interface AuthState {
  profile: DeploymentProfile
  token: string | null
  isAuthenticated: boolean
  sessionRevision: number
  setToken: (token: string) => void
  clear: () => void
  logout: () => Promise<void>
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

interface AuthStoreOptions {
  profile?: DeploymentProfile
  storage?: Storage | null
  fetcher?: typeof fetch
  origin?: string
  cloudConsoleUrl?: string
  redirectToCloudConsole?: (url: string) => void
}

export function createAuthStore(options: AuthStoreOptions = {}) {
  const profile = options.profile ?? deploymentProfile
  const storage = options.storage === undefined ? browserSessionStorage() : options.storage
  const fetcher = options.fetcher ?? fetch
  const consoleUrl = options.cloudConsoleUrl ?? cloudConsoleUrl
  const storedToken = profile === 'on-prem' ? loadStoredToken(storage) : null

  return create<AuthState>((set, get) => ({
    profile,
    token: storedToken,
    isAuthenticated: profile === 'cloud' || Boolean(storedToken),
    sessionRevision: 0,
    setToken: (token) => {
      if (profile === 'cloud') return
      saveStoredToken(storage, token)
      set({ token, isAuthenticated: true, sessionRevision: get().sessionRevision + 1 })
    },
    clear: () => {
      if (profile === 'on-prem') clearStoredToken(storage)
      set({ token: null, isAuthenticated: false, sessionRevision: get().sessionRevision + 1 })
    },
    logout: async () => {
      if (profile === 'cloud') {
        try {
          await logoutCloudSession(fetcher, options.origin)
        } catch {
          // The Cloud control plane also revokes the Cluster session by its recorded JTIs.
        }
        await logoutCloudAccount(fetcher, consoleUrl)
        return
      }
      get().clear()
    },
    apiFetch: async (input, init = {}) => {
      const originalSession = get().sessionRevision
      const response =
        profile === 'cloud'
          ? await cloudSessionFetch(input, init, fetcher, options.origin)
          : await authenticatedFetch(input, init, get().token, fetcher)
      if (
        response.status === 401 &&
        originalSession === get().sessionRevision &&
        get().isAuthenticated
      ) {
        get().clear()
        // The entry gate offers an explicit sign-in action; automatic redirects can loop on outages.
      }
      return response
    },
  }))
}

export const useAuthStore = createAuthStore()
