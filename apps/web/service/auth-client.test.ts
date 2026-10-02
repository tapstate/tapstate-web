import { describe, expect, it, vi } from 'vitest'

import { authenticatedFetch, cloudSessionFetch } from './auth-client'

describe('authentication transport', () => {
  it('uses the on-prem bearer token without changing its existing request shape', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))

    await authenticatedFetch('/api/sources', {}, 'token-123', fetcher)

    const init = fetcher.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-123')
    expect(init?.credentials).toBeUndefined()
  })

  it('uses only the current Cluster origin and strips bearer credentials in cloud mode', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))

    await cloudSessionFetch(
      '/api/sources',
      { headers: { Authorization: 'Bearer must-not-leak' } },
      fetcher,
      'https://cluster-a.dev.cloud.tapstate.com',
    )

    const init = fetcher.mock.calls[0]?.[1]
    expect(init?.credentials).toBe('same-origin')
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })

  it('rejects a cloud API request aimed at another origin', async () => {
    const fetcher = vi.fn<typeof fetch>()

    await expect(
      cloudSessionFetch(
        'https://cluster-b.dev.cloud.tapstate.com/api/sources',
        {},
        fetcher,
        'https://cluster-a.dev.cloud.tapstate.com',
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
