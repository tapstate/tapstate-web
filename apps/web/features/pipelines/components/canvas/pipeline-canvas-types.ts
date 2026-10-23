import type { Edge, Node } from '@xyflow/react'

import type { PipelineNodeConfiguration } from '../../model/pipeline-node-model'

export type { CanvasNoteRecord } from './pipeline-canvas-notes'

export type PipelineHandleDirection = 'input' | 'output'

export interface PipelineScreenPosition {
  x: number
  y: number
}

export interface PipelineCanvasSelection {
  id: string
  label: string
  detail: string | null
  description: string
  nodeType: string
  connector: PipelineNodeConnector | null
  configuration: PipelineNodeConfiguration | null
}

export interface PipelineCanvasNotesChangeOptions {
  recordHistory?: boolean
}

export interface PipelineNodeConnector {
  id: string
  name: string
  icon: string | null
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  detail: string | null
  description: string
  nodeType: string
  connector: PipelineNodeConnector | null
  hasInput: boolean
  hasOutput: boolean
  canAddInput?: boolean
  canAddOutput?: boolean
  showInput: boolean
  showOutput: boolean
  configuration: PipelineNodeConfiguration | null
  /** Requests insertion on one side of this node. */
  onRequestAdd?: (
    direction: PipelineHandleDirection,
    screenPosition?: PipelineScreenPosition,
  ) => void
  onRequestDelete?: () => void
  noteText?: string
  noteReadOnly?: boolean
  onNoteChange?: (id: string, text: string) => void
  onNoteDelete?: (id: string) => void
}

export type CanvasNode = Node<CanvasNodeData>
export interface PipelineCanvasEdgeData extends Record<string, unknown> {
  onRequestInsert?: (screenPosition: { x: number; y: number }) => void
}

export type CanvasEdge = Edge<PipelineCanvasEdgeData, 'pipeline'>
