import { expect, it, vi } from 'vitest'

import { createAuthStore } from '@/stores/auth-store'

import { getCurrentUser } from './current-user-client'

it('returns the separate authenticated username and email', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        mode: 'cloud',
        principal: 'cloud-user-id',
        username: null,
        email: 'alice@example.com',
        scopes: ['read'],
      }),
      { status: 200 },
    ),
  )
  const user = await getCurrentUser(fetcher)
  expect(user).toMatchObject({ username: null, email: 'alice@example.com' })
  expect(fetcher).toHaveBeenCalledWith('/api/auth/me', { cache: 'no-store' })
})

it('reads the Cloud identity through the authenticated Cluster API with the session cookie', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (input !== '/api/auth/me' || init?.credentials !== 'same-origin') {
      return new Response(null, { status: 404 })
    }
    return new Response(
      JSON.stringify({
        mode: 'cloud',
        principal: 'user-id',
        username: null,
        email: 'alice@example.com',
        scopes: ['read'],
      }),
    )
  })
  const store = createAuthStore({ profile: 'cloud', fetcher, origin: 'https://cluster.example' })
  await expect(getCurrentUser(store.getState().apiFetch)).resolves.toMatchObject({
    email: 'alice@example.com',
  })
})

it('accepts an older server response without profile fields', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ mode: 'on-prem', principal: 'operator', scopes: ['read'] })),
    )
  await expect(getCurrentUser(fetcher)).resolves.toMatchObject({
    principal: 'operator',
    username: null,
    email: null,
  })
})
