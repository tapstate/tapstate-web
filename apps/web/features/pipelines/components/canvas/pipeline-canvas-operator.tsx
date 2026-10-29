import { IconButton } from '@tapstate-web/ui/icon-button'
import { Popover, PopoverContent, PopoverTrigger } from '@tapstate-web/ui/popover'
import { Separator } from '@tapstate-web/ui/separator'
import { MiniMap, type Viewport } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { PipelineCanvasTooltip } from './pipeline-canvas-tooltip'
import { PipelineCanvasViewportToolbar } from './pipeline-canvas-viewport-toolbar'

/** Keeps the minimap and viewport controls in their own canvas layer. */
export function PipelineCanvasOperator({
  canUndo = false,
  canRedo = false,
  historyPastCount = 0,
  historyFutureCount = 0,
  onUndo,
  onRedo,
  onJumpHistory,
  onViewportChange,
  readOnly = false,
}: {
  canUndo?: boolean
  canRedo?: boolean
  historyPastCount?: number
  historyFutureCount?: number
  onUndo?: () => void
  onRedo?: () => void
  onJumpHistory?: (direction: 'undo' | 'redo', steps: number) => void
  onViewportChange: (viewport: Viewport) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
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
    <div className="pipeline-canvas__operator pointer-events-none" ref={operatorRef}>
      <div className="pipeline-canvas__operator-row">
        <div
          className="pipeline-canvas__history-toolbar pointer-events-auto"
          role="toolbar"
          aria-label={t('pipelines.workspace.actions.canvasHistory')}
        >
          <PipelineCanvasTooltip label={t('pipelines.workspace.actions.undo')}>
            <IconButton
              size="lg"
              className="rounded-md"
              aria-label={t('pipelines.workspace.actions.undo')}
              disabled={readOnly || !canUndo}
              focusableWhenDisabled
              onClick={onUndo}
            >
              <span className="i-ri-arrow-go-back-line size-4" aria-hidden="true" />
            </IconButton>
          </PipelineCanvasTooltip>
          <PipelineCanvasTooltip label={t('pipelines.workspace.actions.redo')}>
            <IconButton
              size="lg"
              className="rounded-md"
              aria-label={t('pipelines.workspace.actions.redo')}
              disabled={readOnly || !canRedo}
              focusableWhenDisabled
              onClick={onRedo}
            >
              <span className="i-ri-arrow-go-forward-fill size-4" aria-hidden="true" />
            </IconButton>
          </PipelineCanvasTooltip>
          <Separator orientation="vertical" className="mx-0.5 h-3.5" />
          <Popover>
            <PipelineCanvasTooltip label={t('pipelines.workspace.actions.history')}>
              <PopoverTrigger
                render={
                  <IconButton
                    size="lg"
                    aria-label={t('pipelines.workspace.actions.history')}
                    className="data-popup-open:bg-state-accent-active data-popup-open:text-text-accent rounded-md"
                  >
                    <span className="i-ri-history-line size-4" aria-hidden="true" />
                  </IconButton>
                }
              />
            </PipelineCanvasTooltip>
            <PopoverContent placement="top-start" className="max-h-[50vh] w-64 overflow-y-auto p-2">
              <div className="px-2 py-1 text-sm font-medium text-[var(--color-text-secondary)]">
                {t('pipelines.workspace.actions.history')}
              </div>
              {historyPastCount === 0 && historyFutureCount === 0 && (
                <div className="px-2 py-8 text-center text-xs text-[var(--color-text-tertiary)]">
                  {t('pipelines.workspace.actions.noChangesYet')}
                </div>
              )}
              {Array.from({ length: historyFutureCount }, (_, index) => (
                <button
                  key={`future-${index}`}
                  type="button"
                  className="pipeline-canvas__history-entry"
                  onClick={() => onJumpHistory?.('redo', historyFutureCount - index)}
                >
                  {t('pipelines.workspace.actions.stepForward', {
                    count: historyFutureCount - index,
                  })}
                </button>
              ))}
              {(historyPastCount > 0 || historyFutureCount > 0) && (
                <div className="pipeline-canvas__history-current">
                  {t('pipelines.workspace.actions.currentState')}
                </div>
              )}
              {Array.from({ length: historyPastCount }, (_, index) => (
                <button
                  key={`past-${index}`}
                  type="button"
                  className="pipeline-canvas__history-entry"
                  onClick={() => onJumpHistory?.('undo', index + 1)}
                >
                  {t('pipelines.workspace.actions.stepBackward', { count: index + 1 })}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <div className="pipeline-canvas__operator-viewport">
          <MiniMap
            className="pipeline-canvas__minimap--operator border-divider-subtle! bg-background-default-subtle! shadow-shadow-shadow-5! absolute! bottom-10! z-9 m-0! h-18.25! w-25.75! rounded-lg! border-[0.5px]! shadow-md! max-md:!hidden"
            style={{ width: 102, height: 72 }}
            maskColor="var(--color-workflow-minimap-bg)"
            nodeClassName={(node) =>
              node.selected
                ? 'bg-workflow-minimap-block border-components-option-card-option-selected-border'
                : 'bg-workflow-minimap-block'
            }
            nodeStrokeWidth={3}
            pannable
            zoomable
          />
          <PipelineCanvasViewportToolbar onViewportChange={onViewportChange} />
        </div>
      </div>
    </div>
  )
}
