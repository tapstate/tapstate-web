import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from './source-client'

import { getPipeline, getPipelineLayout, listPipelines, savePipelineLayout } from './pipeline-client'

const pipeline = {
  id: 'orders_to_warehouse',
  dag: {
    nodes: [
      { id: 'source:orders', type: 'source', label: 'orders', detail: 'mysql' },
      { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
    ],
    edges: [
      {
        id: 'source:orders->transform:normalize',
        source: 'source:orders',
        target: 'transform:normalize',
        label: null,
      },
    ],
  },
  contentHash: 'a'.repeat(64),
} as const

const layout = {
  pipelineId: 'orders_to_warehouse',
  nodes: { 'source:orders': { x: 64, y: 80 } },
  viewport: { x: 0, y: 0, zoom: 1 },
} as const

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fetcherFor(response: Response, seen: Request[] = []): ApiFetcher {
  return async (input, init) => {
    seen.push(new Request(typeof input === 'string' ? `http://test${input}` : input, init))
    return response
  }
}

describe('Pipeline client', () => {
  it('reads the backend semantic DAG without adding canvas geometry to PipelineView', async () => {
    const requests: Request[] = []

    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [pipeline] }), requests)),
    ).resolves.toEqual([pipeline])

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines')
    expect(pipeline.dag.nodes[0]).not.toHaveProperty('position')
  })

  it('encodes an individual Pipeline id when loading its semantic graph', async () => {
    const requests: Request[] = []

    await expect(
      getPipeline('orders/warehouse', fetcherFor(jsonResponse(pipeline), requests)),
    ).resolves.toEqual(pipeline)

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse')
  })

  it('loads and saves independent canvas layout through the layout endpoint', async () => {
    const readRequests: Request[] = []
    await expect(
      getPipelineLayout('orders_to_warehouse', fetcherFor(jsonResponse(layout), readRequests)),
    ).resolves.toEqual(layout)
    expect(new URL(readRequests[0].url).pathname).toBe('/api/pipelines/orders_to_warehouse/layout')

    const writeRequests: Request[] = []
    await expect(
      savePipelineLayout(
        'orders_to_warehouse',
        { nodes: layout.nodes, viewport: layout.viewport },
        fetcherFor(jsonResponse(layout), writeRequests),
      ),
    ).resolves.toEqual(layout)

    expect(writeRequests[0].method).toBe('PUT')
    expect(new URL(writeRequests[0].url).pathname).toBe(
      '/api/pipelines/orders_to_warehouse/layout',
    )
    await expect(writeRequests[0].json()).resolves.toEqual({
      nodes: layout.nodes,
      viewport: layout.viewport,
    })
  })

  it('rejects malformed DAG and layout responses', async () => {
    await expect(getPipeline(pipeline.id, fetcherFor(jsonResponse({ id: pipeline.id })))).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(getPipelineLayout(pipeline.id, fetcherFor(jsonResponse({ pipelineId: pipeline.id })))).rejects.toMatchObject({
      kind: 'protocol',
    })
  })
})
