import type {
  PipelineDag,
  PipelineDagEdge,
  PipelineDagNode,
  PipelineJsonObject,
  PipelineMutation,
  PipelineView,
} from '@/service/pipelines/pipeline-client'

import type { PipelineNodeChoice } from '../components/node-library/pipeline-node-library-types'
import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
} from './pipeline-node-model'

import { normalizePipelineDag } from '../components/canvas/pipeline-graph'
import { pipelineNodeConfigurations } from './pipeline-node-model'

export interface PipelineGraphDraft {
  pipeline: PipelineView
  dag: PipelineDag
  configurations: Map<string, PipelineNodeConfiguration>
  descriptions: Map<string, string>
}

export type PipelineGraphDiagnosticCode =
  | 'cycle'
  | 'dangling-edge'
  | 'isolated-node'
  | 'missing-configuration'
  | 'invalid-source-reference'

export interface PipelineGraphDiagnostic {
  code: PipelineGraphDiagnosticCode
  nodeIds: string[]
  messageKey: string
}

function cloneDag(dag: PipelineDag): PipelineDag {
  const normalized = normalizePipelineDag(dag)
  return {
    nodes: normalized.nodes.map((node) => ({ ...node })),
    edges: normalized.edges.map((edge) => ({ ...edge, label: null })),
  }
}

export function createPipelineGraphDraft(pipeline: PipelineView): PipelineGraphDraft {
  const dag = cloneDag(pipeline.dag)
  const configurations = pipelineNodeConfigurations({ ...pipeline, dag })
  const descriptions = new Map(
    dag.nodes.filter((node) => node.description).map((node) => [node.id, node.description ?? '']),
  )
  return { pipeline, dag, configurations, descriptions }
}

function nextDraftId(draft: PipelineGraphDraft, kind: PipelineDagNode['type']) {
  let index = 1
  while (draft.dag.nodes.some((node) => node.id === `draft:${kind}:${index}`)) index += 1
  return `draft:${kind}:${index}`
}

function nextNamedDraftId(draft: PipelineGraphDraft, kind: 'transform' | 'view', name: string) {
  let index = 1
  while (
    draft.dag.nodes.some((node) => node.id === `draft:${kind}:${name}_${index}`) ||
    Array.from(draft.configurations.values()).some(
      (configuration) =>
        (kind === 'transform' &&
          configuration.kind === 'transform' &&
          configuration.stepId === `${name}_${index}`) ||
        (kind === 'view' &&
          configuration.kind === 'view' &&
          configuration.viewId === `${name}_${index}`),
    )
  ) {
    index += 1
  }
  return `${name}_${index}`
}

function draftNodeForChoice(
  draft: PipelineGraphDraft,
  choice: PipelineNodeChoice,
): { node: PipelineDagNode; configuration: PipelineNodeConfiguration } {
  if (choice.kind === 'source') {
    const id = nextDraftId(draft, 'source')
    return {
      node: { id, type: 'source', label: choice.table, detail: choice.sourceId, description: null },
      configuration: {
        kind: 'source',
        nodeId: id,
        sourceId: choice.sourceId,
        table: choice.table,
        connectorId: choice.connectorId,
      },
    }
  }
  if (choice.kind === 'transform') {
    const stepId = nextNamedDraftId(draft, 'transform', choice.transformType)
    const id = `draft:transform:${stepId}`
    return {
      node: {
        id,
        type: 'transform',
        label: stepId,
        detail: choice.transformType,
        description: null,
      },
      configuration: {
        kind: 'transform',
        nodeId: id,
        stepId,
        transformType: choice.transformType,
        from: null,
        options: {},
        body: {},
      },
    }
  }
  if (choice.kind === 'view') {
    const viewId = nextNamedDraftId(draft, 'view', 'view')
    const id = `draft:view:${viewId}`
    return {
      node: { id, type: 'view', label: viewId, detail: 'view', description: null },
      configuration: { kind: 'view', nodeId: id, viewId, from: null, body: {} },
    }
  }
  const id = nextDraftId(draft, 'target')
  const sourceId = choice.sourceId ?? ''
  const table = choice.table ?? ''
  return {
    node: {
      id,
      type: 'target',
      label: table || 'New target',
      detail: sourceId || null,
      description: null,
    },
    configuration: {
      kind: 'target',
      nodeId: id,
      sourceId,
      table,
      connectorId: choice.connectorId ?? null,
      writeMode: 'upsert',
    },
  }
}

type PipelineNodeInsertEdge = { id: string; source: string; target: string }

/** Legacy overload: the fifth argument was the edge being replaced. */
export function addPipelineNode(
  draft: PipelineGraphDraft,
  choice: PipelineNodeChoice,
  position?: { x: number; y: number },
  connectFrom?: string,
  insertEdge?: PipelineNodeInsertEdge,
): {
  nodeId: string
  position: { x: number; y: number } | null
  draft: PipelineGraphDraft
}
/** Directional overload: connect from the output and/or into the input. */
export function addPipelineNode(
  draft: PipelineGraphDraft,
  choice: PipelineNodeChoice,
  position?: { x: number; y: number },
  connectFrom?: string,
  connectTo?: string,
  insertEdge?: PipelineNodeInsertEdge,
): {
  nodeId: string
  position: { x: number; y: number } | null
  draft: PipelineGraphDraft
}
export function addPipelineNode(
  draft: PipelineGraphDraft,
  choice: PipelineNodeChoice,
  position?: { x: number; y: number },
  connectFrom?: string,
  connectToOrInsertEdge?: string | PipelineNodeInsertEdge,
  insertEdge?: PipelineNodeInsertEdge,
) {
  // The object form preserves callers compiled against the old fifth
  // argument while the string form is the new input-side connection target.
  const connectTo = typeof connectToOrInsertEdge === 'string' ? connectToOrInsertEdge : undefined
  const edgeToInsert =
    typeof connectToOrInsertEdge === 'object' ? connectToOrInsertEdge : insertEdge
  const { node, configuration } = draftNodeForChoice(draft, choice)
  const nodeId = node.id
  const sourceNode = connectFrom
    ? draft.dag.nodes.find((candidate) => candidate.id === connectFrom)
    : undefined
  const targetNode = connectTo
    ? draft.dag.nodes.find((candidate) => candidate.id === connectTo)
    : undefined
  const canConnectFrom = Boolean(
    sourceNode &&
    !draft.dag.edges.some((edge) => edge.source === connectFrom && edge.target === nodeId),
  )
  const canConnectTo = Boolean(
    targetNode &&
    !draft.dag.edges.some((edge) => edge.source === nodeId && edge.target === connectTo),
  )
  const edgeToReplace = edgeToInsert
    ? draft.dag.edges.find(
        (edge) =>
          edge.id === edgeToInsert.id &&
          edge.source === edgeToInsert.source &&
          edge.target === edgeToInsert.target,
      )
    : undefined
  const automaticEdgeToReplace =
    !edgeToReplace && isIntermediateChoice(choice)
      ? edgeForDirectionalInsertion(draft.dag.edges, connectFrom, connectTo)
      : undefined
  const edgeToRewrite = edgeToReplace ?? automaticEdgeToReplace
  const edges = edgeToRewrite
    ? [
        ...draft.dag.edges.filter((edge) => edge.id !== edgeToRewrite.id),
        {
          id: `edge:${edgeToRewrite.source}:${nodeId}`,
          source: edgeToRewrite.source,
          target: nodeId,
          label: null,
        },
        {
          id: `edge:${nodeId}:${edgeToRewrite.target}`,
          source: nodeId,
          target: edgeToRewrite.target,
          label: null,
        },
      ]
    : [
        ...draft.dag.edges,
        ...(canConnectFrom
          ? [
              {
                id: `edge:${connectFrom}:${nodeId}`,
                source: connectFrom!,
                target: nodeId,
                label: null,
              },
            ]
          : []),
        ...(canConnectTo
          ? [
              {
                id: `edge:${nodeId}:${connectTo}`,
                source: nodeId,
                target: connectTo!,
                label: null,
              },
            ]
          : []),
      ]
  const configurations = new Map(draft.configurations)
  configurations.set(nodeId, configuration)
  return {
    nodeId,
    position: position ?? null,
    draft: { ...draft, dag: { nodes: [...draft.dag.nodes, node], edges }, configurations },
  }
}

function isIntermediateChoice(choice: PipelineNodeChoice) {
  return choice.kind === 'transform' || choice.kind === 'view'
}

/**
 * A node-side add action is an insertion when the selected side already has
 * one continuation. Rewriting that single edge keeps the graph linear and,
 * importantly, makes the downstream serve target derive from the new step.
 * Fan-out remains explicit and is never silently rewritten.
 */
function edgeForDirectionalInsertion(
  edges: readonly PipelineNodeInsertEdge[],
  connectFrom?: string,
  connectTo?: string,
) {
  if (connectFrom && !connectTo) {
    const outgoing = edges.filter((edge) => edge.source === connectFrom)
    return outgoing.length === 1 ? outgoing[0] : undefined
  }
  if (connectTo && !connectFrom) {
    const incoming = edges.filter((edge) => edge.target === connectTo)
    return incoming.length === 1 ? incoming[0] : undefined
  }
  return undefined
}

export function removePipelineNode(draft: PipelineGraphDraft, nodeId: string): PipelineGraphDraft {
  const configurations = new Map(draft.configurations)
  configurations.delete(nodeId)
  const descriptions = new Map(draft.descriptions)
  descriptions.delete(nodeId)
  return {
    ...draft,
    dag: {
      nodes: draft.dag.nodes.filter((node) => node.id !== nodeId),
      edges: draft.dag.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    },
    configurations,
    descriptions,
  }
}

export function updatePipelineNodeConfiguration(
  draft: PipelineGraphDraft,
  change: PipelineNodeConfigurationChange,
): PipelineGraphDraft {
  const current = draft.configurations.get(change.nodeId)
  if (!current || current.kind !== change.kind) return draft
  const next = mergeConfiguration(current, change)
  const configurations = new Map(draft.configurations).set(change.nodeId, next)
  const node = draft.dag.nodes.find((candidate) => candidate.id === change.nodeId)
  if (!node) return { ...draft, configurations }
  const nextNode = {
    ...node,
    label: labelForConfiguration(next, node.label),
    detail: detailForConfiguration(next, node.detail),
  }
  return {
    ...draft,
    configurations,
    dag: {
      ...draft.dag,
      nodes: draft.dag.nodes.map((candidate) => (candidate.id === node.id ? nextNode : candidate)),
    },
  }
}

function mergeConfiguration(
  configuration: PipelineNodeConfiguration,
  change: PipelineNodeConfigurationChange,
): PipelineNodeConfiguration {
  if (configuration.kind === 'source')
    return {
      ...configuration,
      sourceId: stringValue(change.values.sourceId, configuration.sourceId),
      table: stringValue(change.values.table, configuration.table),
      filter: stringValue(change.values.filter, configuration.filter ?? ''),
    }
  if (configuration.kind === 'target')
    return {
      ...configuration,
      sourceId: stringValue(change.values.sourceId, configuration.sourceId),
      table: stringValue(change.values.table, configuration.table),
      writeMode: stringValue(change.values.writeMode, configuration.writeMode),
    }
  if (configuration.kind === 'transform') {
    const { from, options, ...body } = change.values
    return {
      ...configuration,
      from: from === undefined ? configuration.from : from,
      options: options === undefined ? configuration.options : isRecord(options) ? options : null,
      body: { ...configuration.body, ...body },
    }
  }
  const { from, ...body } = change.values
  return {
    ...configuration,
    from: from === undefined ? configuration.from : from,
    body: { ...configuration.body, ...body },
  }
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}
function isRecord(value: unknown): value is PipelineJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function labelForConfiguration(configuration: PipelineNodeConfiguration, fallback: string) {
  if (configuration.kind === 'source' || configuration.kind === 'target')
    return configuration.table || fallback
  if (configuration.kind === 'transform') return configuration.stepId || fallback
  return configuration.viewId || fallback
}
function detailForConfiguration(configuration: PipelineNodeConfiguration, fallback: string | null) {
  return configuration.kind === 'transform' ? configuration.transformType : fallback
}

export function validatePipelineGraph(
  draft: PipelineGraphDraft,
  availableSourceIds?: readonly string[],
): PipelineGraphDiagnostic[] {
  const diagnostics: PipelineGraphDiagnostic[] = []
  const nodes = new Map(draft.dag.nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const edge of draft.dag.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      diagnostics.push({
        code: 'dangling-edge',
        nodeIds: [edge.source, edge.target],
        messageKey: 'pipelines.workspace.diagnostics.danglingEdge',
      })
      continue
    }
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1)
  }
  const state = new Map<string, number>()
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true
    if (state.get(id) === 2) return false
    state.set(id, 1)
    for (const edge of draft.dag.edges.filter((candidate) => candidate.source === id)) {
      if (nodes.has(edge.target) && visit(edge.target)) return true
    }
    state.set(id, 2)
    return false
  }
  for (const node of nodes.values()) {
    if (visit(node.id)) {
      diagnostics.push({
        code: 'cycle',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.cycle',
      })
      break
    }
  }
  // PipelineView.sources contains declared input Sources only. Sink Sources
  // referenced by serve.sync are resolved from the workspace Source catalog,
  // so include that catalog when it has been loaded. Keep the configuration
  // fallback for callers that validate a draft before the catalog request
  // completes (for example, isolated model tests and offline editing).
  const serveSourceIds = [
    ...(draft.pipeline.serve?.sync ?? []),
    ...(draft.pipeline.serve?.push ?? []),
  ]
    .filter(isRecord)
    .map((item) => item.source)
    .filter((source): source is string => typeof source === 'string' && source.length > 0)
  const sourceIds = new Set([
    ...(draft.pipeline.sources ?? []).map((source) => source.id),
    ...serveSourceIds,
    ...(availableSourceIds ?? []),
    ...(availableSourceIds
      ? []
      : Array.from(draft.configurations.values())
          .filter(
            (
              configuration,
            ): configuration is Extract<PipelineNodeConfiguration, { kind: 'source' }> =>
              configuration.kind === 'source' && Boolean(configuration.sourceId),
          )
          .map((configuration) => configuration.sourceId)),
  ])
  for (const node of nodes.values()) {
    const config = draft.configurations.get(node.id)
    if (!config) {
      diagnostics.push({
        code: 'missing-configuration',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.missingConfiguration',
      })
      continue
    }
    if (
      (config.kind === 'source' || config.kind === 'target') &&
      (!config.sourceId || !config.table)
    ) {
      diagnostics.push({
        code: 'missing-configuration',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.missingConfiguration',
      })
    }
    if (
      (config.kind === 'source' || config.kind === 'target') &&
      config.sourceId &&
      !sourceIds.has(config.sourceId)
    ) {
      diagnostics.push({
        code: 'invalid-source-reference',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.invalidSourceReference',
      })
    }
    const hasIncoming = (incoming.get(node.id) ?? 0) > 0
    if (
      (config.kind === 'transform' || config.kind === 'view') &&
      config.from == null &&
      !hasIncoming
    ) {
      diagnostics.push({
        code: 'missing-configuration',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.missingConfiguration',
      })
    }
    const isolated = (incoming.get(node.id) ?? 0) === 0 && (outgoing.get(node.id) ?? 0) === 0
    if (isolated && node.type !== 'source')
      diagnostics.push({
        code: 'isolated-node',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.isolatedNode',
      })
  }
  return diagnostics
}

export function buildPipelineMutation(draft: PipelineGraphDraft): PipelineMutation {
  const activeIds = new Set(draft.dag.nodes.map((node) => node.id))
  const sourceConfigs = draft.dag.nodes
    .map((node) => draft.configurations.get(node.id))
    .filter((config): config is Extract<PipelineNodeConfiguration, { kind: 'source' }> =>
      Boolean(
        config && config.kind === 'source' && activeIds.has(config.nodeId) && config.sourceId,
      ),
    )
  const sourceIds =
    sourceConfigs.length > 0
      ? Array.from(new Set(sourceConfigs.map((config) => config.sourceId)))
      : Array.from(new Set((draft.pipeline.sources ?? []).map((source) => source.id)))
  const nodeById = new Map(draft.dag.nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, string[]>()
  for (const edge of draft.dag.edges) {
    const refs = incoming.get(edge.target) ?? []
    refs.push(edge.source)
    incoming.set(edge.target, refs)
  }
  const transforms = draft.dag.nodes
    .map((node) => draft.configurations.get(node.id))
    .filter((config): config is Extract<PipelineNodeConfiguration, { kind: 'transform' }> =>
      Boolean(config && config.kind === 'transform'),
    )
    .map((config) => ({
      id: config.stepId,
      from: deriveOrConfiguredFrom(
        config,
        incoming.get(config.nodeId) ?? [],
        nodeById,
        draft.configurations,
      ),
      type: config.transformType,
      ...config.body,
      ...(config.options === null ? {} : { options: config.options }),
    }))
  const viewConfig = Array.from(draft.configurations.values()).find(
    (config): config is Extract<PipelineNodeConfiguration, { kind: 'view' }> =>
      config.kind === 'view',
  )
  const view = viewConfig
    ? {
        ...draft.pipeline.view,
        id: viewConfig.viewId,
        from: deriveOrConfiguredFrom(
          viewConfig,
          incoming.get(viewConfig.nodeId) ?? [],
          nodeById,
          draft.configurations,
        ),
        ...viewConfig.body,
      }
    : (draft.pipeline.view ?? null)
  const existingSync = Array.isArray(draft.pipeline.serve?.sync) ? draft.pipeline.serve.sync : []
  const serveSourceTable = tableFromReference(draft.pipeline.serve?.from)
  const targets = draft.dag.nodes
    .map((node) => draft.configurations.get(node.id))
    .filter((config): config is Extract<PipelineNodeConfiguration, { kind: 'target' }> =>
      Boolean(config && config.kind === 'target' && config.sourceId && config.table),
    )
    .map((config) => {
      const sourceTable =
        serveSourceTable ??
        tableFromTargetUpstream(config.nodeId, nodeById, draft.dag.edges, draft.configurations)
      const existing = existingSync.find(
        (item) =>
          isRecord(item) &&
          item.source === config.sourceId &&
          targetTable(item, sourceTable) === config.table,
      )
      const existingId =
        isRecord(existing) && typeof existing.id === 'string'
          ? existing.id
          : `${config.sourceId}_${config.table}`
      const rename = syncRename(existing, sourceTable, config.table)
      return {
        ...(isRecord(existing) ? existing : {}),
        id: existingId,
        source: config.sourceId,
        writeMode: config.writeMode,
        ...(rename === undefined ? { rename: undefined } : { rename }),
      }
    })
  let serve = draft.pipeline.serve
    ? { ...draft.pipeline.serve, sync: targets }
    : targets.length
      ? { id: 'serve', from: deriveServeFrom(targets, draft), sync: targets }
      : null
  if (serve) {
    const derivedServeFrom = deriveServeFrom(targets, draft)
    if (derivedServeFrom) serve = { ...serve, from: derivedServeFrom }
  }
  return {
    id: draft.pipeline.id,
    metadata: draft.pipeline.metadata ?? null,
    sources: sourceIds,
    transforms,
    view,
    serve,
    settings: draft.pipeline.settings ?? null,
    experimental: draft.pipeline.experimental ?? null,
  }
}

function targetTable(value: PipelineJsonObject, sourceTable?: string | null) {
  if (typeof value.rename === 'string') return value.rename
  if (isRecord(value.rename)) {
    const mapped =
      isRecord(value.rename.map) && sourceTable ? value.rename.map[sourceTable] : undefined
    if (typeof mapped === 'string') return mapped
    if (sourceTable) return applyRename(sourceTable, value.rename)
  }
  if (typeof value.table === 'string') return value.table
  return typeof value.from === 'string' ? value.from : null
}

function tableFromReference(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const separator = value.lastIndexOf('.')
  return separator >= 0 ? value.slice(separator + 1) : value
}

function tableFromTargetUpstream(
  targetNodeId: string,
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  edges: readonly PipelineDagEdge[],
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const edge = edges.find((candidate) => candidate.target === targetNodeId)
  if (!edge) return null
  return tableFromReference(referenceForNode(edge.source, nodeById, configurations))
}

function syncRename(
  existing: PipelineJsonObject | undefined,
  sourceTable: string | null,
  targetTableName: string,
) {
  if (!sourceTable || !targetTableName || sourceTable === targetTableName) return undefined
  const previous = existing && isRecord(existing.rename) ? existing.rename : {}
  const map = isRecord(previous.map) ? { ...previous.map } : {}
  map[sourceTable] = targetTableName
  return { ...previous, map }
}

function applyRename(sourceTable: string, rename: PipelineJsonObject) {
  const explicit = isRecord(rename.map) ? rename.map[sourceTable] : undefined
  if (typeof explicit === 'string') return explicit
  let transformed = sourceTable
  switch (rename.case) {
    case 'upper':
      transformed = transformed.toLocaleUpperCase()
      break
    case 'lower':
      transformed = transformed.toLocaleLowerCase()
      break
    default:
      break
  }
  return `${typeof rename.prefix === 'string' ? rename.prefix : ''}${transformed}${typeof rename.suffix === 'string' ? rename.suffix : ''}`
}

function deriveFrom(
  configuration: Extract<PipelineNodeConfiguration, { kind: 'transform' | 'view' }>,
  upstreamIds: string[],
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const refs = upstreamIds
    .map((id) => referenceForNode(id, nodeById, configurations))
    .filter(Boolean) as string[]
  if (refs.length === 0) return null
  if (
    configuration.kind === 'transform' &&
    ['nest', 'join'].includes(configuration.transformType)
  ) {
    const aliases = isRecord(configuration.body.aliases)
      ? Object.keys(configuration.body.aliases)
      : []
    return Object.fromEntries(
      refs.map((ref, index) => [aliases[index] ?? `input_${index + 1}`, ref]),
    )
  }
  return refs.length === 1 ? refs[0] : refs
}

function deriveOrConfiguredFrom(
  configuration: Extract<PipelineNodeConfiguration, { kind: 'transform' | 'view' }>,
  upstreamIds: string[],
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const derived = deriveFrom(configuration, upstreamIds, nodeById, configurations)
  return derived ?? configuration.from ?? null
}

function referenceForNode(
  id: string,
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const node = nodeById.get(id)
  const configuration = configurations.get(id)
  if (!node) return null
  if (configuration?.kind === 'source' && configuration.sourceId && configuration.table) {
    return `${configuration.sourceId}.${configuration.table}`
  }
  if (node.type === 'transform')
    return configuration?.kind === 'transform' ? configuration.stepId : node.label
  if (node.type === 'view')
    return configuration?.kind === 'view' ? configuration.viewId : node.label
  return node.label || null
}

function deriveServeFrom(targets: PipelineJsonObject[], draft: PipelineGraphDraft) {
  if (targets.length === 0) return ''
  const nodeById = new Map(draft.dag.nodes.map((node) => [node.id, node]))
  const refs = draft.dag.nodes
    .filter((node) => node.type === 'target')
    .map((targetNode) => {
      const edge = draft.dag.edges.find((candidate) => candidate.target === targetNode.id)
      return edge ? referenceForNode(edge.source, nodeById, draft.configurations) : null
    })
    .filter((value): value is string => Boolean(value))
  return refs[0] ?? ''
}
