import type { MouseEvent } from 'react'

import { IconButton } from '@langgenius/dify-ui/icon-button'
import { Separator } from '@langgenius/dify-ui/separator'
import { Toggle } from '@langgenius/dify-ui/toggle'
import { useReactFlow } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

import type { PipelineNodeInsertionContext } from '../node-library/pipeline-node-library-types'

import { PipelineCanvasExport } from './pipeline-canvas-export'

type CanvasInteractionMode = 'pointer' | 'hand'

const pressedToolStateClassName =
  'data-pressed:bg-state-accent-active data-pressed:text-text-accent'
const ariaPressedToolStateClassName =
  'aria-pressed:bg-state-accent-active aria-pressed:text-text-accent'

interface PipelineCanvasToolbarProps {
  interactionMode: CanvasInteractionMode
  disabled?: boolean
  onInteractionModeChange: (mode: CanvasInteractionMode) => void
  onRequestNodeSelector?: (context: PipelineNodeInsertionContext) => void
  onRequestNote?: () => void
  notePlacementActive?: boolean
  onOrganize?: () => void
}

/** Canvas-native controls for adding nodes, selecting, panning, and fitting the visible graph. */
export function PipelineCanvasToolbar({
  interactionMode,
  disabled = false,
  onInteractionModeChange,
  onRequestNodeSelector,
  onRequestNote,
  notePlacementActive = false,
  onOrganize,
}: PipelineCanvasToolbarProps) {
  const { t } = useTranslation()
  const { screenToFlowPosition } = useReactFlow()

  function openNodeSelector(event: MouseEvent<HTMLButtonElement>) {
    if (!onRequestNodeSelector) return
    const bounds = event.currentTarget.getBoundingClientRect()
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
        <IconButton
          type="button"
          size="lg"
          className="pipeline-canvas__tool-button data-block-selector-open:bg-state-accent-active data-block-selector-open:text-text-accent"
          aria-label={t('pipelines.workspace.navigation.addNode')}
          title={t('pipelines.workspace.navigation.addNode')}
          onClick={openNodeSelector}
          disabled={disabled}
        >
          <span className="i-ri-add-circle-fill size-4" aria-hidden="true" />
        </IconButton>
        <IconButton
          type="button"
          size="lg"
          className={`pipeline-canvas__tool-button ml-px ${ariaPressedToolStateClassName}`}
          aria-label={t('pipelines.workspace.actions.addNote')}
          aria-pressed={notePlacementActive}
          title={t('pipelines.workspace.actions.addNote')}
          onClick={onRequestNote}
          disabled={disabled}
        >
          <span className="i-ri-sticky-note-add-line size-4" aria-hidden="true" />
        </IconButton>
        <Separator decorative className="pipeline-canvas__tool-divider" />
        <Toggle
          pressed={interactionMode === 'pointer'}
          onPressedChange={() => onInteractionModeChange('pointer')}
          disabled={disabled}
          className={`pipeline-canvas__mode-toggle ${pressedToolStateClassName}`}
          render={
            <IconButton
              size="lg"
              className="pipeline-canvas__tool-button mr-px"
              aria-label={t('pipelines.workspace.actions.pointerMode')}
              title={t('pipelines.workspace.actions.pointerMode')}
              disabled={disabled}
            >
              <span className="i-ri-cursor-line size-4" aria-hidden="true" />
            </IconButton>
          }
        />
        <Toggle
          pressed={interactionMode === 'hand'}
          onPressedChange={() => onInteractionModeChange('hand')}
          disabled={disabled}
          className={`pipeline-canvas__mode-toggle ${pressedToolStateClassName}`}
          render={
            <IconButton
              size="lg"
              className="pipeline-canvas__tool-button"
              aria-label={t('pipelines.workspace.actions.handMode')}
              title={t('pipelines.workspace.actions.handMode')}
              disabled={disabled}
            >
              <span className="i-ri-hand size-4" aria-hidden="true" />
            </IconButton>
          }
        />
        <Separator decorative className="pipeline-canvas__tool-divider" />
        <IconButton
          type="button"
          size="lg"
          className="pipeline-canvas__tool-button"
          aria-label={t('pipelines.workspace.actions.organizeNodes')}
          title={t('pipelines.workspace.actions.organizeNodes')}
          onClick={onOrganize}
          disabled={disabled}
        >
          <span className="i-ri-function-add-line size-4" aria-hidden="true" />
        </IconButton>
        <PipelineCanvasExport disabled={disabled} />
      </div>
    </div>
  )
}
