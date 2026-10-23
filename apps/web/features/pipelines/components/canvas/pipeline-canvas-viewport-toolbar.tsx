import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuPopup,
  DropdownMenuPositioner,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useReactFlow, useViewport, type Viewport } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

import { PipelineCanvasTooltip } from './pipeline-canvas-tooltip'

/** Provides the viewport actions that sit below the Pipeline minimap. */
export function PipelineCanvasViewportToolbar({
  onViewportChange,
}: {
  onViewportChange: (viewport: Viewport) => void
}) {
  const { t } = useTranslation()
  const { fitView, getViewport, zoomIn, zoomOut, zoomTo } = useReactFlow()
  const { zoom } = useViewport()

  function saveAfterViewportAction(action: Promise<boolean>) {
    void action.then(() => onViewportChange(getViewport()))
  }

  return (
    <div
      className="pipeline-canvas__viewport-toolbar"
      role="toolbar"
      aria-label={t('pipelines.workspace.actions.canvasViewport')}
    >
      <PipelineCanvasTooltip label={t('pipelines.workspace.actions.zoomOut')}>
        <button
          type="button"
          className="pipeline-canvas__viewport-button"
          aria-label={t('pipelines.workspace.actions.zoomOut')}
          disabled={zoom <= 0.25}
          onClick={(event) => {
            event.stopPropagation()
            saveAfterViewportAction(zoomOut({ duration: 150 }))
          }}
        >
          <span className="i-ri-zoom-out-line size-4" aria-hidden="true" />
        </button>
      </PipelineCanvasTooltip>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className="pipeline-canvas__viewport-button pipeline-canvas__viewport-scale system-sm-medium text-text-tertiary hover:text-text-secondary data-popup-open:bg-state-base-hover data-popup-open:text-text-secondary"
          aria-label={t('pipelines.workspace.actions.canvasZoom')}
        >
          {Math.round(zoom * 100)}%
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuPositioner placement="top-start" sideOffset={4} alignOffset={-2}>
            <DropdownMenuPopup>
              <div className="border-components-panel-border bg-components-panel-bg-blur w-48 rounded-xl border-[0.5px] shadow-lg backdrop-blur-[5px]">
                <div className="p-1">
                  {[2, 1, 0.75, 0.5, 0.25].map((level) => (
                    <DropdownMenuItem
                      key={level}
                      className="system-md-regular text-text-secondary justify-between px-3 py-1.5"
                      onClick={() => saveAfterViewportAction(zoomTo(level, { duration: 150 }))}
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-4" aria-hidden="true" />
                        <span>{Math.round(level * 100)}%</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="system-md-regular text-text-secondary justify-between px-3 py-1.5"
                    onClick={() =>
                      saveAfterViewportAction(
                        fitView({ padding: 0.36, maxZoom: 0.92, duration: 180 }),
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="i-ri-fullscreen-line text-text-tertiary size-4"
                        aria-hidden="true"
                      />
                      <span>{t('pipelines.workspace.actions.fitCanvas')}</span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </div>
            </DropdownMenuPopup>
          </DropdownMenuPositioner>
        </DropdownMenuPortal>
      </DropdownMenu>
      <PipelineCanvasTooltip label={t('pipelines.workspace.actions.zoomIn')}>
        <button
          type="button"
          className="pipeline-canvas__viewport-button"
          aria-label={t('pipelines.workspace.actions.zoomIn')}
          disabled={zoom >= 2}
          onClick={(event) => {
            event.stopPropagation()
            saveAfterViewportAction(zoomIn({ duration: 150 }))
          }}
        >
          <span className="i-ri-zoom-in-line size-4" aria-hidden="true" />
        </button>
      </PipelineCanvasTooltip>
    </div>
  )
}
