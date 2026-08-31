import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import type { CanvasEdge } from './pipeline-canvas-types'

/** Renders a Bezier Pipeline connection with an insert trigger that follows the edge interaction state. */
export function PipelineEdge({
  id,
  data,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTriggerHovered, setIsTriggerHovered] = useState(false)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.16,
  })
  const isInsertVisible = Boolean(data?.onRequestInsert) && (selected || isHovered || isTriggerHovered)

  return (
    <>
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
      <path
        d={edgePath}
        className="pipeline-canvas__edge-hit"
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className="pipeline-canvas__edge-selector nopan nodrag"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: isInsertVisible ? 'auto' : 'none',
            opacity: isInsertVisible ? 1 : 0,
          }}
          onMouseEnter={() => setIsTriggerHovered(true)}
          onMouseLeave={() => setIsTriggerHovered(false)}
        >
          <button
            type="button"
            className="pipeline-canvas__edge-add"
            aria-label="Insert Pipeline node"
            onClick={(event) => {
              event.stopPropagation()
              data?.onRequestInsert?.({ x: event.clientX, y: event.clientY })
            }}
          >
            <Plus className="size-2.5" aria-hidden="true" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
