import { MiniMap } from '@xyflow/react'

import { PipelineCanvasViewportToolbar } from './pipeline-canvas-viewport-toolbar'

interface PipelineCanvasOperatorProps {
  availableWidth?: number
}

/** Keeps the minimap and viewport controls in their own canvas layer. */
export function PipelineCanvasOperator({ availableWidth }: PipelineCanvasOperatorProps) {
  return (
    <div
      className="pipeline-canvas__operator pointer-events-none"
      style={{ width: availableWidth ? `${availableWidth}px` : undefined }}
      data-available-width={availableWidth ?? undefined}
    >
      <div className="pipeline-canvas__operator-row">
        <div className="pipeline-canvas__operator-viewport">
          <MiniMap
            className="pipeline-canvas__minimap pipeline-canvas__minimap--operator max-md:!hidden"
            style={{ width: 102, height: 72 }}
            maskColor="var(--pipeline-minimap-mask)"
            nodeColor="var(--pipeline-minimap-node)"
            nodeStrokeWidth={2}
            pannable
            zoomable
          />
          <PipelineCanvasViewportToolbar />
        </div>
      </div>
    </div>
  )
}
