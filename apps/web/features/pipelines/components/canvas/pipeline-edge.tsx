import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const [isTriggerHovered, setIsTriggerHovered] = useState(false)
  const [edgePath, labelX, labelY] = getBezierPath({
    // React Flow calculates endpoints at the center of the 16px handles. Dify
    // pulls the rendered path inward by half the handle width so it meets the
    // blue bar rather than stopping at the outer edge of the hit area.
    sourceX: sourceX - 8,
    sourceY,
    sourcePosition: Position.Right,
    targetX: targetX + 8,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.16,
  })
  const isInsertVisible =
    Boolean(data?.onRequestInsert) && (selected || isHovered || isTriggerHovered)

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
        className="[pointer-events:stroke] cursor-pointer"
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className="nopan nodrag absolute z-[3] transition-opacity duration-150"
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
            className="z-10 grid size-4 place-items-center rounded-full border-0 bg-[var(--pipeline-selection)] p-0 text-white shadow-sm transition-transform duration-150 hover:scale-150"
            aria-label={t('pipelines.workspace.nodeSelector.insertOnEdge')}
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

export default memo(PipelineEdge)
