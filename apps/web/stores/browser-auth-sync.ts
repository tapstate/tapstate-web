import { AuthClientError } from '@/service/auth-client'

export interface BrowserAuthSync {
  revision: () => string
  read: <T>(action: () => Promise<T>) => Promise<T>
  mutate: <T>(action: () => Promise<T>) => Promise<{ value: T; revision: string }>
  subscribe: (listener: () => void) => () => void
  close: () => void
}

const REVISION_KEY = 'tapstate.op.auth.revision'
const LOCK_NAME = 'tapstate.op.auth'

/** Only non-secret transition notifications are shared; the server establishes identity. */
export function createBrowserAuthSync(): BrowserAuthSync {
  const listeners = new Set<() => void>()
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(LOCK_NAME)
  const revision = () => window.localStorage.getItem(REVISION_KEY) ?? ''
  const notify = () => listeners.forEach((listener) => listener())
  const storage = (event: StorageEvent) => {
    if (event.key === REVISION_KEY) notify()
  }
  const publish = () => {
    const value = crypto.randomUUID()
    window.localStorage.setItem(REVISION_KEY, value)
    channel?.postMessage({ type: 'changed' })
    return value
  }
  const locks = () => {
    if (!navigator.locks)
      throw new AuthClientError(
        'browser',
        'This browser requires Web Locks for secure session changes.',
      )
    return navigator.locks
  }
  channel?.addEventListener('message', notify)
  window.addEventListener('storage', storage)
  return {
    revision,
    read: (action) => locks().request(LOCK_NAME, { mode: 'shared' }, action),
    mutate: (action) =>
      locks().request(LOCK_NAME, async () => {
        publish()
        let value
        try {
          value = await action()
        } finally {
          publish()
        }
        return { value, revision: revision() }
      }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    close: () => {
      channel?.close()
      window.removeEventListener('storage', storage)
      listeners.clear()
    },
  }
}
