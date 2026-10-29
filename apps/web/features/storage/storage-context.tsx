import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  acceptSnapshot,
  validateInitializationProgress,
  type InitializationProgress,
  storageRequest,
  type StorageSnapshot,
  StorageClientError,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

export interface StorageEntry {
  initializationProgress?: InitializationProgress
  mode: 'OP' | 'CLOUD'
  management: boolean
  automaticAuthorization?: boolean
  normalLoginUrl?: string
  entry: 'LOGIN' | 'SETUP_REQUIRED' | 'RESTART_REQUIRED' | 'FIRST_ADMIN_REQUIRED' | 'UNAVAILABLE'
}
interface StorageState {
  entry?: StorageEntry
  snapshot?: StorageSnapshot
  lastKnownSnapshot?: StorageSnapshot
  loading: boolean
  error: unknown
  refresh: (configurationChanged?: boolean) => Promise<void>
  fetcher: typeof fetch
  authorize: (capability: string) => void
  authorized: boolean
  session: number
  authorityRevision: number
  setSetupPending: (pending: boolean) => void
  setOpRestartExpected: (pending: boolean) => void
  opRestartExpected: boolean
  autoRefreshing: boolean
}
const Context = createContext<StorageState | null>(null)
export function useStorage() {
  const value = useContext(Context)
  if (!value) throw new Error('StorageProvider is required')
  return value
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const [authorization, setAuthorization] = useState({ secret: '', revision: 0, purpose: 'SETUP' })
  const [setupPending, setSetupPending] = useState(false)
  const [opRestartExpected, setOpRestartExpected] = useState(false)
  const previous = useRef<StorageSnapshot | undefined>(undefined)
  const previousEntry = useRef<StorageEntry | undefined>(undefined)
  const queryKey = useMemo(
    () => ['storage', window.location.origin, auth.sessionRevision, authorization.revision],
    [auth.sessionRevision, authorization.revision],
  )
  const fetcher = useMemo<typeof fetch>(
    () =>
      async (input, init = {}) => {
        if (!authorization.secret) {
          const entry = previousEntry.current
          if (entry?.mode === 'OP' && entry.management && entry.automaticAuthorization)
            return fetch(input, { ...init, credentials: 'same-origin' })
          return auth.apiFetch(input, init)
        }
        const headers = new Headers(init.headers)
        headers.set('X-Tapstate-Setup-Capability', authorization.secret)
        return fetch(input, { ...init, credentials: 'same-origin', headers })
      },
    [authorization.secret, auth.apiFetch],
  )
  function pollInterval(
    snapshot: StorageSnapshot | undefined,
    failure: unknown,
    entry?: StorageEntry,
  ) {
    const temporaryFailure =
      failure instanceof TypeError ||
      (failure instanceof StorageClientError && failure.status >= 500)
    if (
      opRestartExpected &&
      (!failure || temporaryFailure) &&
      entry?.initializationProgress?.state !== 'FAILED' &&
      !['FIRST_ADMIN_REQUIRED', 'LOGIN'].includes(entry?.entry ?? '')
    )
      return 2000
    // Only rediscover the public entry after the temporary Cloud session is retired.
    // The query function still refuses protected status reads without a current session.
    if (
      auth.profile === 'cloud' &&
      !auth.isAuthenticated &&
      !authorization.secret &&
      (!entry || (!entry.management && entry.entry === 'UNAVAILABLE')) &&
      (temporaryFailure || (!failure && entry?.entry === 'UNAVAILABLE'))
    )
      return 10000
    if (
      entry?.management &&
      (entry.initializationProgress?.state === 'RUNNING' ||
        (entry.entry === 'RESTART_REQUIRED' && entry.initializationProgress?.state === 'COMPLETE'))
    )
      return 2000
    const authorized = entry
      ? entry.management
        ? Boolean(authorization.secret) || entry.automaticAuthorization === true
        : auth.isAuthenticated
      : Boolean(authorization.secret) || auth.isAuthenticated
    if (!authorized) return false
    const latest = snapshot ?? previous.current
    if (latest?.initializationProgress?.state === 'FAILED') return false
    if (
      entry &&
      (['RESTART_REQUIRED', 'FIRST_ADMIN_REQUIRED', 'UNAVAILABLE'].includes(entry.entry) ||
        (entry.management && entry.entry === 'LOGIN'))
    )
      return false
    if (failure && !temporaryFailure) return false
    const phase = latest?.businessPhase
    const transitioning = ['PREPARING', 'RECOVERING', 'AUTH_READY'].includes(phase ?? '')
    const pendingInitialSave =
      phase === 'NOT_CONFIGURED' &&
      (setupPending || latest?.initializationProgress?.state === 'RUNNING')
    // A known intervention or terminal phase wins over an outstanding write or failed read.
    if (phase && !transitioning && !pendingInitialSave) return false
    if (temporaryFailure) return 10000
    if (!setupPending && !transitioning && !pendingInitialSave) return false
    return 3000
  }
  const query = useQuery<{ entry: StorageEntry; snapshot?: StorageSnapshot; failure?: unknown }>({
    queryKey,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      pollInterval(
        query.state.data?.snapshot,
        query.state.error ?? query.state.data?.failure,
        query.state.data?.entry,
      ),
    queryFn: async ({ signal }) => {
      const response = await fetch('/auth/storage-entry', {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      })
      if (!response.ok) throw new StorageClientError('unavailable', response.status)
      const entry = (await response.json()) as StorageEntry
      if (
        !entry ||
        !['OP', 'CLOUD'].includes(entry.mode) ||
        typeof entry.management !== 'boolean' ||
        ![
          'LOGIN',
          'SETUP_REQUIRED',
          'RESTART_REQUIRED',
          'FIRST_ADMIN_REQUIRED',
          'UNAVAILABLE',
        ].includes(entry.entry)
      )
        throw new StorageClientError('protocol', 200)
      if (entry.initializationProgress !== undefined) {
        if (!entry.management || entry.mode !== 'OP') throw new StorageClientError('protocol', 200)
        validateInitializationProgress(entry.initializationProgress)
      }
      if (signal.aborted || useAuthStore.getState().sessionRevision !== auth.sessionRevision)
        throw new DOMException('Request superseded', 'AbortError')
      if (entry.mode !== (auth.profile === 'cloud' ? 'CLOUD' : 'OP'))
        throw new StorageClientError('protocol', 200)
      previousEntry.current = entry
      if (
        entry.management
          ? (!authorization.secret && !entry.automaticAuthorization) ||
            ['LOGIN', 'RESTART_REQUIRED'].includes(entry.entry) ||
            entry.initializationProgress?.state === 'RUNNING' ||
            (entry.entry === 'FIRST_ADMIN_REQUIRED' &&
              authorization.purpose === 'SETUP' &&
              !entry.automaticAuthorization)
          : !auth.isAuthenticated
      )
        return { entry, snapshot: undefined, failure: undefined }
      try {
        const snapshot = acceptSnapshot(
          previous.current,
          await storageRequest<StorageSnapshot>(fetcher, 'storage.status', {}, signal),
        )
        if (signal.aborted || useAuthStore.getState().sessionRevision !== auth.sessionRevision)
          throw new DOMException('Request superseded', 'AbortError')
        previous.current = snapshot
        return { entry, snapshot, failure: undefined }
      } catch (failure) {
        if (signal.aborted || useAuthStore.getState().sessionRevision !== auth.sessionRevision)
          throw new DOMException('Request superseded', 'AbortError')
        return { entry, snapshot: undefined, failure }
      }
    },
  })
  useEffect(() => {
    const entry = query.data?.entry
    const failure = query.error ?? query.data?.failure
    if (
      entry?.initializationProgress?.state === 'FAILED' ||
      (entry && ['FIRST_ADMIN_REQUIRED', 'LOGIN'].includes(entry.entry)) ||
      (failure instanceof StorageClientError && failure.status < 500)
    )
      setOpRestartExpected(false)
  }, [query.data, query.error])
  useEffect(
    () => () => {
      void queryClient.cancelQueries({ queryKey })
      queryClient.removeQueries({ queryKey })
    },
    [queryClient, queryKey],
  )
  async function refresh(configurationChanged = false) {
    await queryClient.cancelQueries({ queryKey })
    const affected = configurationChanged
      ? [['sources'], ['source-schema'], ['pipelines'], ['views'], ['wizard'], ['artifacts']]
      : []
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      ...affected.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    ])
  }
  return (
    <Context.Provider
      value={{
        entry: query.data?.entry ?? (opRestartExpected ? previousEntry.current : undefined),
        snapshot: query.data?.snapshot,
        lastKnownSnapshot: previous.current,
        loading: query.isPending,
        error: query.error ?? query.data?.failure,
        fetcher,
        refresh,
        authorized:
          query.data?.entry.automaticAuthorization === true ||
          (Boolean(authorization.secret) &&
            !(
              query.data?.entry.entry === 'FIRST_ADMIN_REQUIRED' &&
              authorization.purpose === 'SETUP'
            )),
        session: auth.sessionRevision,
        authorityRevision: authorization.revision,
        setSetupPending,
        setOpRestartExpected,
        opRestartExpected,
        autoRefreshing: Boolean(
          pollInterval(query.data?.snapshot, query.error ?? query.data?.failure, query.data?.entry),
        ),
        authorize: (secret) => {
          previous.current = undefined
          setAuthorization((current) => ({
            secret,
            revision: current.revision + 1,
            purpose: query.data?.entry.entry === 'FIRST_ADMIN_REQUIRED' ? 'FIRST_ADMIN' : 'SETUP',
          }))
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
