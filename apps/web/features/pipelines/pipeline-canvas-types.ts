import type { Edge, Node } from '@xyflow/react'

export interface PipelineCanvasSelection {
  id: string
  label: string
  detail: string | null
  nodeType: string
}

export interface PipelineNodeConnector {
  id: string
  name: string
  icon: string | null
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  detail: string | null
  nodeType: string
  connector: PipelineNodeConnector | null
  hasInput: boolean
  hasOutput: boolean
}

export type CanvasNode = Node<CanvasNodeData>
export type CanvasEdge = Edge<Record<string, never>, 'pipeline'>
