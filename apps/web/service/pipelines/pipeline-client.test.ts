import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from '../source-client'

import {
  createPipeline,
  getPipeline,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  listPipelines,
  runPipeline,
  savePipelineLayout,
  stopPipeline,
  updatePipeline,
} from './pipeline-client'

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

const status = {
  pipelineId: 'orders_to_warehouse',
  state: 'RUNNING',
} as const

const metrics = {
  pipelineId: 'orders_to_warehouse',
  metrics: { recordsProcessed: 187 },
  perTableOffset: { orders: 'mysql-bin.000001:482' },
} as const

const logs = {
  pipelineId: 'orders_to_warehouse',
  lines: [{ timestampMillis: 1_724_500_800_123, level: 'INFO', message: 'Pipeline started' }],
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
  it('creates a blank Pipeline draft with the POST mutation contract', async () => {
    const requests: Request[] = []
    const blankPipeline = {
      ...pipeline,
      dag: { nodes: [], edges: [] },
      sources: [],
      transforms: [],
      view: null,
      serve: null,
    }

    await expect(
      createPipeline(
        {
          id: pipeline.id,
          metadata: { labels: {}, description: 'draft' },
          sources: [],
          transforms: [],
          view: null,
          serve: null,
          settings: null,
          experimental: null,
        },
        fetcherFor(
          new Response(JSON.stringify(blankPipeline), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ETag: `"${pipeline.contentHash}"` },
          }),
          requests,
        ),
      ),
    ).resolves.toMatchObject({ pipeline: blankPipeline, etag: `"${pipeline.contentHash}"` })

    expect(requests[0].method).toBe('POST')
    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines')
    await expect(requests[0].json()).resolves.toMatchObject({
      id: pipeline.id,
      sources: [],
      transforms: [],
    })
  })

  it('reads the backend semantic DAG without adding canvas geometry to PipelineView', async () => {
    const requests: Request[] = []

    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [pipeline] }), requests)),
    ).resolves.toEqual([pipeline])

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines')
    expect(pipeline.dag.nodes[0]).not.toHaveProperty('position')
  })

  it('accepts failed pipeline status projections without a rendered message', async () => {
    const failedPipeline = {
      ...pipeline,
      id: 'failed_pipeline',
      status: {
        pipelineId: 'failed_pipeline',
        state: 'FAILED',
        failure: {
          code: 'engine.job-failed',
          params: { cause: 'sink refused' },
        },
      },
    } as const

    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [failedPipeline] }))),
    ).resolves.toEqual([failedPipeline])
  })

  it('accepts healthy pipeline status projections with a null failure', async () => {
    const runningPipeline = {
      ...pipeline,
      status: {
        pipelineId: pipeline.id,
        state: 'RUNNING',
        failure: null,
      },
    } as const

    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [runningPipeline] }))),
    ).resolves.toEqual([runningPipeline])
  })

  it('encodes an individual Pipeline id when loading its semantic graph', async () => {
    const requests: Request[] = []

    await expect(
      getPipeline('orders/warehouse', fetcherFor(jsonResponse(pipeline), requests)),
    ).resolves.toEqual(pipeline)

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse')
  })

  it('encodes Pipeline ids for start and stop lifecycle operations', async () => {
    const startRequests: Request[] = []
    const stopRequests: Request[] = []

    await runPipeline('orders/warehouse', fetcherFor(jsonResponse({}), startRequests))
    await stopPipeline('orders/warehouse', fetcherFor(jsonResponse({}), stopRequests))

    expect(new URL(startRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse:start')
    expect(startRequests[0].method).toBe('POST')
    expect(new URL(stopRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse:stop')
    expect(stopRequests[0].method).toBe('POST')
  })

  it('uses the conditional PUT mutation contract and surfaces server validation text', async () => {
    const requests: Request[] = []
    const mutation = {
      id: pipeline.id,
      sources: ['mysql'],
      transforms: [],
    }

    await expect(
      updatePipeline(
        pipeline.id,
        mutation,
        `"${pipeline.contentHash}"`,
        fetcherFor(
          jsonResponse(
            { code: 'pipeline.validation', params: {}, message: 'Select an existing Source.' },
            422,
          ),
          requests,
        ),
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: 'pipeline.validation',
      message: 'Select an existing Source.',
    })

    expect(requests[0].method).toBe('PUT')
    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines/orders_to_warehouse')
    expect(requests[0].headers.get('If-Match')).toBe(`"${pipeline.contentHash}"`)
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
    expect(new URL(writeRequests[0].url).pathname).toBe('/api/pipelines/orders_to_warehouse/layout')
    await expect(writeRequests[0].json()).resolves.toEqual({
      nodes: layout.nodes,
      viewport: layout.viewport,
    })
  })

  it('reads runtime observations from their independent HTTP faces', async () => {
    const statusRequests: Request[] = []
    const metricsRequests: Request[] = []
    const logRequests: Request[] = []

    await expect(
      getPipelineStatus('orders/warehouse', fetcherFor(jsonResponse(status), statusRequests)),
    ).resolves.toEqual(status)
    await expect(
      getPipelineMetrics('orders/warehouse', fetcherFor(jsonResponse(metrics), metricsRequests)),
    ).resolves.toEqual(metrics)
    await expect(
      getPipelineLogs('orders/warehouse', fetcherFor(jsonResponse(logs), logRequests)),
    ).resolves.toEqual(logs)

    expect(new URL(statusRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse/status')
    expect(new URL(metricsRequests[0].url).pathname).toBe(
      '/api/pipelines/orders%2Fwarehouse/metrics',
    )
    expect(new URL(logRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse/logs')
    expect(new URL(logRequests[0].url).searchParams.get('limit')).toBe('30')
  })

  it('rejects malformed DAG and layout responses', async () => {
    await expect(
      getPipeline(pipeline.id, fetcherFor(jsonResponse({ id: pipeline.id }))),
    ).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(
      getPipelineLayout(pipeline.id, fetcherFor(jsonResponse({ pipelineId: pipeline.id }))),
    ).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(
      getPipelineStatus(pipeline.id, fetcherFor(jsonResponse({ pipelineId: pipeline.id }))),
    ).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(
      getPipelineMetrics(pipeline.id, fetcherFor(jsonResponse({ pipelineId: pipeline.id }))),
    ).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(
      getPipelineLogs(pipeline.id, fetcherFor(jsonResponse({ pipelineId: pipeline.id }))),
    ).rejects.toMatchObject({
      kind: 'protocol',
    })
  })
})
