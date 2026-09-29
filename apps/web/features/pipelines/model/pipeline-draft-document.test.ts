import { describe, expect, it } from 'vitest'

import type { PipelineGraphDraft } from './pipeline-graph-edit'

import { buildPipelineDraftMutation, pipelineDraftDocument } from './pipeline-draft-document'

const editor: PipelineGraphDraft = {
  pipeline: {
    id: 'orders_to_warehouse',
    metadata: { labels: {}, description: 'Orders sync' },
    sources: [],
    transforms: [],
    view: null,
    serve: null,
    settings: null,
    experimental: null,
    dag: { nodes: [], edges: [] },
    contentHash: 'draft:1',
    status: null,
  },
  dag: {
    nodes: [
      { id: 'draft:source:1', type: 'source', label: 'orders', detail: 'mysql', description: null },
      {
        id: 'draft:transform:filter_1',
        type: 'transform',
        label: 'filter_1',
        detail: 'filter',
        description: null,
      },
      {
        id: 'draft:target:1',
        type: 'target',
        label: 'warehouse_orders',
        detail: 'mongodb',
        description: null,
      },
    ],
    edges: [
      {
        id: 'source-filter',
        source: 'draft:source:1',
        target: 'draft:transform:filter_1',
        label: null,
      },
      {
        id: 'filter-target',
        source: 'draft:transform:filter_1',
        target: 'draft:target:1',
        label: null,
      },
    ],
  },
  configurations: new Map([
    [
      'draft:source:1',
      {
        kind: 'source',
        nodeId: 'draft:source:1',
        sourceId: 'mysql',
        table: 'orders',
        tables: [{ table: 'orders' }],
        connectorId: 'mysql',
      },
    ],
    [
      'draft:transform:filter_1',
      {
        kind: 'transform',
        nodeId: 'draft:transform:filter_1',
        stepId: 'filter_1',
        transformType: 'filter',
        from: null,
        options: {},
        body: { expr: "op != 'd'" },
      },
    ],
    [
      'draft:target:1',
      {
        kind: 'target',
        nodeId: 'draft:target:1',
        sourceId: 'mongodb',
        table: 'warehouse_orders',
        connectorId: 'mongodb',
        writeMode: 'upsert',
      },
    ],
  ]),
  descriptions: new Map([['draft:transform:filter_1', 'Drop deletes']]),
}

describe('Pipeline draft document', () => {
  it('persists graph coordinates with the draft instead of the legacy layout resource', () => {
    const mutation = buildPipelineDraftMutation(editor, {
      nodes: {
        'draft:source:1': { x: 24, y: 40 },
        'draft:transform:filter_1': { x: 280, y: 40 },
      },
      viewport: { x: -100, y: 20, zoom: 1.25 },
    })

    expect(mutation).toMatchObject({
      pipelineId: 'orders_to_warehouse',
      mode: 'dag',
      graph: {
        viewport: { x: -100, y: 20, zoom: 1.25 },
      },
    })
    expect(mutation.graph?.nodes[0]).toMatchObject({
      id: 'draft:source:1',
      type: 'source',
      sourceId: 'mysql',
      metadata: { position: { x: 24, y: 40 } },
    })
    expect(mutation.graph?.nodes[1]).toMatchObject({
      id: 'draft:transform:filter_1',
      type: 'filter',
      config: { expr: "op != 'd'" },
      metadata: { editorKind: 'transform', stepId: 'filter_1', description: 'Drop deletes' },
    })
  })

  it('restores persisted graph data without reconstructing it from an Artifact', () => {
    const mutation = buildPipelineDraftMutation(editor, {
      nodes: { 'draft:source:1': { x: 24, y: 40 } },
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    const document = pipelineDraftDocument({
      ...mutation,
      schemaVersion: 1,
      revision: 2,
      name: 'orders_to_warehouse',
      description: mutation.description ?? null,
      graph: mutation.graph!,
      wizard: null,
      baseArtifactHash: null,
      publishedDraftRevision: null,
      publishedArtifactHash: null,
      createdAt: '2026-09-21T00:00:00Z',
      updatedAt: '2026-09-21T00:00:01Z',
      updatedBy: 'user@example.com',
    })

    expect(document.editor.dag.nodes).toEqual([
      editor.dag.nodes[0],
      { ...editor.dag.nodes[1], description: 'Drop deletes' },
      editor.dag.nodes[2],
    ])
    expect(document.editor.configurations.get('draft:transform:filter_1')).toMatchObject({
      kind: 'transform',
      transformType: 'filter',
      stepId: 'filter_1',
      body: { expr: "op != 'd'" },
    })
    expect(document.layout).toEqual({
      pipelineId: 'orders_to_warehouse',
      nodes: { 'draft:source:1': { x: 24, y: 40 } },
      viewport: { x: 0, y: 0, zoom: 1 },
    })
  })

  it('round-trips join and union input wiring with the durable draft', () => {
    const joinId = 'draft:transform:join'
    const unionId = 'draft:transform:union'
    const configuredEditor: PipelineGraphDraft = {
      ...editor,
      dag: {
        nodes: [
          ...editor.dag.nodes,
          { id: joinId, type: 'transform', label: 'join', detail: 'join', description: null },
          { id: unionId, type: 'transform', label: 'union', detail: 'union', description: null },
        ],
        edges: editor.dag.edges,
      },
      configurations: new Map([
        ...editor.configurations,
        [
          joinId,
          {
            kind: 'transform',
            nodeId: joinId,
            stepId: 'joined_orders',
            transformType: 'join',
            from: { order_rows: 'mysql.orders', customer_rows: 'mysql.customers' },
            options: null,
            body: { engine: 'builtin', sql: 'select * from order_rows' },
          },
        ],
        [
          unionId,
          {
            kind: 'transform',
            nodeId: unionId,
            stepId: 'all_orders',
            transformType: 'union',
            from: ['mysql.orders', 'mysql.archived_orders'],
            options: null,
            body: {},
          },
        ],
      ]),
    }

    const mutation = buildPipelineDraftMutation(configuredEditor, {
      nodes: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    const document = pipelineDraftDocument({
      ...mutation,
      schemaVersion: 1,
      revision: 2,
      name: 'orders_to_warehouse',
      description: mutation.description ?? null,
      graph: mutation.graph!,
      wizard: null,
      baseArtifactHash: null,
      publishedDraftRevision: null,
      publishedArtifactHash: null,
      createdAt: '2026-09-21T00:00:00Z',
      updatedAt: '2026-09-21T00:00:01Z',
      updatedBy: 'user@example.com',
    })

    expect(mutation.graph?.nodes.find((node) => node.id === joinId)?.config).toMatchObject({
      from: { order_rows: 'mysql.orders', customer_rows: 'mysql.customers' },
      engine: 'builtin',
    })
    expect(mutation.graph?.nodes.find((node) => node.id === unionId)?.config).toMatchObject({
      from: ['mysql.orders', 'mysql.archived_orders'],
    })
    expect(document.editor.configurations.get(joinId)).toMatchObject({
      kind: 'transform',
      from: { order_rows: 'mysql.orders', customer_rows: 'mysql.customers' },
      body: { engine: 'builtin', sql: 'select * from order_rows' },
    })
    expect(document.editor.configurations.get(unionId)).toMatchObject({
      kind: 'transform',
      from: ['mysql.orders', 'mysql.archived_orders'],
    })
  })
})
