import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from '../source-client'

import {
  createPipeline,
  createPipelineDraft,
  deletePipelineDraft,
  getPipeline,
  getPipelineDraft,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  listPipelines,
  listPipelineDrafts,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  savePipelineLayout,
  stopPipeline,
  updatePipelineDraft,
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

const catalogItem = {
  id: 'orders_to_warehouse',
  name: 'Orders to warehouse',
  description: 'Stream orders into analytics',
  mode: 'wizard',
  revision: 3,
  updatedAt: '2026-09-21T00:01:00Z',
  contentHash: null,
  hasArtifact: false,
  status: {
    state: 'NEW',
    desiredState: null,
    observedState: null,
    failure: null,
    observedAt: null,
  },
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

const draft = {
  pipelineId: 'orders_to_warehouse',
  schemaVersion: 1,
  revision: 3,
  mode: 'dag',
  name: 'Orders to warehouse',
  description: 'Draft pipeline',
  graph: {
    nodes: [
      {
        id: 'source:orders',
        type: 'source',
        sourceId: 'mysql',
        table: 'orders',
        config: { tables: ['orders'] },
        metadata: { label: 'orders' },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  wizard: null,
  baseArtifactHash: null,
  publishedDraftRevision: null,
  publishedArtifactHash: null,
  createdAt: '2026-09-21T00:00:00Z',
  updatedAt: '2026-09-21T00:01:00Z',
  updatedBy: 'user@example.com',
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

  it('reads the merged Pipeline catalog projection from the single list endpoint', async () => {
    const requests: Request[] = []

    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [catalogItem] }), requests)),
    ).resolves.toEqual([catalogItem])

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines')
    expect(catalogItem).not.toHaveProperty('dag')
    expect(catalogItem.hasArtifact).toBe(false)
  })

  it('uses revision ETags for the durable draft contract', async () => {
    const listRequests: Request[] = []
    const { schemaVersion: _schemaVersion, graph: _graph, wizard: _wizard, ...summary } = draft
    await expect(
      listPipelineDrafts(fetcherFor(jsonResponse({ items: [summary] }), listRequests)),
    ).resolves.toEqual([summary])
    expect(new URL(listRequests[0]!.url).pathname).toBe('/api/pipeline-drafts')

    const getRequests: Request[] = []
    await expect(
      getPipelineDraft(
        draft.pipelineId,
        fetcherFor(
          new Response(JSON.stringify(draft), {
            headers: { 'Content-Type': 'application/json', ETag: '"3"' },
          }),
          getRequests,
        ),
      ),
    ).resolves.toEqual({ draft, etag: '"3"' })
    expect(getRequests[0]!.headers.get('If-Match')).toBeNull()

    const mutation = {
      pipelineId: draft.pipelineId,
      mode: 'dag' as const,
      name: draft.name,
      description: draft.description,
      graph: draft.graph,
      wizard: null,
      baseArtifactHash: null,
    }
    const createRequests: Request[] = []
    await expect(
      createPipelineDraft(
        draft.pipelineId,
        mutation,
        fetcherFor(
          new Response(JSON.stringify(draft), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ETag: '"1"' },
          }),
          createRequests,
        ),
      ),
    ).resolves.toEqual({ draft, etag: '"1"' })
    expect(createRequests[0]!.method).toBe('POST')
    expect(new URL(createRequests[0]!.url).pathname).toBe(
      '/api/pipelines/orders_to_warehouse/draft',
    )
    await expect(createRequests[0]!.json()).resolves.toMatchObject({
      pipelineId: draft.pipelineId,
      mode: 'dag',
      graph: draft.graph,
    })

    const updateRequests: Request[] = []
    await expect(
      updatePipelineDraft(
        draft.pipelineId,
        mutation,
        '"2"',
        fetcherFor(
          new Response(JSON.stringify({ ...draft, revision: 4 }), {
            headers: { 'Content-Type': 'application/json', ETag: '"4"' },
          }),
          updateRequests,
        ),
      ),
    ).resolves.toMatchObject({ etag: '"4"', draft: { revision: 4 } })
    expect(updateRequests[0]!.method).toBe('PUT')
    expect(updateRequests[0]!.headers.get('If-Match')).toBe('"2"')

    const deleteRequests: Request[] = []
    await expect(
      deletePipelineDraft(
        draft.pipelineId,
        '"4"',
        fetcherFor(new Response(null, { status: 204 }), deleteRequests),
      ),
    ).resolves.toBeUndefined()
    expect(deleteRequests[0]!.method).toBe('DELETE')
    expect(deleteRequests[0]!.headers.get('If-Match')).toBe('"4"')
  })

  it('publishes and previews an explicit draft revision', async () => {
    const previewRequests: Request[] = []
    await expect(
      previewPipelineDraft(
        draft.pipelineId,
        draft.revision,
        fetcherFor(
          jsonResponse({ pipelineId: draft.pipelineId, revision: draft.revision, artifact: {} }),
          previewRequests,
        ),
      ),
    ).resolves.toEqual({ pipelineId: draft.pipelineId, revision: draft.revision, artifact: {} })
    expect(new URL(previewRequests[0]!.url).pathname).toBe(
      '/api/pipelines/orders_to_warehouse/draft:preview',
    )
    await expect(previewRequests[0]!.json()).resolves.toEqual({ revision: draft.revision })

    const publishRequests: Request[] = []
    await expect(
      publishPipelineDraft(
        draft.pipelineId,
        draft.revision,
        'b'.repeat(64),
        fetcherFor(
          jsonResponse({
            pipelineId: draft.pipelineId,
            revision: draft.revision,
            artifactHash: 'c'.repeat(64),
            published: true,
          }),
          publishRequests,
        ),
      ),
    ).resolves.toEqual({
      pipelineId: draft.pipelineId,
      revision: draft.revision,
      artifactHash: 'c'.repeat(64),
      published: true,
    })
    await expect(publishRequests[0]!.json()).resolves.toEqual({
      revision: draft.revision,
      artifactHash: 'b'.repeat(64),
    })
  })

  it('accepts transitional and failed states in the Pipeline catalog', async () => {
    const items = [
      {
        ...catalogItem,
        hasArtifact: true,
        contentHash: 'a'.repeat(64),
        status: {
          state: 'STARTING',
          desiredState: 'RUNNING',
          observedState: 'STOPPED',
          failure: null,
          observedAt: '2026-09-21T00:01:00Z',
        },
      },
      {
        ...catalogItem,
        id: 'failed_pipeline',
        name: 'Failed pipeline',
        status: {
          state: 'FAILED',
          desiredState: 'RUNNING',
          observedState: 'FAILED',
          failure: { code: 'engine.job-failed', params: { cause: 'sink refused' } },
          observedAt: '2026-09-21T00:01:00Z',
        },
      },
    ] as const

    await expect(listPipelines(fetcherFor(jsonResponse({ items })))).resolves.toEqual(items)
  })

  it('rejects artifact detail objects from the catalog endpoint', async () => {
    await expect(
      listPipelines(fetcherFor(jsonResponse({ items: [pipeline] }))),
    ).rejects.toMatchObject({ kind: 'protocol' })
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
    const purgeRequests: Request[] = []

    await runPipeline('orders/warehouse', fetcherFor(jsonResponse({}), startRequests))
    await stopPipeline('orders/warehouse', false, fetcherFor(jsonResponse({}), stopRequests))
    await stopPipeline('orders/warehouse', true, fetcherFor(jsonResponse({}), purgeRequests))

    expect(new URL(startRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse:start')
    expect(startRequests[0].method).toBe('POST')
    expect(new URL(stopRequests[0].url).pathname).toBe('/api/pipelines/orders%2Fwarehouse:stop')
    expect(stopRequests[0].method).toBe('POST')
    expect(await stopRequests[0].clone().json()).toEqual({ purgeState: false })
    expect(await purgeRequests[0].clone().json()).toEqual({ purgeState: true })
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
