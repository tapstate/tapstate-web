import { useEffect, useRef, useState } from 'react'

import { setupOperationScope, snapshotScope, StorageClientError } from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

import { useStorage } from './storage-context'

/** A write is never retried or cancelled as if that rolled back its server effects. */
export function useStorageAction(scope: 'storage' | 'setup' = 'storage') {
  const { snapshot, session, authorityRevision = 0, error: queryError } = useStorage()
  const lastSetupScope = useRef('')
  if (snapshot) lastSetupScope.current = setupOperationScope(snapshot)
  const temporaryReadFailure =
    queryError instanceof TypeError ||
    (queryError instanceof StorageClientError && queryError.status >= 500)
  const selectedScope = snapshot
    ? scope === 'setup'
      ? setupOperationScope(snapshot)
      : snapshotScope(snapshot)
    : scope === 'setup' && temporaryReadFailure
      ? lastSetupScope.current
      : ''
  const identity = `${session}:${authorityRevision}:${selectedScope}`
  const current = useRef(identity)
  const revision = useRef(0)
  if (current.current !== identity) revision.current += 1
  current.current = identity
  const mounted = useRef(true)
  const pending = useRef<{ identity: string; revision: number } | null>(null)
  const [state, setState] = useState<{
    identity: string
    revision: number
    busy: boolean
    error: unknown
  }>({
    identity,
    revision: revision.current,
    busy: false,
    error: null,
  })
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function run<T>(
    work: (isCurrent: () => boolean) => Promise<T>,
    accept: (value: T) => void | Promise<void>,
    reject?: (failure: unknown) => void,
  ) {
    const started = current.current
    const startedRevision = revision.current
    if (pending.current?.identity === started && pending.current.revision === startedRevision)
      return
    const attempt = { identity: started, revision: startedRevision }
    pending.current = attempt
    setState({ ...attempt, busy: true, error: null })
    const isCurrent = () =>
      mounted.current &&
      current.current === started &&
      revision.current === startedRevision &&
      useAuthStore.getState().sessionRevision === session
    try {
      const value = await work(isCurrent)
      if (isCurrent()) await accept(value)
    } catch (failure) {
      if (isCurrent()) {
        setState({ ...attempt, busy: true, error: failure })
        reject?.(failure)
      }
    } finally {
      if (pending.current === attempt) pending.current = null
      if (mounted.current && current.current === started && revision.current === startedRevision)
        setState((value) =>
          value.revision === startedRevision ? { ...value, busy: false } : value,
        )
    }
  }
  return {
    busy: state.identity === identity && state.revision === revision.current && state.busy,
    error: state.identity === identity && state.revision === revision.current ? state.error : null,
    run,
    reset: () =>
      setState((value) =>
        value.identity === identity && value.revision === revision.current
          ? { ...value, error: null }
          : value,
      ),
  }
}
