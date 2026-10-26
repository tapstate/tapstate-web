import { afterEach, describe, expect, it, vi } from 'vitest'

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
