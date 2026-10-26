import { useEffect, useRef, useState } from 'react'

import { snapshotScope } from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

import { useStorage } from './storage-context'

/** A write is never retried or cancelled as if that rolled back its server effects. */
export function useStorageAction() {
  const { snapshot, session } = useStorage()
  const identity = `${session}:${snapshot ? snapshotScope(snapshot) : ''}`
  const current = useRef(identity)
  current.current = identity
  const mounted = useRef(true)
  const pending = useRef<{ identity: string } | null>(null)
  const [state, setState] = useState<{ identity: string; busy: boolean; error: unknown }>({
    identity,
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
    if (pending.current?.identity === started) return
    const attempt = { identity: started }
    pending.current = attempt
    setState({ identity: started, busy: true, error: null })
    const isCurrent = () =>
      mounted.current &&
      current.current === started &&
      useAuthStore.getState().sessionRevision === session
    try {
      const value = await work(isCurrent)
      if (isCurrent()) await accept(value)
    } catch (failure) {
      if (isCurrent()) {
        setState({ identity: started, busy: true, error: failure })
        reject?.(failure)
      }
    } finally {
      if (pending.current === attempt) pending.current = null
      if (mounted.current && current.current === started)
        setState((value) => (value.identity === started ? { ...value, busy: false } : value))
    }
  }
  return {
    busy: state.identity === identity && state.busy,
    error: state.identity === identity ? state.error : null,
    run,
    reset: () =>
      setState((value) => (value.identity === identity ? { ...value, error: null } : value)),
  }
}
