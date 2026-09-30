import type {
  PipelineDraft,
  PipelineDraftGraph,
  PipelineDraftMutation,
  PipelineJsonObject,
  PipelineLayout,
  PipelineLayoutPosition,
  PipelineView,
} from '@/service/pipelines/pipeline-client'

import type { PipelineGraphDraft } from './pipeline-graph-edit'
import type { PipelineNodeConfiguration } from './pipeline-node-model'

import { sourceTableSelections } from './pipeline-node-model'

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }

export interface PipelineDraftDocument {
  editor: PipelineGraphDraft
  layout: PipelineLayout
  hasPublishedRevision: boolean
}

export interface PipelineDraftBasicInfo {
  name: string
  description: string | null
}

export type SavePipelineDraftBasicInfo = (
  basicInfo: PipelineDraftBasicInfo,
) => Promise<{ draft: PipelineDraft; etag: string }>

/** Converts the editor's clean graph and transient canvas coordinates to one durable draft document. */
export function buildPipelineDraftMutation(
  editor: PipelineGraphDraft,
  layout: Pick<PipelineLayout, 'nodes' | 'viewport'>,
  basicInfo?: PipelineDraftBasicInfo,
): PipelineDraftMutation {
  return {
    pipelineId: editor.pipeline.id,
    mode: 'dag',
    name: basicInfo?.name ?? editor.pipeline.id,
    description: basicInfo
      ? basicInfo.description
      : (editor.pipeline.metadata?.description ?? null),
    graph: {
      nodes: editor.dag.nodes.map((node) => {
        const configuration = editor.configurations.get(node.id)
        return draftNode(
          node,
          configuration,
          editor.descriptions.get(node.id),
          layout.nodes[node.id],
        )
      }),
      edges: editor.dag.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      viewport: layout.viewport ?? DEFAULT_VIEWPORT,
    },
    wizard: null,
    baseArtifactHash: editor.pipeline.contentHash.startsWith('draft:')
      ? null
      : editor.pipeline.contentHash,
  }
}

/** Hydrates a server draft into the editor's graph and its canvas-only projection. */
export function pipelineDraftDocument(draft: PipelineDraft): PipelineDraftDocument {
  if (draft.mode !== 'dag' || !draft.graph) {
    throw new Error('The Pipeline editor requires a DAG draft.')
  }

  const configurations = new Map<string, PipelineNodeConfiguration>()
  const descriptions = new Map<string, string>()
  const positions: Record<string, PipelineLayoutPosition> = {}
  const sourceIds = new Set<string>()
  const nodes = draft.graph.nodes.map((node) => {
    const metadata = node.metadata
    const editorKind = draftNodeKind(node)
    const label = text(metadata.label) ?? node.table ?? node.id
    const detail =
      text(metadata.detail) ?? (editorKind === 'transform' ? node.type : (node.sourceId ?? null))
    const description = text(metadata.description)
    const position = positionFrom(metadata.position)
    if (description !== null) descriptions.set(node.id, description)
    if (position) positions[node.id] = position

    const configuration = editorConfiguration(node, editorKind)
    if (configuration) {
      configurations.set(node.id, configuration)
      if (configuration.kind === 'source') sourceIds.add(configuration.sourceId)
    }
    return { id: node.id, type: editorKind, label, detail, description }
  })

  const pipeline: PipelineView = {
    id: draft.pipelineId,
    metadata: { labels: {}, description: draft.description },
    sources: Array.from(sourceIds).map((id) => ({
      id,
      metadata: null,
      connector: null,
      resolved: false,
    })),
    transforms: [],
    view: null,
    serve: null,
    settings: null,
    experimental: null,
    dag: {
      nodes,
      edges: draft.graph.edges.map((edge) => ({ ...edge, label: null })),
    },
    contentHash: draft.publishedArtifactHash ?? `draft:${draft.revision}`,
    status: null,
  }
  return {
    editor: { pipeline, dag: pipeline.dag, configurations, descriptions },
    layout: { pipelineId: draft.pipelineId, nodes: positions, viewport: draft.graph.viewport },
    hasPublishedRevision: draft.publishedDraftRevision !== null,
  }
}

function draftNode(
  node: PipelineGraphDraft['dag']['nodes'][number],
  configuration: PipelineNodeConfiguration | undefined,
  description: string | undefined,
  position: PipelineLayoutPosition | undefined,
): PipelineDraftGraph['nodes'][number] {
  const metadata: PipelineJsonObject = {
    label: node.label,
    detail: node.detail,
    ...(description === undefined ? {} : { description }),
    ...(position ? { position } : {}),
  }
  if (!configuration) {
    return { id: node.id, type: node.type, config: {}, metadata }
  }
  if (configuration.kind === 'source') {
    return {
      id: node.id,
      type: 'source',
      sourceId: configuration.sourceId,
      table: configuration.table,
      config: {
        tables: sourceTableSelections(configuration),
        connectorId: configuration.connectorId,
      },
      metadata,
    }
  }
  if (configuration.kind === 'target') {
    return {
      id: node.id,
      type: 'target',
      sourceId: configuration.sourceId,
      table: configuration.table,
      config: {
        connectorId: configuration.connectorId,
        writeMode: configuration.writeMode,
        ...(configuration.tableMappings ? { tableMappings: configuration.tableMappings } : {}),
      },
      metadata,
    }
  }
  if (configuration.kind === 'view') {
    return {
      id: node.id,
      type: 'view',
      config: configuration.body,
      metadata: { ...metadata, editorKind: 'view', viewId: configuration.viewId },
    }
  }
  return {
    id: node.id,
    type: configuration.transformType,
    config: {
      ...configuration.body,
      ...(configuration.from === null || configuration.from === undefined
        ? {}
        : { from: configuration.from }),
      ...(configuration.options ? { options: configuration.options } : {}),
    },
    metadata: { ...metadata, editorKind: 'transform', stepId: configuration.stepId },
  }
}

function draftNodeKind(
  node: PipelineDraftGraph['nodes'][number],
): 'source' | 'transform' | 'view' | 'target' {
  const kind = text(node.metadata.editorKind)
  if (kind === 'transform' || kind === 'view') return kind
  if (node.type === 'source' || node.type === 'target' || node.type === 'view') return node.type
  return 'transform'
}

function editorConfiguration(
  node: PipelineDraftGraph['nodes'][number],
  kind: 'source' | 'transform' | 'view' | 'target',
): PipelineNodeConfiguration | null {
  if (kind === 'source') {
    const tables = tableSelections(node.config.tables, node.table)
    return {
      kind,
      nodeId: node.id,
      sourceId: node.sourceId ?? '',
      tables,
      table: tables[0]?.table ?? node.table ?? '',
      connectorId: text(node.config.connectorId),
    }
  }
  if (kind === 'target') {
    return {
      kind,
      nodeId: node.id,
      sourceId: node.sourceId ?? '',
      table: node.table ?? '',
      connectorId: text(node.config.connectorId),
      writeMode: text(node.config.writeMode) ?? 'upsert',
      ...(tableMappings(node.config.tableMappings)
        ? { tableMappings: tableMappings(node.config.tableMappings) }
        : {}),
    }
  }
  if (kind === 'view') {
    return {
      kind,
      nodeId: node.id,
      viewId: text(node.metadata.viewId) ?? node.id,
      from: null,
      body: node.config,
    }
  }
  const { from, options, ...body } = node.config
  return {
    kind,
    nodeId: node.id,
    stepId: text(node.metadata.stepId) ?? node.id,
    transformType: node.type,
    from: from ?? null,
    options: isObject(options) ? options : null,
    body,
  }
}

function tableSelections(value: unknown, fallback: string | null | undefined) {
  if (!Array.isArray(value)) return fallback ? [{ table: fallback }] : []
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.length > 0) return [{ table: item }]
    if (!isObject(item) || typeof item.table !== 'string' || item.table.length === 0) return []
    return [
      {
        table: item.table,
        ...(item.tableKind === 'regex' ? { tableKind: 'regex' as const } : {}),
      },
    ]
  })
}

function tableMappings(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const mappings = value.flatMap((item) => {
    if (
      !isObject(item) ||
      typeof item.sourceTable !== 'string' ||
      typeof item.targetTable !== 'string'
    ) {
      return []
    }
    return [{ sourceTable: item.sourceTable, targetTable: item.targetTable }]
  })
  return mappings.length > 0 ? mappings : undefined
}

function positionFrom(value: unknown): PipelineLayoutPosition | null {
  if (!isObject(value) || typeof value.x !== 'number' || typeof value.y !== 'number') return null
  return Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: value.x, y: value.y } : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isObject(value: unknown): value is PipelineJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
