import { useReactFlow } from '@xyflow/react'
import { Crosshair, Hand, Maximize2, MousePointer2, Plus } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineNodeInsertionContext } from '../node-library/pipeline-node-library-types'

type CanvasInteractionMode = 'pointer' | 'hand'

interface PipelineCanvasToolbarProps {
  interactionMode: CanvasInteractionMode
  onInteractionModeChange: (mode: CanvasInteractionMode) => void
  onRequestNodeSelector?: (context: PipelineNodeInsertionContext) => void
}

/** Canvas-native controls for adding nodes, selecting, panning, and fitting the visible graph. */
export function PipelineCanvasToolbar({
  interactionMode,
  onInteractionModeChange,
  onRequestNodeSelector,
}: PipelineCanvasToolbarProps) {
  const { t } = useTranslation()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const { fitView, screenToFlowPosition } = useReactFlow()

  function openNodeSelector() {
    const bounds = addButtonRef.current?.getBoundingClientRect()
    if (!bounds || !onRequestNodeSelector) return
    const screenPosition = { x: bounds.right + 8, y: bounds.top }
    onRequestNodeSelector({
      position: screenToFlowPosition(screenPosition),
      screenPosition,
      connectFrom: null,
      connectTo: null,
    })
  }

  return (
    <div className="pipeline-canvas__tool-layer pointer-events-none">
      <div
        className="pipeline-canvas__tool-bar pointer-events-auto"
        role="toolbar"
        aria-label={t('pipelines.workspace.actions.canvasTools')}
      >
        <button
          ref={addButtonRef}
          type="button"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.navigation.addNode')}
          title={t('pipelines.workspace.navigation.addNode')}
          onClick={openNodeSelector}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <span className="pipeline-canvas__tool-divider" aria-hidden="true" />
        <button
          type="button"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.actions.pointerMode')}
          aria-pressed={interactionMode === 'pointer'}
          title={t('pipelines.workspace.actions.pointerMode')}
          onClick={() => onInteractionModeChange('pointer')}
        >
          <MousePointer2 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.actions.handMode')}
          aria-pressed={interactionMode === 'hand'}
          title={t('pipelines.workspace.actions.handMode')}
          onClick={() => onInteractionModeChange('hand')}
        >
          <Hand className="size-4" aria-hidden="true" />
        </button>
        <span className="pipeline-canvas__tool-divider" aria-hidden="true" />
        <button
          type="button"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.actions.fitCanvas')}
          title={t('pipelines.workspace.actions.fitCanvas')}
          onClick={() => void fitView({ padding: 0.36, maxZoom: 0.92, duration: 180 })}
        >
          <Crosshair className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.actions.focusCanvas')}
          title={t('pipelines.workspace.actions.focusCanvas')}
          onClick={() => void fitView({ padding: 0.2, maxZoom: 1, duration: 180 })}
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
