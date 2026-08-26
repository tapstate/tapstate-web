import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react'

import type { CanvasEdge } from './pipeline-canvas-types'

/** Renders one uncluttered directional Pipeline connection. */
export function PipelineEdge({
  id,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.22,
  })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      interactionWidth={24}
      style={{
        stroke: selected ? 'var(--pipeline-selection)' : 'var(--pipeline-edge)',
        strokeWidth: selected ? 2.25 : 1.75,
      }}
    />
  )
}
