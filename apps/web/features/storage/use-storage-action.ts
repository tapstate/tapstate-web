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
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function run<T>(work: () => Promise<T>, accept: (value: T) => void | Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    const started = current.current
    try {
      const value = await work()
      if (
        mounted.current &&
        current.current === started &&
        useAuthStore.getState().sessionRevision === session
      )
        await accept(value)
    } catch (failure) {
      if (
        mounted.current &&
        current.current === started &&
        useAuthStore.getState().sessionRevision === session
      )
        setError(failure)
    } finally {
      pending.current = false
      if (mounted.current && current.current === started) setBusy(false)
    }
  }
  return { busy, error, run, reset: () => setError(null) }
}
