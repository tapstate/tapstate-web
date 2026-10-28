import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBrowserAuthSync } from '@/stores/browser-auth-sync'

import { browserAuthRequest } from './browser-auth-client'

afterEach(() => vi.useRealTimers())
describe('browser exchange liveness', () => {
  it('bounds an exchange body read so the shared lock can be released', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      return new Response(
        new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener('abort', () =>
              controller.error(new DOMException('Timed out', 'AbortError')),
            )
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    })
    const request = browserAuthRequest('session', fetcher)
    let outcome = 'pending'
    void request.then(
      () => {
        outcome = 'completed'
      },
      () => {
        outcome = 'rejected'
      },
    )
    await vi.advanceTimersByTimeAsync(16_000)
    expect(outcome).toBe('rejected')
  })
})

it.each(['login', 'logout'] as const)(
  '%s cancellation releases its cross-tab auth mutation after the deadline',
  async (action) => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The request was cancelled', 'AbortError')),
          )
        }),
    )
    let settled = false
    const pending = browserAuthRequest(
      action,
      fetcher,
      action === 'login' ? { username: 'alice', password: 'secret' } : undefined,
    ).catch(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(15_000)
    await pending
    expect(settled).toBe(true)
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  },
)

it('releases an exclusive auth lock after a stalled login so another tab can exchange', async () => {
  vi.useFakeTimers()
  type Waiter = {
    mode: 'shared' | 'exclusive'
    action: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (error: unknown) => void
  }
  const waiting: Waiter[] = []
  let readers = 0
  let writer = false
  const pump = () => {
    if (writer || readers) return
    const first = waiting.shift()
    if (!first) return
    const start = (waiter: Waiter) => {
      if (waiter.mode === 'exclusive') writer = true
      else readers++
      void waiter
        .action()
        .then(waiter.resolve, waiter.reject)
        .finally(() => {
          if (waiter.mode === 'exclusive') writer = false
          else readers--
          pump()
        })
    }
    start(first)
    if (first.mode === 'shared') {
      while (waiting[0]?.mode === 'shared') start(waiting.shift()!)
    }
  }
  const locks = {
    request: (
      _name: string,
      options: { mode?: 'shared' | 'exclusive' } | (() => Promise<unknown>),
      callback?: () => Promise<unknown>,
    ) =>
      new Promise((resolve, reject) => {
        const action = typeof options === 'function' ? options : callback!
        const mode = typeof options === 'function' ? 'exclusive' : (options.mode ?? 'exclusive')
        waiting.push({ mode, action, resolve, reject })
        pump()
      }),
  } as unknown as LockManager
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks })
  const sync = createBrowserAuthSync()
  try {
    const fetcher = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError')),
          )
        }),
    )
    const mutation = sync
      .mutate(() => browserAuthRequest('login', fetcher, { username: 'alice', password: 'secret' }))
      .then(
        () => null,
        (error: unknown) => error,
      )
    let restored = false
    const exchange = sync.read(async () => {
      restored = true
    })
    await vi.advanceTimersByTimeAsync(15_000)
    await expect(mutation).resolves.toMatchObject({ kind: 'network' })
    await expect(exchange).resolves.toBeUndefined()
    expect(restored).toBe(true)
  } finally {
    sync.close()
    if (descriptor) Object.defineProperty(navigator, 'locks', descriptor)
    else Reflect.deleteProperty(navigator, 'locks')
    vi.useRealTimers()
  }
})
