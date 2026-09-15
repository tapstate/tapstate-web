import { describe, expect, it } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'

import {
  addPipelineNode,
  addPipelineNodes,
  buildPipelineMutation,
  createPipelineGraphDraft,
  removePipelineNode,
  updatePipelineNodeConfiguration,
  validatePipelineGraph,
} from './pipeline-graph-edit'

const view = {
  id: 'orders',
  sources: [
    { id: 'mysql', metadata: null, connector: 'mysql' },
    { id: 'mongo', metadata: null, connector: 'mongodb' },
  ],
  transforms: [{ id: 'joined', type: 'nest', from: 'orders' }],
  serve: { id: 'serve', from: 'joined', sync: [{ id: 'orders_out', source: 'mongo' }] },
  dag: {
    nodes: [
      { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
      { id: 'transform:joined', type: 'transform', label: 'joined', detail: 'nest' },
      { id: 'target:mongo:orders', type: 'target', label: 'orders', detail: 'mongo' },
    ],
    edges: [
      { id: 'e1', source: 'source:mysql:orders', target: 'transform:joined', label: null },
      { id: 'e2', source: 'transform:joined', target: 'target:mongo:orders', label: null },
    ],
  },
  contentHash: '"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
} satisfies PipelineView

describe('pipeline graph edit model', () => {
  it('adds a typed draft transform and removes it with connected edges', () => {
    const draft = createPipelineGraphDraft(view)
    const added = addPipelineNode(
      draft,
      { kind: 'transform', transformType: 'filter' },
      { x: 100, y: 100 },
    )
    expect(added.nodeId).toMatch(/^draft:transform:filter_/)
    expect(added.draft.dag.nodes.some((node) => node.id === added.nodeId)).toBe(true)
    expect(added.draft.configurations.get(added.nodeId)).toMatchObject({
      kind: 'transform',
      stepId: 'filter_1',
      transformType: 'filter',
    })

    const removed = removePipelineNode(added.draft, added.nodeId)
    expect(removed.dag.nodes.some((node) => node.id === added.nodeId)).toBe(false)
    expect(
      removed.dag.edges.some(
        (edge) => edge.source === added.nodeId || edge.target === added.nodeId,
      ),
    ).toBe(false)
  })

  it('keeps palette additions isolated unless an explicit source is provided', () => {
    const draft = createPipelineGraphDraft(view)
    const isolated = addPipelineNode(
      draft,
      { kind: 'transform', transformType: 'map' },
      { x: 240, y: 180 },
    )
    expect(isolated.draft.dag.edges).toEqual(draft.dag.edges)

    const connected = addPipelineNode(
      draft,
      { kind: 'transform', transformType: 'map' },
      { x: 240, y: 180 },
      'source:mysql:orders',
    )
    expect(connected.draft.dag.edges).toContainEqual({
      id: 'edge:source:mysql:orders:draft:transform:map_1',
      source: 'source:mysql:orders',
      target: connected.nodeId,
      label: null,
    })
  })

  it('inserts a processing node before a direct serve target and derives serve.from from it', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: null,
      serve: { id: 'serve', from: 'orders', sync: [{ id: 'orders_out', source: 'mongo' }] },
      dag: {
        nodes: [
          { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
          { id: 'target:mongo:orders', type: 'target', label: 'orders', detail: 'mongo' },
        ],
        edges: [
          {
            id: 'source:mysql:orders->target:mongo:orders:orders_out',
            source: 'source:mysql:orders',
            target: 'target:mongo:orders',
            label: null,
          },
        ],
      },
    })

    const added = addPipelineNode(
      draft,
      { kind: 'transform', transformType: 'filter' },
      { x: 240, y: 180 },
      'source:mysql:orders',
    )
    const edges = added.draft.dag.edges.map(({ source, target }) => ({ source, target }))

    expect(edges).toEqual([
      { source: 'source:mysql:orders', target: added.nodeId },
      { source: added.nodeId, target: 'target:mongo:orders' },
    ])
    expect(buildPipelineMutation(added.draft).serve?.from).toBe('filter_1')
  })

  it('creates a configured source that is valid when it is in the workspace Source catalog', () => {
    const draft = createPipelineGraphDraft(view)
    const added = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'postgres',
        table: 'payments',
        connectorId: 'postgresql',
      },
      { x: 240, y: 180 },
    )

    expect(added.draft.dag.nodes.find((node) => node.id === added.nodeId)).toMatchObject({
      type: 'source',
      label: 'payments',
      detail: 'postgres',
    })
    expect(added.draft.configurations.get(added.nodeId)).toEqual({
      kind: 'source',
      nodeId: added.nodeId,
      sourceId: 'postgres',
      tables: [{ table: 'payments' }],
      table: 'payments',
      connectorId: 'postgresql',
    })
    expect(
      validatePipelineGraph(added.draft, ['mysql', 'mongo', 'postgres']).some(
        (item) => item.code === 'invalid-source-reference',
      ),
    ).toBe(false)
  })

  it('folds a batch of source tables into one visible Source node', () => {
    const draft = createPipelineGraphDraft(view)
    const added = addPipelineNodes(
      draft,
      [
        { kind: 'source', sourceId: 'postgres', table: 'payments', connectorId: 'postgresql' },
        { kind: 'source', sourceId: 'postgres', table: 'customers', connectorId: 'postgresql' },
      ],
      { x: 240, y: 180 },
    )

    expect(added.nodeIds).toHaveLength(1)
    expect(added.draft.dag.nodes.filter((node) => added.nodeIds.includes(node.id))).toHaveLength(1)
    expect(added.positions[added.nodeIds[0]!]).toEqual({ x: 240, y: 180 })
    expect(added.draft.configurations.get(added.nodeIds[0]!)).toMatchObject({
      kind: 'source',
      tables: [{ table: 'payments' }, { table: 'customers' }],
    })
  })

  it('folds a persisted per-table DAG projection back into one Source node', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      transforms: null,
      serve: { id: 'serve', from: 'mysql', sync: [{ id: 'orders_out', source: 'mongo' }] },
      dag: {
        nodes: [
          { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
          { id: 'source:mysql:customers', type: 'source', label: 'customers', detail: 'mysql' },
          { id: 'target:mongo:orders', type: 'target', label: 'orders', detail: 'mongo' },
        ],
        edges: [
          {
            id: 'orders-edge',
            source: 'source:mysql:orders',
            target: 'target:mongo:orders',
            label: null,
          },
          {
            id: 'customers-edge',
            source: 'source:mysql:customers',
            target: 'target:mongo:orders',
            label: null,
          },
        ],
      },
    })

    expect(draft.dag.nodes.filter((node) => node.type === 'source')).toHaveLength(1)
    const source = [...draft.configurations.values()].find((item) => item.kind === 'source')
    expect(source?.kind === 'source' ? source.tables : undefined).toEqual([
      { table: 'orders' },
      { table: 'customers' },
    ])
    expect(draft.dag.edges.filter((edge) => edge.target === 'target:mongo:orders')).toHaveLength(1)
  })

  it('keeps a Source regex as a dynamic reference instead of qualifying it as a literal table', () => {
    const draft = createPipelineGraphDraft(view)
    const added = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'mysql',
        table: 'player_*',
        tableKind: 'regex',
        connectorId: 'mysql',
      },
      { x: 240, y: 180 },
    )
    const transform = addPipelineNode(
      added.draft,
      { kind: 'transform', transformType: 'filter' },
      { x: 420, y: 180 },
      added.nodeId,
    )

    expect(buildPipelineMutation(transform.draft).transforms?.at(-1)?.from).toBe('/player_*/')
  })

  it('serializes one multi-table Source node as multiple transform inputs', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: null,
      serve: null,
      dag: { nodes: [], edges: [] },
    })
    const source = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'postgres',
        table: 'payments',
        tables: [{ table: 'payments' }, { table: 'customers' }],
        connectorId: 'postgresql',
      },
      { x: 240, y: 180 },
    )
    const transform = addPipelineNode(
      source.draft,
      { kind: 'transform', transformType: 'union' },
      { x: 420, y: 180 },
      source.nodeId,
    )

    expect(buildPipelineMutation(transform.draft).transforms?.[0]?.from).toEqual([
      'postgres.payments',
      'postgres.customers',
    ])
  })

  it('serializes a direct multi-table Source node as one serve input list', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: null,
      serve: null,
      dag: { nodes: [], edges: [] },
    })
    const source = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'postgres',
        table: 'payments',
        tables: [{ table: 'payments' }, { table: 'customers' }],
        connectorId: 'postgresql',
      },
      { x: 240, y: 180 },
    )
    const target = addPipelineNode(
      source.draft,
      { kind: 'target', sourceId: 'mongo', table: 'payments', connectorId: 'mongodb' },
      { x: 520, y: 180 },
      source.nodeId,
    )
    const changed = updatePipelineNodeConfiguration(target.draft, {
      nodeId: target.nodeId,
      kind: 'target',
      values: {
        tableMappings: [
          { sourceTable: 'payments', targetTable: 'payments_archive' },
          { sourceTable: 'customers', targetTable: 'customers_archive' },
        ],
      },
    })

    const mutation = buildPipelineMutation(changed)
    expect(mutation.serve?.from).toEqual(['postgres.payments', 'postgres.customers'])
    expect(mutation.serve?.sync).toEqual([
      expect.objectContaining({
        source: 'mongo',
        rename: {
          map: {
            payments: 'payments_archive',
            customers: 'customers_archive',
          },
        },
      }),
    ])
  })

  it('does not block a direct multi-table subset represented by explicit serve inputs', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: null,
      serve: null,
      dag: { nodes: [], edges: [] },
    })
    const source = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'mysql',
        table: 'orders',
        tables: [{ table: 'orders' }, { table: 'customers' }],
        connectorId: 'mysql',
      },
      { x: 240, y: 180 },
    )
    const target = addPipelineNode(
      source.draft,
      { kind: 'target', sourceId: 'mongo', table: 'orders', connectorId: 'mongodb' },
      { x: 520, y: 180 },
      source.nodeId,
    )
    const diagnostics = validatePipelineGraph(target.draft, ['mysql', 'mongo'])
    expect(diagnostics.some((diagnostic) => diagnostic.code === 'missing-configuration')).toBe(
      false,
    )
    expect(buildPipelineMutation(target.draft).serve?.from).toEqual([
      'mysql.orders',
      'mysql.customers',
    ])
  })

  it('moves multi-table wiring to a transform when one is inserted before the target', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: null,
      serve: null,
      dag: { nodes: [], edges: [] },
    })
    const source = addPipelineNode(
      draft,
      {
        kind: 'source',
        sourceId: 'mysql',
        table: 'orders',
        tables: [{ table: 'orders' }, { table: 'customers' }],
        connectorId: 'mysql',
      },
      { x: 240, y: 180 },
    )
    const target = addPipelineNode(
      source.draft,
      { kind: 'target', sourceId: 'mongo', table: 'orders', connectorId: 'mongodb' },
      { x: 520, y: 180 },
      source.nodeId,
    )
    const transform = addPipelineNode(
      target.draft,
      { kind: 'transform', transformType: 'filter' },
      { x: 380, y: 180 },
      source.nodeId,
    )

    const mutation = buildPipelineMutation(transform.draft)
    expect(mutation.transforms?.[0]?.from).toEqual(['mysql.orders', 'mysql.customers'])
    expect(mutation.serve?.from).toBe('filter_1')
  })

  it('accepts a target Source resolved from the catalog even when it is not a declared input', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      dag: {
        ...view.dag,
        nodes: [
          view.dag.nodes[0],
          view.dag.nodes[1],
          {
            id: 'target:mongodb_target:orders',
            type: 'target',
            label: 'orders',
            detail: 'mongodb_target',
          },
        ],
      },
    })

    expect(
      validatePipelineGraph(draft, ['mysql', 'mongodb_target']).some(
        (item) => item.code === 'invalid-source-reference',
      ),
    ).toBe(false)
  })

  it('trusts an existing serve sink while the workspace Source catalog is still loading', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      serve: {
        id: 'serve',
        from: 'joined',
        sync: [{ id: 'orders_out', source: 'mongo' }],
      },
      dag: {
        ...view.dag,
        nodes: [
          view.dag.nodes[0],
          view.dag.nodes[1],
          { id: 'target:mongo:orders', type: 'target', label: 'orders', detail: 'mongo' },
        ],
        edges: [
          view.dag.edges[0],
          { id: 'e2', source: 'transform:joined', target: 'target:mongo:orders', label: null },
        ],
      },
    })

    expect(
      validatePipelineGraph(draft).some((item) => item.code === 'invalid-source-reference'),
    ).toBe(false)
  })

  it('rejects a data node that points at a Source outside the loaded catalog', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      dag: {
        ...view.dag,
        nodes: [
          view.dag.nodes[0],
          { id: 'target:missing:orders', type: 'target', label: 'orders', detail: 'missing' },
        ],
      },
    })

    expect(
      validatePipelineGraph(draft, ['mysql', 'mongo']).some(
        (item) => item.code === 'invalid-source-reference',
      ),
    ).toBe(true)
  })

  it('refuses a target whose Source is not on a MongoDB connector, and defers without one', () => {
    const draft = createPipelineGraphDraft(view)
    const refused = (catalog?: readonly (string | { id: string; connector: string })[]) =>
      validatePipelineGraph(draft, catalog).filter(
        (item) => item.code === 'unsupported-target-connector',
      )

    // One graph, four catalogs: only what the catalog says about `mongo` changes the verdict.
    expect(
      refused([
        { id: 'mysql', connector: 'mysql' },
        { id: 'mongo', connector: 'mongodb' },
      ]),
    ).toEqual([])
    // A managed variant of the same database kind, which is what a deployment on one registers.
    expect(
      refused([
        { id: 'mysql', connector: 'mysql' },
        { id: 'mongo', connector: 'mongodb-atlas' },
      ]),
    ).toEqual([])
    expect(
      refused([
        { id: 'mysql', connector: 'mysql' },
        { id: 'mongo', connector: 'postgres' },
      ]),
    ).toEqual([
      {
        code: 'unsupported-target-connector',
        nodeIds: ['target:mongo:orders'],
        messageKey: 'pipelines.workspace.diagnostics.unsupportedTargetConnector',
      },
    ])
    // Ids alone never said which connector `mongo` goes through, so nothing is judged.
    expect(refused(['mysql', 'mongo'])).toEqual([])
    expect(refused()).toEqual([])
  })

  it('reports isolated nodes, cycles, and dangling edges', () => {
    const draft = createPipelineGraphDraft(view)
    const isolated = addPipelineNode(draft, { kind: 'view' }, { x: 10, y: 10 }).draft
    const diagnostics = validatePipelineGraph(isolated)
    expect(diagnostics.some((item) => item.code === 'isolated-node')).toBe(true)

    const cyclic = {
      ...draft,
      dag: {
        ...draft.dag,
        edges: [
          ...draft.dag.edges,
          { id: 'cycle', source: 'transform:joined', target: 'source:mysql:orders', label: null },
        ],
      },
    }
    expect(validatePipelineGraph(cyclic).some((item) => item.code === 'cycle')).toBe(true)
  })

  it('keeps nest incoming edges and emits a structured mutation without edge labels', () => {
    const draft = createPipelineGraphDraft(view)
    const changed = updatePipelineNodeConfiguration(draft, {
      nodeId: 'transform:joined',
      kind: 'transform',
      values: { options: { key: 'id' } },
    })
    const mutation = buildPipelineMutation(changed)
    expect(mutation.id).toBe('orders')
    expect(mutation.transforms?.[0]).toMatchObject({ id: 'joined', options: { key: 'id' } })
    expect(mutation).not.toHaveProperty('dag')
    expect(JSON.stringify(mutation)).not.toContain('label')
    expect(changed.dag.edges.filter((edge) => edge.target === 'transform:joined')).toHaveLength(1)
  })

  it('serializes multiple nest inputs as stable aliases and excludes serve from the graph', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      transforms: [{ id: 'joined', type: 'nest', from: 'orders' }],
      dag: {
        nodes: [
          { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
          { id: 'source:postgres:orders', type: 'source', label: 'orders', detail: 'postgres' },
          { id: 'transform:joined', type: 'transform', label: 'joined', detail: 'nest' },
          { id: 'target:mongo:orders', type: 'target', label: 'orders', detail: 'mongo' },
          { id: 'serve', type: 'serve', label: 'serve', detail: null },
        ],
        edges: [
          { id: 'e1', source: 'source:mysql:orders', target: 'transform:joined', label: null },
          { id: 'e2', source: 'source:postgres:orders', target: 'transform:joined', label: null },
          { id: 'e3', source: 'transform:joined', target: 'target:mongo:orders', label: null },
          { id: 'e4', source: 'target:mongo:orders', target: 'serve', label: null },
        ],
      },
      sources: [
        { id: 'mysql', metadata: null, connector: 'mysql' },
        { id: 'postgres', metadata: null, connector: 'postgres' },
        { id: 'mongo', metadata: null, connector: 'mongodb' },
      ],
    })
    const mutation = buildPipelineMutation(draft)
    expect(mutation.transforms?.[0]?.from).toEqual({
      input_1: 'mysql.orders',
      input_2: 'postgres.orders',
    })
    expect('dag' in mutation).toBe(false)
    expect(mutation.serve?.from).toBe('joined')
  })

  it('keeps an existing serve sync id when a target table is renamed', () => {
    const draft = createPipelineGraphDraft({
      ...view,
      serve: {
        id: 'serve',
        from: 'joined',
        sync: [{ id: 'orders_out', source: 'mongo', from: 'orders' }],
      },
    })
    const changed = updatePipelineNodeConfiguration(draft, {
      nodeId: 'target:mongo:orders',
      kind: 'target',
      values: { table: 'orders_archive' },
    })

    const mutation = buildPipelineMutation(changed)
    expect(mutation.serve?.sync).toEqual([
      expect.objectContaining({
        id: 'orders_out',
        source: 'mongo',
        rename: { map: { joined: 'orders_archive' } },
      }),
    ])
  })
})
