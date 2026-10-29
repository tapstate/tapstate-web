import { describe, expect, it, vi } from 'vitest'

import { validationSessionFetcher } from './validation-session-fetcher'

describe('validation auth cohort', () => {
  it('rejects an old response and sends no save under the successor session', async () => {
    let revision = 1,
      complete!: (value: Response) => void
    const wire = vi.fn(
        async () =>
          new Promise<Response>((resolve) => {
            complete = resolve
          }),
      ),
      fetcher = validationSessionFetcher(wire, revision, () => revision)
    const chain = fetcher('/api/validation:evaluate').then(() =>
      fetcher('/api/validation:save', { method: 'POST' }),
    )
    revision = 2
    complete(new Response('{}'))
    await expect(chain).rejects.toMatchObject({ name: 'AbortError' })
    expect(wire).toHaveBeenCalledTimes(1)
  })
  it('guards a follow-up mutation even if the earlier read completed before the session switched', async () => {
    let revision = 1
    const wire = vi.fn(async () => new Response('{}')),
      fetcher = validationSessionFetcher(wire, revision, () => revision)
    await fetcher('/api/validation:evaluate')
    revision = 2
    await expect(fetcher('/api/validation:start', { method: 'POST' })).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(wire).toHaveBeenCalledTimes(1)
  })
})
