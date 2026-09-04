import { MiniMap } from '@xyflow/react'
import { useEffect, useRef } from 'react'

import { PipelineCanvasViewportToolbar } from './pipeline-canvas-viewport-toolbar'

interface PipelineCanvasOperatorProps {
  availableWidth?: number
}

/** Keeps the minimap and viewport controls in their own canvas layer. */
export function PipelineCanvasOperator({ availableWidth }: PipelineCanvasOperatorProps) {
  const operatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const operator = operatorRef.current
    const container = operator?.closest<HTMLElement>('[data-testid="pipeline-workflow-container"]')

    if (!operator || !container) {
      return
    }

    const syncPanelWidth = () => {
      const panel = container.querySelector<HTMLElement>('[data-workflow-right-panel]')
      operator.style.setProperty(
        '--pipeline-canvas-panel-width',
        panel ? `${panel.getBoundingClientRect().width}px` : '0px',
      )
    }

    const resizeObserver = new ResizeObserver(syncPanelWidth)
    const observePanel = () => {
      const panel = container.querySelector<HTMLElement>('[data-workflow-right-panel]')

      resizeObserver.disconnect()
      if (panel) {
        resizeObserver.observe(panel)
      }
      syncPanelWidth()
    }
    const mutationObserver = new MutationObserver(observePanel)

    mutationObserver.observe(container, { childList: true, subtree: true })
    observePanel()

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
      operator.style.removeProperty('--pipeline-canvas-panel-width')
    }
  }, [])

  return (
    <div
      className="pipeline-canvas__operator pointer-events-none"
      style={{ width: availableWidth ? `${availableWidth}px` : undefined }}
      data-available-width={availableWidth ?? undefined}
      ref={operatorRef}
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
