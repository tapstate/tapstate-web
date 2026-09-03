import { Handle, Position } from '@xyflow/react'
import { Plus } from 'lucide-react'
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
        'pipeline-canvas__handle group/handle nodrag nopan absolute z-[1] m-0 size-4! transform-none! cursor-crosshair rounded-none! border-none! bg-transparent! p-0 outline-hidden! transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-125',
        'after:absolute after:top-1 after:h-2 after:w-0.5 after:bg-[var(--pipeline-handle-accent)] after:opacity-0 after:content-[""]',
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
          tabIndex={-1}
          className={cn(
            'pointer-events-none absolute top-0 left-0 z-10 grid size-4 place-items-center rounded-full border-0 bg-[var(--pipeline-handle-accent)] p-0 text-white opacity-0 shadow-sm transition-[opacity,transform,background-color] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover/handle:scale-100 group-hover/handle:opacity-100',
            nodeSelected && 'scale-100 opacity-100',
          )}
          aria-label={t('pipelines.workspace.nodeSelector.addNode')}
          data-handle-add="true"
        >
          <Plus className="size-2.5" aria-hidden="true" />
        </button>
      )}
      {canOpenBlockSelector && (
        <div
          className="border-pipeline-panel-border bg-pipeline-tooltip-bg pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 -translate-y-full rounded-lg border-[0.5px] p-1.5 text-[11px] leading-4 text-[var(--pipeline-text-muted)] shadow-lg group-hover/handle:block"
          data-pipeline-handle-tooltip="true"
        >
          <div className="whitespace-nowrap">
            <span className="font-medium text-[var(--pipeline-text)]">
              {t('pipelines.workspace.handles.click')}
            </span>{' '}
            {t('pipelines.workspace.handles.clickDescription')}
          </div>
          <div className="whitespace-nowrap">
            <span className="font-medium text-[var(--pipeline-text)]">
              {t('pipelines.workspace.handles.drag')}
            </span>{' '}
            {t('pipelines.workspace.handles.dragDescription')}
          </div>
        </div>
      )}
    </Handle>
  )
}
