import { describe, expect, it } from 'vitest'

import type {
  PipelineDraft,
  PipelineDraftMutation,
  PipelineView,
} from '@/service/pipelines/pipeline-client'

import type { PipelineGraphDraft } from './pipeline-graph-edit'

import { buildPipelineDraftMutation, pipelineDraftDocument } from './pipeline-draft-document'
import { createPipelineGraphDraft, updatePipelineNodeConfiguration } from './pipeline-graph-edit'

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
  it('uses the current Artifact hash when first editing an existing Pipeline', () => {
    const hash = 'a'.repeat(64)
    const mutation = buildPipelineDraftMutation(
      { ...editor, pipeline: { ...editor.pipeline, contentHash: hash } },
      { nodes: {}, viewport: { x: 0, y: 0, zoom: 1 } },
    )
    expect(mutation.baseArtifactHash).toBe(hash)
  })

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

/** A published Pipeline as the detail endpoint reports it: write settings arrive as enum names. */
const publishedLeadPipeline: PipelineView = {
  id: 'lead_view',
  metadata: { labels: {}, description: null },
  sources: [
    { id: 'src_pg', metadata: null, connector: 'postgres' },
    { id: 'warehouse', metadata: null, connector: 'mongodb' },
  ],
  transforms: [],
  view: {
    id: 'lead',
    from: 'src_pg.leads',
    primaryKey: 'id',
    storage: null,
    writeMode: 'APPEND',
    onFullLoad: 'CLEAR',
  },
  serve: {
    id: 'lead_out',
    from: 'lead',
    sync: [
      {
        id: 'lead_copy',
        source: 'warehouse',
        writeMode: 'UPSERT',
        rename: null,
        ddl: null,
        onFullLoad: 'CLEAR',
      },
    ],
    query: null,
    push: null,
  },
  settings: null,
  experimental: null,
  dag: {
    nodes: [
      { id: 'source:src_pg:leads', type: 'source', label: 'leads', detail: 'src_pg' },
      { id: 'view:lead', type: 'view', label: 'lead', detail: null },
      { id: 'target:warehouse:lead', type: 'target', label: 'lead', detail: 'warehouse' },
    ],
    edges: [
      { id: 'leads-view', source: 'source:src_pg:leads', target: 'view:lead', label: null },
      { id: 'view-target', source: 'view:lead', target: 'target:warehouse:lead', label: null },
    ],
  },
  contentHash: 'c'.repeat(64),
  status: null,
}

function storedDraft(mutation: PipelineDraftMutation): PipelineDraft {
  return {
    ...mutation,
    schemaVersion: 1,
    revision: 4,
    name: mutation.name ?? null,
    description: mutation.description ?? null,
    graph: mutation.graph ?? null,
    wizard: null,
    baseArtifactHash: mutation.baseArtifactHash ?? null,
    publishedDraftRevision: 4,
    publishedArtifactHash: 'c'.repeat(64),
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:01Z',
    updatedBy: 'user@example.com',
  }
}

function graphNode(mutation: PipelineDraftMutation, type: string) {
  return mutation.graph?.nodes.find((node) => node.type === type)
}

describe('Pipeline draft full-load policy', () => {
  it('carries the published full-load policy into a draft built from an existing Pipeline', () => {
    const mutation = buildPipelineDraftMutation(createPipelineGraphDraft(publishedLeadPipeline), {
      nodes: {},
      viewport: null,
    })

    expect(graphNode(mutation, 'target')?.config.onFullLoad).toBe('clear')
    expect(graphNode(mutation, 'target')?.config).toMatchObject({ writeMode: 'upsert' })
    expect(graphNode(mutation, 'view')?.config).toMatchObject({
      writeMode: 'append',
      onFullLoad: 'clear',
    })
  })

  it('keeps the full-load policy a stored draft carries through the editor', () => {
    const published = buildPipelineDraftMutation(createPipelineGraphDraft(publishedLeadPipeline), {
      nodes: {},
      viewport: null,
    })
    const stored = storedDraft({
      ...published,
      graph: published.graph && {
        ...published.graph,
        nodes: published.graph.nodes.map((node) =>
          node.type === 'target' || node.type === 'view'
            ? { ...node, config: { ...node.config, onFullLoad: 'fail' } }
            : node,
        ),
      },
    })

    const document = pipelineDraftDocument(stored)
    const saved = buildPipelineDraftMutation(document.editor, document.layout)

    expect(graphNode(saved, 'target')?.config.onFullLoad).toBe('fail')
    expect(graphNode(saved, 'view')?.config).toMatchObject({
      writeMode: 'append',
      onFullLoad: 'fail',
    })
  })

  it('writes the full-load policy a person picks on a target node into the draft', () => {
    const undeclared: PipelineView = {
      ...publishedLeadPipeline,
      serve: {
        ...publishedLeadPipeline.serve,
        sync: [{ id: 'lead_copy', source: 'warehouse', writeMode: 'UPSERT', onFullLoad: null }],
      },
    }
    const editorDraft = createPipelineGraphDraft(undeclared)
    const formValues = { sourceId: 'warehouse', table: 'lead', writeMode: 'upsert' }

    const untouched = updatePipelineNodeConfiguration(editorDraft, {
      nodeId: 'target:warehouse:lead',
      kind: 'target',
      values: formValues,
    })
    expect(
      graphNode(buildPipelineDraftMutation(untouched, { nodes: {}, viewport: null }), 'target')
        ?.config,
    ).not.toHaveProperty('onFullLoad')

    const chosen = updatePipelineNodeConfiguration(untouched, {
      nodeId: 'target:warehouse:lead',
      kind: 'target',
      values: { ...formValues, onFullLoad: 'clear' },
    })
    const kept = updatePipelineNodeConfiguration(chosen, {
      nodeId: 'target:warehouse:lead',
      kind: 'target',
      values: { ...formValues, table: 'lead_copy' },
    })

    expect(
      graphNode(buildPipelineDraftMutation(chosen, { nodes: {}, viewport: null }), 'target')
        ?.config,
    ).toMatchObject({ onFullLoad: 'clear' })
    expect(
      graphNode(buildPipelineDraftMutation(kept, { nodes: {}, viewport: null }), 'target')?.config,
    ).toMatchObject({ onFullLoad: 'clear' })
  })

  it('leaves the policy out of a draft whose Pipeline never declared one', () => {
    const undeclared: PipelineView = {
      ...publishedLeadPipeline,
      view: { ...publishedLeadPipeline.view, writeMode: null, onFullLoad: null },
      serve: {
        ...publishedLeadPipeline.serve,
        sync: [{ id: 'lead_copy', source: 'warehouse', writeMode: null, onFullLoad: null }],
      },
    }

    const mutation = buildPipelineDraftMutation(createPipelineGraphDraft(undeclared), {
      nodes: {},
      viewport: null,
    })
    const roundTrip = pipelineDraftDocument(storedDraft(mutation))
    const saved = buildPipelineDraftMutation(roundTrip.editor, roundTrip.layout)

    for (const draft of [mutation, saved]) {
      expect(graphNode(draft, 'target')?.config).not.toHaveProperty('onFullLoad')
      expect(graphNode(draft, 'view')?.config).not.toHaveProperty('writeMode')
      expect(graphNode(draft, 'view')?.config).not.toHaveProperty('onFullLoad')
    }
  })
})
