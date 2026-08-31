import { useReactFlow } from '@xyflow/react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Provides the viewport actions that sit below the Pipeline minimap. */
export function PipelineCanvasViewportToolbar() {
  const { t } = useTranslation()
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  return (
    <div className="pipeline-canvas__viewport-toolbar" role="toolbar" aria-label="Canvas viewport">
        <button
          type="button"
          className="pipeline-canvas__viewport-button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => void zoomOut({ duration: 150 })}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pipeline-canvas__viewport-button"
          aria-label={t('pipelines.workspace.actions.fitCanvas')}
          title={t('pipelines.workspace.actions.fitCanvas')}
          onClick={() => void fitView({ padding: 0.36, maxZoom: 0.92, duration: 180 })}
        >
          <Maximize2 className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pipeline-canvas__viewport-button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => void zoomIn({ duration: 150 })}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
    </div>
  )
}
