import type { PipelineDag, PipelineLayout } from '@/service/pipelines/pipeline-client'

import type { PipelineNodeConfiguration } from '../../model/pipeline-node-model'
import type {
  PipelineHandleDirection,
  PipelineNodeConnector,
  PipelineScreenPosition,
} from './pipeline-canvas-types'

export interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: {
    label: string
    detail: string | null
    description: string
    nodeType: string
    connector: PipelineNodeConnector | null
    hasInput: boolean
    hasOutput: boolean
    showInput: boolean
    showOutput: boolean
    configuration: PipelineNodeConfiguration | null
    onRequestAdd?: (
      direction: PipelineHandleDirection,
      screenPosition?: PipelineScreenPosition,
    ) => void
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: 'pipeline'
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: PipelineLayout['viewport']
}

export function flowToPipelineDag(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): PipelineDag {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType as PipelineDag['nodes'][number]['type'],
      label: node.data.label,
      detail: node.data.detail,
      description: node.data.description || null,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: null,
    })),
  }
}

/**
 * Converts legacy serve hops into ordinary source/transform/view-to-target edges.
 *
 * `serve` is a DSL delivery container, not a node users can edit on the DAG.
 * Older PipelineView responses may still expose it as an intermediate node, so
 * the editor collapses those hops at the projection boundary.
 */
export function normalizePipelineDag(dag: PipelineDag): PipelineDag {
  const serveIds = new Set(dag.nodes.filter((node) => node.type === 'serve').map((node) => node.id))
  if (serveIds.size === 0) return dag

  const outgoing = new Map<string, PipelineDag['edges']>()
  for (const edge of dag.edges) {
    const edges = outgoing.get(edge.source) ?? []
    edges.push(edge)
    outgoing.set(edge.source, edges)
  }

  const normalizedEdges: PipelineDag['edges'] = []
  const seenPairs = new Set<string>()

  function addEdge(
    edge: PipelineDag['edges'][number],
    source: string,
    target: string,
    id = edge.id,
  ) {
    const pair = `${source}\u0000${target}`
    if (seenPairs.has(pair)) return
    seenPairs.add(pair)
    normalizedEdges.push({ ...edge, id, source, target, label: null })
  }

  function collapseServe(
    source: string,
    serveId: string,
    entryEdge: PipelineDag['edges'][number],
    visited: Set<string>,
  ) {
    if (visited.has(serveId)) return
    visited.add(serveId)
    for (const next of outgoing.get(serveId) ?? []) {
      if (serveIds.has(next.target)) {
        collapseServe(source, next.target, entryEdge, visited)
      } else {
        addEdge(next, source, next.target, `${entryEdge.id}->${next.id}`)
      }
    }
  }

  for (const node of dag.nodes) {
    if (serveIds.has(node.id)) continue
    for (const edge of outgoing.get(node.id) ?? []) {
      if (serveIds.has(edge.target)) {
        collapseServe(node.id, edge.target, edge, new Set())
      } else {
        addEdge(edge, edge.source, edge.target)
      }
    }
  }

  return {
    nodes: dag.nodes.filter((node) => !serveIds.has(node.id)),
    edges: normalizedEdges,
  }
}

const INITIAL_X = 80
const INITIAL_Y = 96
const COLUMN_GAP = 280
const ROW_GAP = 152

/** Adds editor geometry to the semantic graph without mutating the API representation. */
export function pipelineDagToFlow(
  dag: PipelineDag,
  layout?: Pick<PipelineLayout, 'nodes' | 'viewport'> | null,
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector> = new Map(),
  configurations: ReadonlyMap<string, PipelineNodeConfiguration> = new Map(),
  descriptions: ReadonlyMap<string, string> = new Map(),
): FlowGraph {
  const normalizedDag = normalizePipelineDag(dag)
  const columns = columnsFor(normalizedDag)
  const positions = positionsFor(normalizedDag, columns)
  const incoming = new Set(normalizedDag.edges.map((edge) => edge.target))
  const outgoing = new Set(normalizedDag.edges.map((edge) => edge.source))

  const nodes = normalizedDag.nodes.map((node) => {
    return {
      id: node.id,
      type: node.type,
      position: layout?.nodes[node.id] ?? positions.get(node.id) ?? { x: INITIAL_X, y: INITIAL_Y },
      data: {
        label: node.label,
        detail: node.detail,
        description: descriptions.get(node.id) ?? node.description ?? '',
        nodeType: node.type,
        connector:
          (node.type === 'source' || node.type === 'target') && node.detail
            ? (connectorsBySourceId.get(node.detail) ?? null)
            : null,
        hasInput: incoming.has(node.id),
        hasOutput: outgoing.has(node.id),
        showInput: nodeTypeAllowsInput(node.type),
        // Every node keeps a right-side source handle so a newly inserted
        // node can be continued immediately from the canvas.
        showOutput: true,
        configuration: configurations.get(node.id) ?? null,
      },
    }
  })

  return {
    nodes,
    edges: normalizedDag.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'pipeline',
    })),
    viewport: layout?.viewport ?? null,
  }
}

function nodeTypeAllowsInput(type: string) {
  return type !== 'source'
}

function positionsFor(dag: PipelineDag, columns: Map<string, number>) {
  const byColumn = new Map<number, PipelineDag['nodes']>()
  for (const node of dag.nodes) {
    const column = columns.get(node.id) ?? 0
    const nodes = byColumn.get(column) ?? []
    nodes.push(node)
    byColumn.set(column, nodes)
  }

  const positions = new Map<string, { x: number; y: number }>()
  const highestColumn = Math.max(0, ...byColumn.keys())

  for (let column = 0; column <= highestColumn; column += 1) {
    const nodes = byColumn.get(column) ?? []
    const ranked = nodes
      .map((node, index) => ({
        node,
        index,
        desiredY: averageIncomingY(node.id, dag, positions) ?? INITIAL_Y + index * ROW_GAP,
      }))
      .sort((left, right) => left.desiredY - right.desiredY || left.index - right.index)

    let nextY = INITIAL_Y
    for (const { node, desiredY } of ranked) {
      const y = Math.max(desiredY, nextY)
      positions.set(node.id, { x: INITIAL_X + column * COLUMN_GAP, y })
      nextY = y + ROW_GAP
    }
  }

  return positions
}

function averageIncomingY(
  nodeId: string,
  dag: PipelineDag,
  positions: Map<string, { x: number; y: number }>,
) {
  const values = dag.edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => positions.get(edge.source)?.y)
    .filter((value): value is number => value !== undefined)

  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function columnsFor(dag: PipelineDag): Map<string, number> {
  const columns = new Map(dag.nodes.map((node) => [node.id, 0]))
  for (let pass = 0; pass < dag.nodes.length; pass += 1) {
    let changed = false
    for (const edge of dag.edges) {
      const next = (columns.get(edge.source) ?? 0) + 1
      if (next > (columns.get(edge.target) ?? 0)) {
        columns.set(edge.target, next)
        changed = true
      }
    }
    if (!changed) break
  }
  return columns
}
