import { expect, it, vi } from 'vitest'

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
  expect(fetcher).toHaveBeenCalledWith('/auth/me', { cache: 'no-store' })
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
