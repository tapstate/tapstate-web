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
  it('keeps a newer login when an older request returns 401', async () => {
    let finish!: (response: Response) => void
    const store = createAuthStore({
      profile: 'on-prem',
      storage: null,
      fetcher: (() =>
        new Promise<Response>((resolve) => {
          finish = resolve
        })) as typeof fetch,
    })
    store.setState({ token: 'old-access', isAuthenticated: true, status: 'authenticated' })
    const pending = store.getState().apiFetch('/api/sources')
    store.setState({ token: 'new-access', isAuthenticated: true, authEpoch: 1 })
    finish(new Response(JSON.stringify({ code: 'control.unauthenticated' }), { status: 401 }))
    await pending.catch(() => undefined)
    expect(store.getState().token).toBe('new-access')
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it('keeps the workbench session after an AI provider refuses its own credentials', async () => {
    const store = createAuthStore({
      profile: 'on-prem',
      storage: null,
      fetcher: vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 'control.ai-provider-auth-failed' }), {
            status: 401,
          }),
      ),
    })
    store.setState({ token: 'workbench-access', isAuthenticated: true, status: 'authenticated' })
    await store.getState().apiFetch('/api/ai-provider-settings:check')
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it('removes the legacy on-prem bearer instead of persisting it', () => {
    const storage = memoryStorage('stored-token')
    const store = createAuthStore({ profile: 'on-prem', storage })

    expect(store.getState().token).toBeNull()
    expect(store.getState().status).toBe('checking')
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBeNull()

    store.getState().clear()
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('does not read or write browser bearer storage in cloud mode', () => {
    const storage = memoryStorage('stale-on-prem-token')
    const store = createAuthStore({ profile: 'cloud', storage })

    expect(store.getState().token).toBeNull()
    expect(store.getState().isAuthenticated).toBe(true)

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
    expect(redirectToCloudConsole).toHaveBeenCalledOnce()
    expect(redirectToCloudConsole).toHaveBeenCalledWith('https://dev.cloud.tapstate.com/')
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

function testSync() {
  let revision = ''
  const listeners = new Set<() => void>()
  return {
    revision: () => revision,
    read: <T>(action: () => Promise<T>) => action(),
    mutate: async <T>(action: () => Promise<T>) => {
      const value = await action()
      revision += 'x'
      return { value, revision }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    close: () => undefined,
  }
}
const access = (principal = 'alice', sessionId = 'session-a', token = 'access-a') => ({
  token,
  principal,
  sessionId,
  issuer: 'issuer-a',
  scopes: ['admin'],
  accessExpiresAt: new Date(Date.now() + 900_000).toISOString(),
})

describe('on-prem browser session recovery', () => {
  it('restores a new tab and refreshes expired access without persisting credentials', async () => {
    const storage = memoryStorage('legacy')
    const sync = testSync()
    let exchanges = 0
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === '/auth/browser/session') {
        exchanges++
        return Response.json(access('alice', 'session-a', `access-${exchanges}`))
      }
      return Response.json({ ok: true })
    })
    const store = createAuthStore({ profile: 'on-prem', storage, fetcher, sync })
    await store.getState().restore()
    expect(store.getState().principal).toBe('alice')
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    store.setState({ accessExpiresAt: 1 })
    await store.getState().apiFetch('/api/sources')
    expect(exchanges).toBe(2)
    expect(new Headers(fetcher.mock.calls.at(-1)?.[1]?.headers).get('Authorization')).toBe(
      'Bearer access-2',
    )
  })

  it('shares one exchange across concurrent requests in the same tab', async () => {
    let finish!: (response: Response) => void
    let exchanges = 0
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === '/auth/browser/session') {
        exchanges++
        return new Promise((resolve) => {
          finish = resolve
        })
      }
      return Response.json({ ok: true })
    })
    const store = createAuthStore({ profile: 'on-prem', storage: null, fetcher, sync: testSync() })
    const first = store.getState().apiFetch('/api/sources')
    const second = store.getState().apiFetch('/api/pipelines')
    finish(Response.json(access()))
    await Promise.all([first, second])
    expect(exchanges).toBe(1)
  })

  it('never replays an account A operation using account B access', async () => {
    let reads = 0
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === '/auth/browser/session')
        return Response.json(++reads === 1 ? access() : access('bob', 'session-b', 'access-b'))
      return Response.json({ code: 'control.unauthenticated' }, { status: 401 })
    })
    const store = createAuthStore({ profile: 'on-prem', storage: null, fetcher, sync: testSync() })
    await store.getState().restore()
    await expect(
      store.getState().apiFetch('/api/sources', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher.mock.calls.filter(([input]) => String(input) === '/api/sources')).toHaveLength(1)
  })

  it('keeps transient exchange failures recoverable and handles authoritative revoke', async () => {
    let response = Response.json(access())
    const fetcher = vi.fn<typeof fetch>(async () => response.clone())
    const store = createAuthStore({ profile: 'on-prem', storage: null, fetcher, sync: testSync() })
    await store.getState().restore()
    response = new Response(null, { status: 503 })
    await expect(store.getState().restore()).rejects.toBeDefined()
    expect(store.getState().status).toBe('unavailable')
    expect(store.getState().token).toBe('access-a')
    response = Response.json({ code: 'control.unauthenticated' }, { status: 401 })
    await expect(store.getState().restore()).rejects.toBeDefined()
    expect(store.getState().status).toBe('anonymous')
    expect(store.getState().token).toBeNull()
  })

  it('ignores an exchange completing after logout', async () => {
    let finish!: (response: Response) => void
    const fetcher = vi.fn<typeof fetch>(async (input) =>
      String(input) === '/auth/browser/logout'
        ? new Response(null, { status: 204 })
        : new Promise((resolve) => {
            finish = resolve
          }),
    )
    const store = createAuthStore({ profile: 'on-prem', storage: null, fetcher, sync: testSync() })
    const restoring = store.getState().restore()
    await store.getState().logout()
    finish(Response.json(access()))
    await expect(restoring).rejects.toMatchObject({ name: 'AbortError' })
    expect(store.getState().status).toBe('anonymous')
  })
})

describe('OP transport credential scope', () => {
  it('does not send a workbench bearer to another origin', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }))
    const store = createAuthStore({
      profile: 'on-prem',
      storage: null,
      origin: 'https://workbench.example',
      fetcher,
    })
    store.setState({ token: 'workbench-secret', isAuthenticated: true })
    await expect(
      store.getState().apiFetch('https://other.example/api/sources'),
    ).rejects.toBeDefined()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
