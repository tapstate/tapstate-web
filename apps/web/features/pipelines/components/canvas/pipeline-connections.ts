import type { Connection } from '@xyflow/react'

import type { PipelineDagNode } from '@/service/pipelines/pipeline-client'

import type { CanvasEdge, CanvasNode } from './pipeline-canvas-types'

import { isPipelineDagEdgeValid } from '../../model/pipeline-node-rules'

/** Validates a user-created connection against the editor's directional port contract. */
export function isPipelineConnectionValid(
  connection: Connection | CanvasEdge,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
) {
  const { source, target, sourceHandle, targetHandle } = connection
  if (!source || !target || source === target) return false

  // Handle ids are part of the persisted editor contract when React Flow
  // supplies them. Missing ids remain valid for keyboard/programmatic edges,
  // but any explicit handle must point in the expected direction.
  if ((sourceHandle && sourceHandle !== 'output') || (targetHandle && targetHandle !== 'input')) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === source)
  const targetNode = nodes.find((node) => node.id === target)
  if (!sourceNode || !targetNode || !sourceNode.data.showOutput || !targetNode.data.showInput) {
    return false
  }
  return isPipelineDagEdgeValid(
    {
      id: sourceNode.id,
      type: sourceNode.data.nodeType as PipelineDagNode['type'],
      detail: sourceNode.data.detail,
    },
    {
      id: targetNode.id,
      type: targetNode.data.nodeType as PipelineDagNode['type'],
      detail: targetNode.data.detail,
    },
    edges,
  )
}
