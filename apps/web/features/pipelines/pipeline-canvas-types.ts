import type { Edge, Node } from '@xyflow/react'

import type { PipelineNodeConfiguration } from './pipeline-node-model'

export interface PipelineCanvasSelection {
  id: string
  label: string
  detail: string | null
  nodeType: string
  configuration: PipelineNodeConfiguration | null
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
  showInput: boolean
  showOutput: boolean
  configuration: PipelineNodeConfiguration | null
}

export type CanvasNode = Node<CanvasNodeData>
export type CanvasEdge = Edge<Record<string, never>, 'pipeline'>
