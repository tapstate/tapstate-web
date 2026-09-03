import type {
  PipelineDagEdge,
  PipelineDagNode,
  PipelineDagNodeType,
} from '@/service/pipelines/pipeline-client'

export type PipelineGraphEdge = Pick<PipelineDagEdge, 'id' | 'source' | 'target'>

export interface PipelineNodeRule {
  /** null means an unbounded number of connections is allowed. */
  maxInputs: number | null
  /** null means an unbounded number of connections is allowed. */
  maxOutputs: number | null
}

const DEFAULT_TRANSFORM_RULE: PipelineNodeRule = { maxInputs: 1, maxOutputs: 1 }

export function pipelineNodeRule(node: Pick<PipelineDagNode, 'type' | 'detail'>): PipelineNodeRule {
  if (node.type === 'source') return { maxInputs: 0, maxOutputs: null }
  if (node.type === 'target') return { maxInputs: 1, maxOutputs: 0 }
  if (node.type === 'view') return { maxInputs: 1, maxOutputs: 1 }
  if (node.type === 'serve') return { maxInputs: 1, maxOutputs: 1 }
  if (node.type === 'transform' && ['join', 'union', 'nest'].includes(node.detail ?? '')) {
    return { maxInputs: null, maxOutputs: 1 }
  }
  return DEFAULT_TRANSFORM_RULE
}

export function countPipelineNodeInputs(nodeId: string, edges: readonly PipelineGraphEdge[]) {
  return edges.reduce((count, edge) => count + (edge.target === nodeId ? 1 : 0), 0)
}

export function countPipelineNodeOutputs(nodeId: string, edges: readonly PipelineGraphEdge[]) {
  return edges.reduce((count, edge) => count + (edge.source === nodeId ? 1 : 0), 0)
}

export function canPipelineNodeAcceptInput(
  node: Pick<PipelineDagNode, 'id' | 'type' | 'detail'>,
  edges: readonly PipelineGraphEdge[],
) {
  const { maxInputs } = pipelineNodeRule(node)
  return maxInputs === null || countPipelineNodeInputs(node.id, edges) < maxInputs
}

export function canPipelineNodeEmitOutput(
  node: Pick<PipelineDagNode, 'id' | 'type' | 'detail'>,
  edges: readonly PipelineGraphEdge[],
) {
  const { maxOutputs } = pipelineNodeRule(node)
  return maxOutputs === null || countPipelineNodeOutputs(node.id, edges) < maxOutputs
}

function hasPath(
  startId: string,
  targetId: string,
  edges: readonly PipelineGraphEdge[],
  visited = new Set<string>(),
): boolean {
  if (startId === targetId) return true
  if (visited.has(startId)) return false
  visited.add(startId)
  return edges
    .filter((edge) => edge.source === startId)
    .some((edge) => hasPath(edge.target, targetId, edges, visited))
}

export function isPipelineDagEdgeValid(
  source: Pick<PipelineDagNode, 'id' | 'type' | 'detail'>,
  target: Pick<PipelineDagNode, 'id' | 'type' | 'detail'>,
  edges: readonly PipelineGraphEdge[],
  options: { ignoreEdgeId?: string } = {},
) {
  if (source.id === target.id) return false
  if (pipelineNodeRule(source).maxOutputs === 0 || pipelineNodeRule(target).maxInputs === 0) {
    return false
  }

  const relevantEdges = options.ignoreEdgeId
    ? edges.filter((edge) => edge.id !== options.ignoreEdgeId)
    : edges
  if (relevantEdges.some((edge) => edge.source === source.id && edge.target === target.id)) {
    return false
  }
  if (!canPipelineNodeEmitOutput(source, relevantEdges)) return false
  if (!canPipelineNodeAcceptInput(target, relevantEdges)) return false
  return !hasPath(target.id, source.id, relevantEdges)
}

export function pipelineNodeTypeCanConnect(
  sourceType: PipelineDagNodeType,
  targetType: PipelineDagNodeType,
) {
  return (
    pipelineNodeRule({ type: sourceType, detail: null }).maxOutputs !== 0 &&
    pipelineNodeRule({ type: targetType, detail: null }).maxInputs !== 0
  )
}
