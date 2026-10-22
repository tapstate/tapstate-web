import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useReactFlow, useViewport, type Viewport } from '@xyflow/react'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
      <button
        type="button"
        className="pipeline-canvas__viewport-button"
        aria-label={t('pipelines.workspace.actions.zoomOut')}
        title={t('pipelines.workspace.actions.zoomOut')}
        disabled={zoom <= 0.25}
        onClick={() => saveAfterViewportAction(zoomOut({ duration: 150 }))}
      >
        <ZoomOut className="size-4" aria-hidden="true" />
      </button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className="pipeline-canvas__viewport-button pipeline-canvas__viewport-scale"
          aria-label={t('pipelines.workspace.actions.canvasZoom')}
        >
          {Math.round(zoom * 100)}%
        </DropdownMenuTrigger>
        <DropdownMenuContent placement="top-start" sideOffset={4} className="w-48">
          <DropdownMenuItem
            onClick={() =>
              saveAfterViewportAction(fitView({ padding: 0.36, maxZoom: 0.92, duration: 180 }))
            }
          >
            <Maximize className="size-4" aria-hidden="true" />
            {t('pipelines.workspace.actions.fitCanvas')}
          </DropdownMenuItem>
          {[2, 1, 0.75, 0.5, 0.25].map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => saveAfterViewportAction(zoomTo(level, { duration: 150 }))}
            >
              <span className="size-4" aria-hidden="true" />
              {Math.round(level * 100)}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        className="pipeline-canvas__viewport-button"
        aria-label={t('pipelines.workspace.actions.zoomIn')}
        title={t('pipelines.workspace.actions.zoomIn')}
        disabled={zoom >= 2}
        onClick={() => saveAfterViewportAction(zoomIn({ duration: 150 }))}
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
