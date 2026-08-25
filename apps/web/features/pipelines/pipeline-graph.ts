import type { PipelineDag, PipelineLayout } from '@/service/pipeline-client'

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    detail: string | null
    nodeType: string
    hasInput: boolean
    hasOutput: boolean
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'pipeline'
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: PipelineLayout['viewport']
}

const INITIAL_X = 80
const INITIAL_Y = 96
const COLUMN_GAP = 280
const ROW_GAP = 152

/** Adds editor geometry to the semantic graph without mutating the API representation. */
export function pipelineDagToFlow(
  dag: PipelineDag,
  layout?: Pick<PipelineLayout, 'nodes' | 'viewport'> | null,
): FlowGraph {
  const columns = columnsFor(dag)
  const positions = positionsFor(dag, columns)
  const incoming = new Set(dag.edges.map((edge) => edge.target))
  const outgoing = new Set(dag.edges.map((edge) => edge.source))

  const nodes = dag.nodes.map((node) => {
    return {
      id: node.id,
      type: node.type,
      position: layout?.nodes[node.id] ?? positions.get(node.id) ?? { x: INITIAL_X, y: INITIAL_Y },
      data: {
        label: node.label,
        detail: node.detail,
        nodeType: node.type,
        hasInput: incoming.has(node.id),
        hasOutput: outgoing.has(node.id),
      },
    }
  })

  return {
    nodes,
    edges: dag.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'pipeline',
    })),
    viewport: layout?.viewport ?? null,
  }
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
