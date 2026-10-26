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
  storageRequest,
  type StorageSnapshot,
  StorageClientError,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

export interface StorageEntry {
  mode: 'OP' | 'CLOUD'
  management: boolean
  entry: 'LOGIN' | 'SETUP_REQUIRED' | 'RESTART_REQUIRED' | 'FIRST_ADMIN_REQUIRED' | 'UNAVAILABLE'
}
interface StorageState {
  entry?: StorageEntry
  snapshot?: StorageSnapshot
  loading: boolean
  error: unknown
  refresh: (configurationChanged?: boolean) => Promise<void>
  fetcher: typeof fetch
  authorize: (capability: string) => void
  authorized: boolean
  session: number
  authorityRevision: number
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
  const [authorization, setAuthorization] = useState({ secret: '', revision: 0 })
  const previous = useRef<StorageSnapshot | undefined>(undefined)
  const queryKey = useMemo(
    () => ['storage', window.location.origin, auth.sessionRevision, authorization.revision],
    [auth.sessionRevision, authorization.revision],
  )
  const fetcher = useMemo<typeof fetch>(
    () =>
      async (input, init = {}) => {
        if (!authorization.secret) return auth.apiFetch(input, init)
        const headers = new Headers(init.headers)
        headers.set('X-Tapstate-Setup-Capability', authorization.secret)
        return fetch(input, { ...init, credentials: 'same-origin', headers })
      },
    [authorization.secret, auth.apiFetch],
  )
  const query = useQuery<{ entry: StorageEntry; snapshot?: StorageSnapshot; failure?: unknown }>({
    queryKey,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 12 &&
      !query.state.data?.failure &&
      ['PREPARING', 'RECOVERING'].includes(query.state.data?.snapshot?.businessPhase ?? '')
        ? 3000
        : false,
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
      if (signal.aborted || useAuthStore.getState().sessionRevision !== auth.sessionRevision)
        throw new DOMException('Request superseded', 'AbortError')
      if (entry.mode !== (auth.profile === 'cloud' ? 'CLOUD' : 'OP'))
        throw new StorageClientError('protocol', 200)
      if (
        entry.management
          ? !authorization.secret || ['LOGIN', 'RESTART_REQUIRED'].includes(entry.entry)
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
        entry: query.data?.entry,
        snapshot: query.data?.snapshot,
        loading: query.isPending,
        error: query.error ?? query.data?.failure,
        fetcher,
        refresh,
        authorized: Boolean(authorization.secret),
        session: auth.sessionRevision,
        authorityRevision: authorization.revision,
        authorize: (secret) => {
          previous.current = undefined
          setAuthorization((current) => ({ secret, revision: current.revision + 1 }))
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
