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
  it('checks measurement units, ages and timestamps before presenting them as evidence', async () => {
    const status = {
      state: 'fresh',
      behindSeconds: 3,
      unit: 's',
      eventAgeSeconds: 3,
      observationAgeSeconds: 1,
      observedAt: '2026-10-29T00:00:00Z',
      refreshedAt: '2026-10-29T00:00:01Z',
      aggregation: 'max-input-table-event-age',
    }
    await expect(listViews(respond({ items: [{ ...view, status }] }))).resolves.toMatchObject({
      available: true,
    })
    for (const invalid of [{ unit: 'ms' }, { eventAgeSeconds: -1 }, { observedAt: 'yesterday' }]) {
      await expect(
        listViews(respond({ items: [{ ...view, status: { ...status, ...invalid } }] })),
      ).rejects.toBeInstanceOf(ViewClientError)
    }
  })
})

it('preserves output diagnostics returned alongside resolved views', async () => {
  const unresolved = [
    {
      pipelineId: 'orders',
      code: 'actuation.source-schema-not-discovered',
      params: { source: 'source' },
    },
  ]
  const fetcher = async () =>
    new Response(JSON.stringify({ items: [], unresolved }), { status: 200 })
  await expect(listViews(fetcher)).resolves.toEqual({ available: true, views: [], unresolved })
})

it('rejects malformed output diagnostics rather than silently hiding them', async () => {
  const fetcher = async () =>
    new Response(JSON.stringify({ items: [], unresolved: [{ pipelineId: 'orders' }] }), {
      status: 200,
    })
  await expect(listViews(fetcher)).rejects.toThrow('malformed')
})
