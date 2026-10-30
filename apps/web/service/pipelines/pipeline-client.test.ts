import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from '../source-client'

import {
  createPipeline,
  createPipelineDraft,
  deletePipeline,
  deletePipelineDraft,
  getPipeline,
  getPipelineDraft,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  getStartChecks,
  listPipelines,
  listPipelineDrafts,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  savePipelineLayout,
  streamPipelinePreview,
  stopPipeline,
  updatePipelineDraft,
  updatePipeline,
  type StartCheckReport,
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

const startChecks: StartCheckReport = {
  pipelineId: 'orders_to_warehouse',
  intent: 'START',
  contentHash: 'f'.repeat(64),
  evaluatedAt: '2026-10-02T08:15:02.120Z',
  outcome: 'NEEDS_CONFIRMATION',
  plan: [
    {
      element: 'orders',
      target: { connection: 'warehouse', table: 'orders' },
      load: 'FULL_LOAD',
      onFullLoad: 'append',
    },
  ],
  findings: [
    {
      key: 'target-not-empty/warehouse/orders',
      check: 'target-not-empty',
      subject: { kind: 'TARGET', id: 'warehouse/orders', element: 'orders', label: 'orders' },
      behavior: 'CONFIRM',
      evaluation: 'COMPLETE',
      code: 'start-check.target-not-empty',
      params: { rows: 12 },
      message: 'orders on warehouse already holds 12 rows.',
      actions: [
        {
          id: 'clear',
          kind: 'CHANGE_DEFINITION',
          destructive: true,
          code: 'start-check.clear-before-full-load',
          message: 'Clear orders before the full load',
          changes: [{ element: 'orders', field: 'on_full_load', from: 'append', to: 'clear' }],
        },
        {
          id: 'keep',
          kind: 'ACKNOWLEDGE',
          destructive: false,
          code: 'start-check.keep-existing-rows',
          message: 'Keep the rows',
          changes: [],
        },
      ],
    },
  ],
}

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

  it('projects required recovery without inventing an observed execution state', async () => {
    const item = {
      ...catalogItem,
      status: {
        ...catalogItem.status,
        state: 'UNAVAILABLE',
        displayState: 'RECOVERY_REQUIRED',
        desiredState: 'STOPPED',
      },
    }

    await expect(listPipelines(fetcherFor(jsonResponse({ items: [item] })))).resolves.toEqual([
      { ...item, status: { ...item.status, state: 'RECOVERY_REQUIRED' } },
    ])
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

  it('deletes the whole Pipeline with both version conditions and preserves coded refusals', async () => {
    const requests: Request[] = []
    await expect(
      deletePipeline(
        'orders/warehouse',
        pipeline.contentHash,
        4,
        fetcherFor(new Response(null, { status: 204 }), requests),
      ),
    ).resolves.toBeUndefined()
    expect(new URL(requests[0]!.url).pathname).toBe('/api/pipelines/orders%2Fwarehouse')
    expect(requests[0]!.headers.get('If-Match')).toBe(`"${pipeline.contentHash}"`)
    expect(requests[0]!.headers.get('If-Draft-Match')).toBe('"4"')
    await expect(
      deletePipeline(
        'p2',
        pipeline.contentHash,
        null,
        fetcherFor(
          jsonResponse(
            {
              code: 'artifact.pipeline-not-stopped',
              params: { actual: 'FAILED', desired: 'RUNNING' },
              message: 'Pipeline cannot be deleted.',
            },
            409,
          ),
        ),
      ),
    ).rejects.toMatchObject({
      code: 'artifact.pipeline-not-stopped',
      status: 409,
      params: { actual: 'FAILED', desired: 'RUNNING' },
    })
  })

  it('asserts draft absence explicitly when deleting an artifact-only Pipeline', async () => {
    const requests: Request[] = []
    await deletePipeline(
      'artifact_only',
      pipeline.contentHash,
      null,
      fetcherFor(new Response(null, { status: 204 }), requests),
    )
    expect(requests[0]!.headers.get('If-Draft-Match')).toBe('"none"')
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

  it('retains an identity refusal before sampling and rejects unknown identity states', async () => {
    for (const status of ['action-required', 'unknown-status']) {
      const events = [
        { kind: 'run.accepted', payload: { pipelineId: 'orders' } },
        { kind: 'compile.completed', payload: { executionSpec: {}, contexts: [] } },
        {
          kind: 'identity.completed',
          payload: {
            targets: [
              {
                element: 'out',
                connection: 'target',
                table: 'orders',
                stream: 'orders',
                status,
                reason: 'field-collision',
                sourceField: '_id',
                preservedField: '_unwind_source_id',
                writeKey: ['_unwind_source_id', 'TAG_NO'],
                generatedFields: [],
              },
            ],
          },
        },
        {
          kind: 'run.failed',
          payload: { code: 'connector.target-identity-conflict', reason: 'field-collision' },
        },
      ]
      const response = new Response(
        events
          .map((event, seq) =>
            JSON.stringify({
              runId: 'identity-run',
              candidateHash: 'a'.repeat(64),
              seq,
              at: '2026-10-22T00:00:00Z',
              ...event,
            }),
          )
          .join('\n'),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      )
      const result = streamPipelinePreview(
        { pipelineId: 'orders', drafts: [{ content: 'candidate' }] },
        fetcherFor(response),
      )
      if (status === 'action-required') {
        await expect(result).resolves.toMatchObject({
          identityPlans: [{ status: 'action-required', preservedField: '_unwind_source_id' }],
          failure: { code: 'connector.target-identity-conflict' },
          documents: [],
        })
      } else {
        await expect(result).rejects.toMatchObject({ kind: 'protocol' })
      }
    }
  })

  it('accepts both logical JSON and Mongo Extended JSON preview results', async () => {
    for (const format of ['logical-json', 'mongo-extended-json'] as const) {
      const runId = 'preview-run'
      const candidateHash = 'a'.repeat(64)
      const payloads = [
        { kind: 'run.accepted', payload: { pipelineId: 'orders' } },
        { kind: 'compile.completed', payload: { executionSpec: {}, contexts: [] } },
        {
          kind: 'sample.completed',
          payload: {
            sampleId: 'sample',
            complete: true,
            rootSourceKeys: [],
            rootRows: 1,
            inputRows: 1,
            inputBytes: 16,
            rootTruncated: false,
            repeatable: true,
          },
        },
        {
          kind: 'result.completed',
          payload: {
            format,
            complete: true,
            truncated: false,
            documents: [{ _id: { $oid: '64f0c0de0011223344556677' } }],
            logicalDocuments: [{ _id: 'source-id', position: 0 }],
            rowCount: 1,
          },
        },
        { kind: 'run.completed', payload: { rowCount: 1 } },
      ]
      const response = new Response(
        payloads
          .map((event, seq) =>
            JSON.stringify({
              runId,
              candidateHash,
              seq,
              kind: event.kind,
              at: '2026-10-02T00:00:00Z',
              payload: event.payload,
            }),
          )
          .join('\n'),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      )

      await expect(
        streamPipelinePreview(
          { pipelineId: 'orders', drafts: [{ content: 'candidate' }] },
          fetcherFor(response),
        ),
      ).resolves.toMatchObject({
        format,
        rowCount: 1,
        logicalDocuments: [{ _id: 'source-id', position: 0 }],
      })
    }
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

  it('keeps the start checks a start refused with, beside the coded error', async () => {
    await expect(
      runPipeline(
        'orders_to_warehouse',
        fetcherFor(
          jsonResponse(
            {
              code: 'lifecycle.start-needs-confirmation',
              params: { pipeline: 'orders_to_warehouse', count: 1 },
              message: 'Starting orders_to_warehouse needs an answer to 1 question.',
              startChecks,
            },
            409,
          ),
        ),
      ),
    ).rejects.toMatchObject({
      kind: 'server',
      status: 409,
      code: 'lifecycle.start-needs-confirmation',
      params: { pipeline: 'orders_to_warehouse', count: 1 },
      message: 'Starting orders_to_warehouse needs an answer to 1 question.',
      startChecks,
      decisionsApplied: [],
    })
  })

  it('keeps what a conflicting start already changed and drops a malformed report', async () => {
    const decisionsApplied = [
      {
        finding: 'target-not-empty/warehouse/orders',
        action: 'clear',
        kind: 'CHANGE_DEFINITION',
        changes: [{ element: 'orders', field: 'on_full_load', from: 'append', to: 'clear' }],
        contentHash: 'e'.repeat(64),
      },
    ]

    await expect(
      runPipeline(
        'orders_to_warehouse',
        fetcherFor(
          jsonResponse(
            {
              code: 'pipeline.version-conflict',
              params: { id: 'orders_to_warehouse' },
              message: 'Pipeline orders_to_warehouse changed.',
              decisionsApplied,
            },
            412,
          ),
        ),
      ),
    ).rejects.toMatchObject({
      status: 412,
      code: 'pipeline.version-conflict',
      startChecks: null,
      decisionsApplied,
    })

    await expect(
      runPipeline(
        'orders_to_warehouse',
        fetcherFor(
          jsonResponse(
            {
              code: 'lifecycle.start-blocked',
              params: {},
              message: 'Blocked.',
              startChecks: { ...startChecks, findings: [{ key: 'only-a-key' }] },
            },
            409,
          ),
        ),
      ),
    ).rejects.toMatchObject({ status: 409, code: 'lifecycle.start-blocked', startChecks: null })
  })

  it('starts without a body until a start-check question is answered', async () => {
    const plainRequests: Request[] = []
    await expect(
      runPipeline('orders_to_warehouse', fetcherFor(jsonResponse({}), plainRequests)),
    ).resolves.toEqual({ startChecks: null, decisionsApplied: [], staleDecisions: [] })
    expect(plainRequests[0]!.headers.get('If-Match')).toBeNull()
    await expect(plainRequests[0]!.text()).resolves.toBe('')

    const answeredRequests: Request[] = []
    const result = await runPipeline(
      'orders_to_warehouse',
      fetcherFor(
        jsonResponse({
          pipelineId: 'orders_to_warehouse',
          targetState: 'RUNNING',
          revision: 'r2',
          startChecks: { ...startChecks, outcome: 'READY' },
          decisionsApplied: [
            {
              finding: 'target-not-empty/warehouse/orders',
              action: 'clear',
              kind: 'CHANGE_DEFINITION',
              changes: [{ element: 'orders', field: 'on_full_load', from: 'append', to: 'clear' }],
              contentHash: 'e'.repeat(64),
            },
          ],
          staleDecisions: [{ finding: 'gone/finding', action: 'keep' }],
        }),
        answeredRequests,
      ),
      {
        decisions: [{ finding: 'target-not-empty/warehouse/orders', action: 'clear' }],
        ifMatch: `"${'f'.repeat(64)}"`,
      },
    )

    expect(answeredRequests[0]!.method).toBe('POST')
    expect(new URL(answeredRequests[0]!.url).pathname).toBe(
      '/api/pipelines/orders_to_warehouse:start',
    )
    expect(answeredRequests[0]!.headers.get('If-Match')).toBe(`"${'f'.repeat(64)}"`)
    await expect(answeredRequests[0]!.json()).resolves.toEqual({
      decisions: [{ finding: 'target-not-empty/warehouse/orders', action: 'clear' }],
    })
    expect(result).toMatchObject({
      pipelineId: 'orders_to_warehouse',
      targetState: 'RUNNING',
      startChecks: { outcome: 'READY' },
      decisionsApplied: [{ action: 'clear', contentHash: 'e'.repeat(64) }],
      staleDecisions: [{ finding: 'gone/finding', action: 'keep' }],
    })
  })

  it('refuses to send start-check answers without the quoted report hash', async () => {
    const requests: Request[] = []
    await expect(
      runPipeline('orders_to_warehouse', fetcherFor(jsonResponse({}), requests), {
        decisions: [{ finding: 'target-not-empty/warehouse/orders', action: 'keep' }],
      }),
    ).rejects.toMatchObject({ status: 428, code: 'pipeline.precondition-required' })
    await expect(
      runPipeline('orders_to_warehouse', fetcherFor(jsonResponse({}), requests), {
        decisions: [{ finding: 'target-not-empty/warehouse/orders', action: 'keep' }],
        ifMatch: 'f'.repeat(64),
      }),
    ).rejects.toMatchObject({ status: 428 })
    expect(requests).toHaveLength(0)
  })

  it('reads a start-check preview for the named intent', async () => {
    const requests: Request[] = []
    await expect(
      getStartChecks('orders/warehouse', 'rerun', fetcherFor(jsonResponse(startChecks), requests)),
    ).resolves.toEqual(startChecks)
    expect(requests[0]!.method).toBe('GET')
    expect(new URL(requests[0]!.url).pathname).toBe(
      '/api/pipelines/orders%2Fwarehouse/start-checks',
    )
    expect(new URL(requests[0]!.url).searchParams.get('intent')).toBe('rerun')

    await expect(
      getStartChecks(
        'orders_to_warehouse',
        'start',
        fetcherFor(jsonResponse({ ...startChecks, findings: null })),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })
})
