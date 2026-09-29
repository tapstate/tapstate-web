import { describe, expect, it, vi } from 'vitest'

import { listViews, ViewClientError } from './view-client'

const view = {
  id: 'orders-360',
  kind: 'view',
  location: { storeId: 'views', database: 'tapstate', collection: 'orders_360' },
  pipelineId: 'orders-pipeline',
  status: { state: 'fresh', behindSeconds: 3 },
  documents: 1200,
  sizeBytes: 2048,
  lastAppliedAt: 1_700_000_000_000,
}

function respond(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

describe('listViews', () => {
  it('reads the view list', async () => {
    const fetcher = respond({ items: [view] })

    await expect(listViews(fetcher)).resolves.toEqual({ available: true, views: [view] })
    expect(fetcher).toHaveBeenCalledWith('/api/views')
  })

  it('reports a server without the read as not available rather than failing', async () => {
    await expect(listViews(respond({ code: 'not-found' }, 404))).resolves.toEqual({
      available: false,
    })
    await expect(listViews(respond({}, 405))).resolves.toEqual({ available: false })
  })

  it('fails on a refused request or a malformed list', async () => {
    await expect(listViews(respond({}, 500))).rejects.toBeInstanceOf(ViewClientError)
    await expect(
      listViews(respond({ items: [{ ...view, kind: 'table' }] })),
    ).rejects.toBeInstanceOf(ViewClientError)
    await expect(
      listViews(respond({ items: [{ ...view, status: { state: 'fresh' } }] })),
    ).rejects.toBeInstanceOf(ViewClientError)
  })
})
