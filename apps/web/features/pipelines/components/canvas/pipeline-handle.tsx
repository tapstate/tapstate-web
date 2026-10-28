import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { PipelineHandleDirection, PipelineScreenPosition } from './pipeline-canvas-types'

export function PipelineHandle({
  direction,
  nodeLabel,
  connected = false,
  canAdd,
  nodeSelected = false,
  isConnectable = true,
  onRequestAdd,
}: {
  direction: PipelineHandleDirection
  nodeLabel: string
  connected?: boolean
  /** Whether a new edge may be created from this port. Defaults to !connected for compatibility. */
  canAdd?: boolean
  nodeSelected?: boolean
  isConnectable?: boolean
  onRequestAdd?: (
    direction: PipelineHandleDirection,
    screenPosition: PipelineScreenPosition,
  ) => void
}) {
  const { t } = useTranslation()
  const isInput = direction === 'input'
  const getNodesReadOnly = () => !onRequestAdd
  const canCreateConnection = canAdd ?? !connected
  const canOpenBlockSelector = canCreateConnection && isConnectable && !getNodesReadOnly()

  return (
    <Handle
      id={direction}
      type={isInput ? 'target' : 'source'}
      position={isInput ? Position.Left : Position.Right}
      isConnectable={isConnectable}
      className={cn(
        'pipeline-canvas__handle group/handle nodrag nopan absolute z-1 m-0 size-4! transform-none! cursor-crosshair rounded-none! border-none! bg-transparent! p-0 outline-hidden!',
        'before:absolute before:-inset-1 before:content-[""]',
        'after:bg-workflow-link-line-handle after:absolute after:top-1 after:h-2 after:w-0.5 after:opacity-0 after:content-[""]',
        isInput
          ? 'pipeline-canvas__handle--input top-4! -left-[9px]! translate-y-0! after:left-1.5'
          : 'pipeline-canvas__handle--output top-4! -right-[9px]! translate-y-0! after:right-1.5',
        canOpenBlockSelector && 'pipeline-canvas__handle--addable',
        connected && 'after:opacity-100',
      )}
      aria-label={t(`pipelines.workspace.handles.${direction}`, { node: nodeLabel })}
      data-pipeline-add={canOpenBlockSelector ? 'true' : undefined}
      data-handle-role={direction}
      data-handle-direction={direction}
      data-handle-connected={connected ? 'true' : 'false'}
      data-handle-can-add={canCreateConnection ? 'true' : 'false'}
      data-handle-connectable={isConnectable ? 'true' : 'false'}
      onClick={
        canOpenBlockSelector
          ? (event) => {
              // Keep the click on the handle (matching the editor's source
              // handle behavior) so the visual plus never blocks drag-start.
              event.stopPropagation()
              onRequestAdd?.(direction, { x: event.clientX, y: event.clientY })
            }
          : undefined
      }
    >
      {canOpenBlockSelector && (
        <button
          type="button"
          tabIndex={0}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const bounds = event.currentTarget.getBoundingClientRect()
            onRequestAdd?.(direction, {
              x: event.clientX || bounds.left + bounds.width / 2,
              y: event.clientY || bounds.top + bounds.height / 2,
            })
          }}
          className={cn(
            'bg-util-colors-blue-brand-blue-brand-500 focus-visible:ring-components-input-border-hover pointer-events-none absolute top-0 left-0 z-10 grid size-4 place-items-center rounded-full border-0 p-0 text-white opacity-0 shadow-xs transition-opacity duration-150 group-hover:opacity-100 group-hover/handle:opacity-100 focus-visible:opacity-100 focus-visible:ring-2',
            nodeSelected && 'opacity-100',
          )}
          aria-label={t('pipelines.workspace.nodeSelector.addNode')}
          data-handle-add="true"
        >
          <span className="i-ri-add-line size-2.5" aria-hidden="true" />
        </button>
      )}
      {canOpenBlockSelector && (
        <div
          className="border-components-panel-border bg-components-tooltip-bg pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 -translate-y-full rounded-lg border-[0.5px] p-1.5 shadow-lg group-hover/handle:block"
          data-pipeline-handle-tooltip="true"
        >
          <div className="text-text-tertiary system-xs-regular whitespace-nowrap">
            <span className="text-text-secondary system-xs-medium">
              {t('pipelines.workspace.handles.click')}
            </span>{' '}
            {t('pipelines.workspace.handles.clickDescription')}
          </div>
          <div className="text-text-tertiary system-xs-regular whitespace-nowrap">
            <span className="text-text-secondary system-xs-medium">
              {t('pipelines.workspace.handles.drag')}
            </span>{' '}
            {t('pipelines.workspace.handles.dragDescription')}
          </div>
        </div>
      )}
    </Handle>
  )
}
