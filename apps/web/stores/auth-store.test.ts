import { describe, expect, it, vi } from 'vitest'

import { AUTH_TOKEN_KEY } from './auth-session'
import { createAuthStore } from './auth-store'

function memoryStorage(initialToken?: string): Storage {
  const values = new Map<string, string>()
  if (initialToken) values.set(AUTH_TOKEN_KEY, initialToken)
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('auth store deployment profiles', () => {
  it('ignores a late 401 from a superseded on-prem session', async () => {
    let finish!: (response: Response) => void
    const fetcher = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const store = createAuthStore({ profile: 'on-prem', storage: memoryStorage('old'), fetcher })
    const pending = store.getState().apiFetch('/api/storage/status')
    store.getState().setToken('new')
    finish(new Response(null, { status: 401 }))
    await pending
    expect(store.getState().token).toBe('new')
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it('invalidates once and waits for an explicit sign-in action on concurrent Cloud failures', async () => {
    const redirectToCloudConsole = vi.fn()
    const store = createAuthStore({
      profile: 'cloud',
      origin: 'https://cluster.test',
      fetcher: vi.fn<typeof fetch>(async () => new Response(null, { status: 401 })),
      redirectToCloudConsole,
    })
    await Promise.all([
      store.getState().apiFetch('/api/storage/status'),
      store.getState().apiFetch('/api/sources'),
    ])
    expect(redirectToCloudConsole).not.toHaveBeenCalled()
    expect(store.getState().sessionRevision).toBe(1)
  })

  it('retains identity on dependency unavailability', async () => {
    const redirectToCloudConsole = vi.fn()
    const store = createAuthStore({
      profile: 'cloud',
      origin: 'https://cluster.test',
      fetcher: vi.fn<typeof fetch>(async () => new Response(null, { status: 503 })),
      redirectToCloudConsole,
    })
    await store.getState().apiFetch('/api/storage/status')
    expect(store.getState().isAuthenticated).toBe(true)
    expect(redirectToCloudConsole).not.toHaveBeenCalled()
  })
  it('keeps the existing on-prem token lifecycle', () => {
    const storage = memoryStorage('stored-token')
    const store = createAuthStore({ profile: 'on-prem', storage })

    expect(store.getState().token).toBe('stored-token')
    expect(store.getState().isAuthenticated).toBe(true)

    store.getState().clear()
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('does not read or write browser bearer storage in cloud mode', () => {
    const storage = memoryStorage('stale-on-prem-token')
    const store = createAuthStore({ profile: 'cloud', storage })

    expect(store.getState().token).toBeNull()
    expect(store.getState().isAuthenticated).toBe(true)

    store.getState().setToken('must-not-be-persisted')
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('stale-on-prem-token')
    expect(store.getState().token).toBeNull()
  })

  it('marks the cloud session unauthenticated after the first 401 without reloading', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 401 }))
    const redirectToCloudConsole = vi.fn()
    const store = createAuthStore({
      profile: 'cloud',
      storage: memoryStorage('stale-on-prem-token'),
      fetcher,
      origin: 'https://cluster-a.dev.cloud.tapstate.com',
      cloudConsoleUrl: 'https://dev.cloud.tapstate.com/',
      redirectToCloudConsole,
    })

    await store.getState().apiFetch('/api/sources')

    expect(store.getState().isAuthenticated).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(redirectToCloudConsole).not.toHaveBeenCalled()
  })

  it('logs out of the Cluster and Cloud sessions without activating the route guard', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    const redirectToCloudConsole = vi.fn()
    const store = createAuthStore({
      profile: 'cloud',
      fetcher,
      origin: 'https://cluster-a.dev.cloud.tapstate.com',
      cloudConsoleUrl: 'https://dev.cloud.tapstate.com/',
      redirectToCloudConsole,
    })

    await store.getState().logout()

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe('/auth/logout')
    expect(fetcher.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ credentials: 'same-origin', method: 'POST' }),
    )
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      'https://dev.cloud.tapstate.com/v1/api/auth/logout',
    )
    expect(fetcher.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
    expect(store.getState().isAuthenticated).toBe(true)
    expect(redirectToCloudConsole).not.toHaveBeenCalled()
  })
})
