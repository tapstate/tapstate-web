import type { PipelineDag, PipelineLayout } from '@/service/pipeline-client'

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    detail: string | null
    nodeType: string
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'pipeline'
  data?: {
    label?: string
  }
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
  const rows = new Map<number, number>()

  const nodes = dag.nodes.map((node) => {
    const column = columns.get(node.id) ?? 0
    const row = rows.get(column) ?? 0
    rows.set(column, row + 1)
    return {
      id: node.id,
      type: node.type,
      position: layout?.nodes[node.id] ?? {
        x: INITIAL_X + column * COLUMN_GAP,
        y: INITIAL_Y + row * ROW_GAP,
      },
      data: { label: node.label, detail: node.detail, nodeType: node.type },
    }
  })

  return {
    nodes,
    edges: dag.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'pipeline',
      ...(edge.label ? { data: { label: edge.label } } : {}),
    })),
    viewport: layout?.viewport ?? null,
  }
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
