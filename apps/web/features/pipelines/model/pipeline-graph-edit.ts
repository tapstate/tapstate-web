import type {
  PipelineDag,
  PipelineDagEdge,
  PipelineDagNode,
  PipelineJsonObject,
  PipelineMutation,
  PipelineView,
} from '@/service/pipelines/pipeline-client'
import type { ConnectorSummary } from '@/service/source-client'

import type { PipelineNodeChoice } from '../components/node-library/pipeline-node-library-types'
import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
} from './pipeline-node-model'

import { normalizePipelineDag } from '../components/canvas/pipeline-graph'
import {
  isPipelineOnFullLoad,
  pipelineNodeConfigurations,
  sourceTableSelections,
  type PipelineSourceTableSelection,
  type PipelineTargetTableMapping,
} from './pipeline-node-model'
import { isPipelineDagEdgeValid } from './pipeline-node-rules'
import {
  isTargetConnector,
  type SourceIdentity,
  type TargetConnectorPolicy,
} from './pipeline-target-connectors'

export interface PipelineGraphDraft {
  pipeline: PipelineView
  dag: PipelineDag
  configurations: Map<string, PipelineNodeConfiguration>
  descriptions: Map<string, string>
}

export type PipelineGraphDiagnosticCode =
  | 'cycle'
  | 'dangling-edge'
  | 'invalid-edge'
  | 'isolated-node'
  | 'missing-configuration'
  | 'invalid-source-reference'
  | 'unsupported-target-connector'

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
  const rawDag = cloneDag(pipeline.dag)
  const rawConfigurations = pipelineNodeConfigurations({ ...pipeline, dag: rawDag })
  const rawDescriptions = new Map(
    rawDag.nodes
      .filter((node) => node.description)
      .map((node) => [node.id, node.description ?? '']),
  )
  return collapseSourceNodes(pipeline, rawDag, rawConfigurations, rawDescriptions)
}

function collapseSourceNodes(
  pipeline: PipelineView,
  dag: PipelineDag,
  configurations: Map<string, PipelineNodeConfiguration>,
  descriptions: Map<string, string>,
): PipelineGraphDraft {
  const sourceGroups = new Map<string, PipelineDagNode[]>()
  for (const node of dag.nodes) {
    if (node.type !== 'source') continue
    const configuration = configurations.get(node.id)
    if (configuration?.kind !== 'source') continue
    const group = sourceGroups.get(configuration.sourceId) ?? []
    group.push(node)
    sourceGroups.set(configuration.sourceId, group)
  }

  let nextDag = dag
  const nextConfigurations = new Map(configurations)
  const nextDescriptions = new Map(descriptions)
  for (const nodes of sourceGroups.values()) {
    if (nodes.length < 2) continue
    const primary = nodes[0]!
    const sourceConfigurations = nodes
      .map((node) => nextConfigurations.get(node.id))
      .filter(
        (configuration): configuration is Extract<PipelineNodeConfiguration, { kind: 'source' }> =>
          configuration?.kind === 'source',
      )
    const tables = sourceConfigurations.flatMap((configuration) =>
      sourceTableSelections(configuration),
    )
    const primaryConfiguration = sourceConfigurations[0]
    if (!primaryConfiguration || tables.length === 0) continue
    nextConfigurations.set(primary.id, {
      ...primaryConfiguration,
      tables,
      table: tables[0]!.table,
      ...(tables[0]!.tableKind === 'regex' ? { tableKind: 'regex' as const } : {}),
    })
    nextDag = {
      nodes: nextDag.nodes
        .filter((node) => !nodes.slice(1).some((removed) => removed.id === node.id))
        .map((node) =>
          node.id === primary.id
            ? { ...node, label: sourceNodeLabel(tables), detail: primaryConfiguration.sourceId }
            : node,
        ),
      edges: dedupeEdges(
        nextDag.edges.map((edge) => ({
          ...edge,
          source: nodes.some((sourceNode) => sourceNode.id === edge.source)
            ? primary.id
            : edge.source,
        })),
      ),
    }
    for (const removed of nodes.slice(1)) {
      nextConfigurations.delete(removed.id)
      nextDescriptions.delete(removed.id)
    }
  }
  return {
    pipeline,
    dag: nextDag,
    configurations: nextConfigurations,
    descriptions: nextDescriptions,
  }
}

function dedupeEdges(edges: PipelineDagEdge[]) {
  const seen = new Set<string>()
  return edges.filter((edge) => {
    const key = `${edge.source}:${edge.target}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
    const tables = choice.tables?.length
      ? choice.tables.map((selection) => ({ ...selection }))
      : [{ table: choice.table, ...(choice.tableKind ? { tableKind: choice.tableKind } : {}) }]
    const primaryTable = tables[0]?.table ?? choice.table
    return {
      node: {
        id,
        type: 'source',
        label: sourceNodeLabel(tables),
        detail: choice.sourceId,
        description: null,
      },
      configuration: {
        kind: 'source',
        nodeId: id,
        sourceId: choice.sourceId,
        tables,
        table: primaryTable,
        ...(tables[0]?.tableKind === 'regex' ? { tableKind: 'regex' as const } : {}),
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
  const candidateEdgeToRewrite = edgeToReplace ?? automaticEdgeToReplace
  const rewriteSourceNode = candidateEdgeToRewrite
    ? draft.dag.nodes.find((candidate) => candidate.id === candidateEdgeToRewrite.source)
    : sourceNode
  const rewriteTargetNode = candidateEdgeToRewrite
    ? draft.dag.nodes.find((candidate) => candidate.id === candidateEdgeToRewrite.target)
    : targetNode
  const rewriteEdges = candidateEdgeToRewrite
    ? draft.dag.edges.filter((edge) => edge.id !== candidateEdgeToRewrite.id)
    : draft.dag.edges
  const canRewrite = Boolean(
    candidateEdgeToRewrite &&
    rewriteSourceNode &&
    rewriteTargetNode &&
    isPipelineDagEdgeValid(rewriteSourceNode, node, rewriteEdges) &&
    isPipelineDagEdgeValid(node, rewriteTargetNode, rewriteEdges),
  )
  const edgeToRewrite = canRewrite ? candidateEdgeToRewrite : undefined
  const canConnectFrom = Boolean(
    sourceNode && isPipelineDagEdgeValid(sourceNode, node, draft.dag.edges),
  )
  const canConnectTo = Boolean(
    targetNode && isPipelineDagEdgeValid(node, targetNode, draft.dag.edges),
  )
  const edges = edgeToRewrite
    ? draft.dag.edges.flatMap((edge) =>
        edge.id === edgeToRewrite.id
          ? [
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
          : [edge],
      )
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

/**
 * Inserts choices into the graph. Multiple Source choices from the same Source
 * are intentionally folded into one node: the table set belongs to that node,
 * not to a collection of visually duplicated Source nodes.
 */
export function addPipelineNodes(
  draft: PipelineGraphDraft,
  choices: readonly PipelineNodeChoice[],
  position?: { x: number; y: number },
  connectFrom?: string,
  connectTo?: string,
  insertEdge?: PipelineNodeInsertEdge,
  insertionMode: 'insert' | 'append' = 'insert',
) {
  const normalizedChoices = combineSourceChoices(choices)
  let nextDraft = draft
  const nodeIds: string[] = []
  const positions: Record<string, { x: number; y: number }> = {}

  normalizedChoices.forEach((choice, index) => {
    const nextPosition = position
    const result =
      insertionMode === 'append'
        ? addPipelineNode(nextDraft, choice, nextPosition)
        : addPipelineNode(
            nextDraft,
            choice,
            nextPosition,
            connectFrom,
            connectTo,
            index === 0 ? insertEdge : undefined,
          )
    nextDraft = result.draft
    if (insertionMode === 'append' && connectFrom) {
      const sourceNode = nextDraft.dag.nodes.find((node) => node.id === connectFrom)
      const targetNode = nextDraft.dag.nodes.find((node) => node.id === result.nodeId)
      if (
        sourceNode &&
        targetNode &&
        isPipelineDagEdgeValid(sourceNode, targetNode, nextDraft.dag.edges)
      ) {
        nextDraft = {
          ...nextDraft,
          dag: {
            ...nextDraft.dag,
            edges: [
              ...nextDraft.dag.edges,
              {
                id: `edge:${connectFrom}:${result.nodeId}`,
                source: connectFrom,
                target: result.nodeId,
                label: null,
              },
            ],
          },
        }
      }
    }
    nodeIds.push(result.nodeId)
    if (nextPosition) positions[result.nodeId] = nextPosition
  })

  return { draft: nextDraft, nodeIds, positions }
}

function combineSourceChoices(choices: readonly PipelineNodeChoice[]) {
  const sourceChoices = choices.filter((choice) => choice.kind === 'source')
  if (
    choices.length <= 1 ||
    sourceChoices.length !== choices.length ||
    new Set(sourceChoices.map((choice) => choice.sourceId)).size !== 1
  ) {
    return choices
  }

  const first = sourceChoices[0]!
  const tables = sourceChoices.flatMap((choice) =>
    choice.tables?.length
      ? choice.tables
      : [{ table: choice.table, ...(choice.tableKind ? { tableKind: choice.tableKind } : {}) }],
  )
  return [
    {
      ...first,
      tables,
    },
  ] satisfies PipelineNodeChoice[]
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
  const defaultLabel =
    current.kind === 'source' ? 'Source' : current.kind === 'target' ? 'New target' : node.label
  const previousGeneratedLabel = labelForConfiguration(current, defaultLabel)
  const hasCustomLabel = node.label !== previousGeneratedLabel
  const nextNode = {
    ...node,
    label: hasCustomLabel ? node.label : labelForConfiguration(next, defaultLabel),
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
  if (configuration.kind === 'source') {
    const nextSourceId = stringValue(change.values.sourceId, configuration.sourceId)
    const nextTables = sourceTableSelectionsFromValue(change.values.tables)
    const fallbackTable = stringValue(change.values.table, configuration.table)
    const tables = nextTables.length
      ? nextTables
      : typeof change.values.tables === 'object'
        ? []
        : [
            {
              table: fallbackTable,
              ...(typeof change.values.tableKind === 'string'
                ? { tableKind: change.values.tableKind as 'literal' | 'regex' }
                : isRegexReference(fallbackTable)
                  ? { tableKind: 'regex' as const }
                  : {}),
            },
          ]
    return {
      ...configuration,
      sourceId: nextSourceId,
      tables,
      table: tables[0]?.table ?? fallbackTable,
      ...(tables[0]?.tableKind === 'regex' || isRegexReference(tables[0]?.table ?? '')
        ? { tableKind: 'regex' as const }
        : {}),
    }
  }
  if (configuration.kind === 'target') {
    const tableMappings = Array.isArray(change.values.tableMappings)
      ? targetMappingsFromValue(change.values.tableMappings)
      : configuration.tableMappings
    return {
      ...configuration,
      sourceId: stringValue(change.values.sourceId, configuration.sourceId),
      table:
        tableMappings?.[0]?.targetTable ?? stringValue(change.values.table, configuration.table),
      ...(Array.isArray(change.values.tableMappings) ? { tableMappings } : {}),
      writeMode: stringValue(change.values.writeMode, configuration.writeMode),
      // Only a policy the person picked is written; a target that never chose one keeps saying nothing.
      ...(isPipelineOnFullLoad(change.values.onFullLoad)
        ? { onFullLoad: change.values.onFullLoad }
        : {}),
    }
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

function sourceTableSelectionsFromValue(value: unknown): PipelineSourceTableSelection[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.length > 0) {
      return [{ table: item, ...(isRegexReference(item) ? { tableKind: 'regex' as const } : {}) }]
    }
    if (!isRecord(item) || typeof item.table !== 'string' || item.table.length === 0) return []
    return [
      {
        table: item.table,
        ...(item.tableKind === 'regex' || isRegexReference(item.table)
          ? { tableKind: 'regex' as const }
          : {}),
      },
    ]
  })
}

function targetMappingsFromValue(value: unknown): PipelineTargetTableMapping[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.sourceTable !== 'string') return []
    if (typeof item.targetTable !== 'string') return []
    return [{ sourceTable: item.sourceTable, targetTable: item.targetTable }]
  })
}

function isRecord(value: unknown): value is PipelineJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sourceNodeLabel(tables: readonly PipelineSourceTableSelection[]) {
  const first = tables[0]
  if (!first) return 'Source'
  const firstLabel = first.tableKind === 'regex' ? regexReference(first.table) : first.table
  return tables.length > 1 ? `${firstLabel} +${tables.length - 1}` : firstLabel
}

function labelForConfiguration(configuration: PipelineNodeConfiguration, fallback: string) {
  if (configuration.kind === 'source') return sourceNodeLabel(sourceTableSelections(configuration))
  if (configuration.kind === 'target') return configuration.table || fallback
  if (configuration.kind === 'transform') return configuration.stepId || fallback
  return configuration.viewId || fallback
}
function detailForConfiguration(configuration: PipelineNodeConfiguration, fallback: string | null) {
  return configuration.kind === 'transform' ? configuration.transformType : fallback
}

/**
 * `availableSources` is the workspace Source catalog. A bare id says the Source exists and
 * nothing more; a `SourceIdentity` also says which connector it goes through, which is what
 * decides whether it may sit under a target node. A caller that passes only ids therefore gets
 * the reference checks and not the connector one -- the same deferral the catalog's own absence
 * gets, rather than a verdict drawn from data nobody supplied.
 */
export function validatePipelineGraph(
  draft: PipelineGraphDraft,
  availableSources?: readonly (string | SourceIdentity)[],
  connectorCatalog: readonly ConnectorSummary[] = [],
  targetPolicy: TargetConnectorPolicy = { profile: 'on-prem', localDevelopment: false },
): PipelineGraphDiagnostic[] {
  const diagnostics: PipelineGraphDiagnostic[] = []
  const availableSourceIds = availableSources?.map((source) =>
    typeof source === 'string' ? source : source.id,
  )
  const connectorBySourceId = new Map(
    (availableSources ?? [])
      .filter((source): source is SourceIdentity => typeof source !== 'string')
      .map((source) => [source.id, source.connector] as const),
  )
  const nodes = new Map(draft.dag.nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const edge of draft.dag.edges) {
    const sourceNode = nodes.get(edge.source)
    const targetNode = nodes.get(edge.target)
    if (!sourceNode || !targetNode) {
      diagnostics.push({
        code: 'dangling-edge',
        nodeIds: [edge.source, edge.target],
        messageKey: 'pipelines.workspace.diagnostics.danglingEdge',
      })
      continue
    }
    if (
      !isPipelineDagEdgeValid(sourceNode, targetNode, draft.dag.edges, {
        ignoreEdgeId: edge.id,
      })
    ) {
      diagnostics.push({
        code: 'invalid-edge',
        nodeIds: [edge.source, edge.target],
        messageKey: 'pipelines.workspace.diagnostics.invalidEdge',
      })
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
      (!config.sourceId ||
        (config.kind === 'source' ? sourceTableSelections(config).length === 0 : !config.table))
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
    // A target must resolve to a connector declared sink-capable in the catalog. The server repeats
    // this check before publication; unknown metadata is never treated as proof of sink support.
    if (
      config.kind === 'target' &&
      config.sourceId &&
      connectorBySourceId.has(config.sourceId) &&
      !isTargetConnector(connectorBySourceId.get(config.sourceId), connectorCatalog, targetPolicy)
    ) {
      diagnostics.push({
        code: 'unsupported-target-connector',
        nodeIds: [node.id],
        messageKey: 'pipelines.workspace.diagnostics.unsupportedTargetConnector',
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
        ...(viewConfig.writeMode ? { writeMode: viewConfig.writeMode } : {}),
        ...(viewConfig.onFullLoad ? { onFullLoad: viewConfig.onFullLoad } : {}),
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
      const upstreamTables = sourceTablesFromTargetUpstream(
        config.nodeId,
        nodeById,
        draft.dag.edges,
        draft.configurations,
      )
      const sourceTable =
        upstreamTables[0] ??
        serveSourceTable ??
        tableFromTargetUpstream(config.nodeId, nodeById, draft.dag.edges, draft.configurations)
      const mappings = targetMappingsForConfiguration(config, upstreamTables, sourceTable)
      const primaryTargetTable = mappings[0]?.targetTable ?? config.table
      const originalTargetTable = tableFromTargetNodeId(config.nodeId)
      const existing = existingSync.find(
        (item) =>
          isRecord(item) &&
          item.source === config.sourceId &&
          (targetTable(item, sourceTable) === primaryTargetTable ||
            targetTable(item, sourceTable) === originalTargetTable ||
            targetTable(item, originalTargetTable) === primaryTargetTable ||
            targetTable(item, originalTargetTable) === originalTargetTable),
      )
      const existingId =
        isRecord(existing) && typeof existing.id === 'string'
          ? existing.id
          : `${config.sourceId}_${primaryTargetTable}`
      const rename = syncRenameMappings(existing, mappings)
      return {
        ...(isRecord(existing) ? existing : {}),
        id: existingId,
        source: config.sourceId,
        writeMode: config.writeMode,
        ...(config.onFullLoad ? { onFullLoad: config.onFullLoad } : {}),
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

function tableFromTargetNodeId(nodeId: string) {
  const [, , ...parts] = nodeId.split(':')
  return parts.join(':') || null
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

function syncRenameMappings(
  existing: PipelineJsonObject | undefined,
  mappings: readonly PipelineTargetTableMapping[],
) {
  const previous = existing && isRecord(existing.rename) ? existing.rename : {}
  const map = isRecord(previous.map) ? { ...previous.map } : {}
  let changed = false
  for (const mapping of mappings) {
    if (
      !mapping.sourceTable ||
      !mapping.targetTable ||
      mapping.sourceTable === mapping.targetTable
    ) {
      continue
    }
    map[mapping.sourceTable] = mapping.targetTable
    changed = true
  }
  if (!changed) return undefined
  return { ...previous, map }
}

function sourceTablesFromTargetUpstream(
  targetNodeId: string,
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  edges: readonly PipelineDagEdge[],
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const visited = new Set<string>()
  const walk = (nodeId: string): string[] => {
    if (visited.has(nodeId)) return []
    visited.add(nodeId)
    const upstream = configurations.get(nodeId)
    if (upstream?.kind === 'source') {
      return sourceTableSelections(upstream).map(({ table }) => table)
    }
    return edges
      .filter((edge) => edge.target === nodeId)
      .flatMap((edge) => {
        const upstreamNode = nodeById.get(edge.source)
        if (upstreamNode?.type === 'source') return walk(edge.source)
        const reference = referenceForNode(edge.source, nodeById, configurations)
        const table = reference ? tableFromReference(reference) : null
        return table ? [table] : []
      })
  }
  return [...new Set(walk(targetNodeId))]
}

function targetMappingsForConfiguration(
  configuration: Extract<PipelineNodeConfiguration, { kind: 'target' }>,
  upstreamTables: readonly string[],
  fallbackSourceTable: string | null,
) {
  if (configuration.tableMappings?.length) return configuration.tableMappings
  const sourceTables =
    upstreamTables.length > 0 ? upstreamTables : fallbackSourceTable ? [fallbackSourceTable] : []
  return sourceTables.map((sourceTable, index) => ({
    sourceTable,
    targetTable: index === 0 ? configuration.table : sourceTable,
  }))
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
  const refs = upstreamIds.flatMap((id) => referencesForNode(id, nodeById, configurations))
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

function referencesForNode(
  id: string,
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const node = nodeById.get(id)
  const configuration = configurations.get(id)
  if (!node) return []
  if (configuration?.kind === 'source' && configuration.sourceId) {
    return sourceTableSelections(configuration).map((selection) =>
      selection.tableKind === 'regex'
        ? regexReference(selection.table)
        : `${configuration.sourceId}.${selection.table}`,
    )
  }
  if (node.type === 'transform')
    return [configuration?.kind === 'transform' ? configuration.stepId : node.label]
  if (node.type === 'view')
    return [configuration?.kind === 'view' ? configuration.viewId : node.label]
  return node.label ? [node.label] : []
}

function referenceForNode(
  id: string,
  nodeById: ReadonlyMap<string, PipelineDagNode>,
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  return referencesForNode(id, nodeById, configurations)[0] ?? null
}

function isRegexReference(value: string) {
  return value.length > 1 && value.startsWith('/') && value.endsWith('/')
}

function regexReference(value: string) {
  return isRegexReference(value) ? value : `/${value}/`
}

function deriveServeFrom(targets: PipelineJsonObject[], draft: PipelineGraphDraft) {
  if (targets.length === 0) return ''
  const nodeById = new Map(draft.dag.nodes.map((node) => [node.id, node]))
  const refs = draft.dag.nodes
    .filter((node) => node.type === 'target')
    .map((targetNode) => {
      const edge = draft.dag.edges.find((candidate) => candidate.target === targetNode.id)
      if (!edge) return null
      const upstreamConfiguration = draft.configurations.get(edge.source)
      if (upstreamConfiguration?.kind === 'source') {
        const selections = sourceTableSelections(upstreamConfiguration)
        if (selections.length > 1) {
          return selections.map((selection) =>
            selection.tableKind === 'regex'
              ? regexReference(selection.table)
              : `${upstreamConfiguration.sourceId}.${selection.table}`,
          )
        }
      }
      return referenceForNode(edge.source, nodeById, draft.configurations)
    })
    .filter((value): value is string | string[] => Boolean(value))
  return refs[0] ?? ''
}
