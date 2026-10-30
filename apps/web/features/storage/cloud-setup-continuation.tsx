import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

import {
  loadCloudWorkspaceContext,
  type CloudWorkspaceContext,
} from '@/service/cloud-workspace-client'
import {
  setupOperationScope,
  StorageClientError,
  type InitializationProgress,
  type StorageSnapshot,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'
import { cloudConsoleUrl } from '@/utils/cloud-console'

interface Continuation {
  session: number
  scope: string
  organizationId: string
  clusterId: string
  armed: boolean
  progress?: InitializationProgress
}
interface ContinuationState {
  intent?: Continuation
  prepare: (snapshot: StorageSnapshot) => Promise<void>
  submitted: (snapshot: StorageSnapshot) => void
  refused: (snapshot: StorageSnapshot, failure: unknown) => void
  discard: () => void
}
const Context = createContext<ContinuationState>({
  prepare: async () => {},
  submitted: () => {},
  refused: () => {},
  discard: () => {},
})
export const useCloudSetupContinuation = () => useContext(Context)

export function cloudSetupContinuationUrl(
  intent: Pick<Continuation, 'organizationId' | 'clusterId'>,
) {
  const url = new URL('/', cloudConsoleUrl)
  url.searchParams.set('organizationId', intent.organizationId)
  url.searchParams.set('enterClusterId', intent.clusterId)
  return url.toString()
}

/** Survives the temporary-session boundary, but never persists a credential or navigation intent. */
export function CloudSetupContinuationProvider({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState<Continuation>()
  const continuationRevision = useRef(0)
  const selectedScope = useRef('')
  const context = useRef<{ session: number; promise: Promise<CloudWorkspaceContext> } | undefined>(
    undefined,
  )
  const prepare = useCallback(async (snapshot: StorageSnapshot) => {
    const auth = useAuthStore.getState()
    if (auth.profile !== 'cloud' || snapshot.mode !== 'CLOUD') return
    if (!auth.isAuthenticated || snapshot.authGeneration > 1 || snapshot.bindingVersion > 1)
      throw new StorageClientError('stale', 409)
    const scope = `${auth.sessionRevision}:${setupOperationScope(snapshot)}`
    if (selectedScope.current !== scope) {
      selectedScope.current = scope
      continuationRevision.current += 1
      setIntent(undefined)
    }
    const revision = continuationRevision.current
    let selected = context.current
    if (!selected || selected.session !== auth.sessionRevision) {
      selected = {
        session: auth.sessionRevision,
        promise: loadCloudWorkspaceContext(auth.apiFetch),
      }
      context.current = selected
    }
    let verified: CloudWorkspaceContext
    try {
      verified = await selected.promise
    } catch (failure) {
      if (context.current === selected) context.current = undefined
      throw failure
    }
    const current = useAuthStore.getState()
    if (
      continuationRevision.current !== revision ||
      !current.isAuthenticated ||
      current.sessionRevision !== auth.sessionRevision
    )
      throw new StorageClientError('stale', 409)
    const validId = (value: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(value)
    if (
      verified.clusterId !== snapshot.clusterId ||
      !validId(verified.organizationId) ||
      !validId(verified.clusterId)
    )
      throw new StorageClientError('protocol', 409)
    const next = {
      session: auth.sessionRevision,
      scope: setupOperationScope(snapshot),
      organizationId: verified.organizationId,
      clusterId: verified.clusterId,
      armed: snapshot.initializationProgress?.state === 'RUNNING',
      progress:
        snapshot.initializationProgress?.state === 'RUNNING'
          ? snapshot.initializationProgress
          : undefined,
    }
    setIntent((previous) => {
      if (previous?.session !== next.session || previous.scope !== next.scope) return next
      const armed = previous.armed || next.armed
      const progress = next.progress ?? previous.progress
      return previous.armed === armed && previous.progress === progress
        ? previous
        : { ...next, armed, progress }
    })
  }, [])
  // Dispatch retains the user's original navigation intent, never proof that the write succeeded.
  const submitted = useCallback((snapshot: StorageSnapshot) => {
    const auth = useAuthStore.getState()
    if (auth.profile !== 'cloud' || !auth.isAuthenticated) return
    setIntent((previous) =>
      previous?.session === auth.sessionRevision &&
      previous.scope === setupOperationScope(snapshot) &&
      !previous.armed
        ? { ...previous, armed: true }
        : previous,
    )
  }, [])
  const refused = useCallback((snapshot: StorageSnapshot, failure: unknown) => {
    if (
      !(failure instanceof StorageClientError) ||
      failure.status < 400 ||
      failure.status >= 500 ||
      failure.status === 401
    )
      return
    const auth = useAuthStore.getState()
    setIntent((previous) =>
      previous?.session === auth.sessionRevision &&
      previous.scope === setupOperationScope(snapshot) &&
      !previous.progress
        ? undefined
        : previous,
    )
  }, [])
  const discard = useCallback(() => {
    continuationRevision.current += 1
    selectedScope.current = ''
    setIntent(undefined)
  }, [])
  return (
    <Context.Provider value={{ intent, prepare, submitted, refused, discard }}>
      {children}
    </Context.Provider>
  )
}
