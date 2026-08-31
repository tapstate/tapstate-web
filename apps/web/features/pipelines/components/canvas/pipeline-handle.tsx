import { Handle, Position } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { PipelineHandleDirection, PipelineScreenPosition } from './pipeline-canvas-types'

export function PipelineHandle({
  direction,
  nodeLabel,
  connected = false,
  isConnectable = true,
  onRequestAdd,
}: {
  direction: PipelineHandleDirection
  nodeLabel: string
  connected?: boolean
  isConnectable?: boolean
  onRequestAdd?: (direction: PipelineHandleDirection, screenPosition: PipelineScreenPosition) => void
}) {
  const { t } = useTranslation()
  const isInput = direction === 'input'
  const getNodesReadOnly = () => !onRequestAdd
  const canOpenBlockSelector = !connected && isConnectable && !getNodesReadOnly()

  return (
    <Handle
      id={direction}
      type={isInput ? 'target' : 'source'}
      position={isInput ? Position.Left : Position.Right}
      isConnectable={isConnectable}
      className={cn(
        'pipeline-canvas__handle',
        'nodrag',
        'nopan',
        isInput ? 'pipeline-canvas__handle--input' : 'pipeline-canvas__handle--output',
        canOpenBlockSelector && 'pipeline-canvas__handle--addable',
      )}
      aria-label={t(`pipelines.workspace.handles.${direction}`, { node: nodeLabel })}
      data-pipeline-add={canOpenBlockSelector ? 'true' : undefined}
      data-handle-role={direction}
      data-handle-direction={direction}
      data-handle-connected={connected ? 'true' : 'false'}
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
        <span
          className="pipeline-canvas__handle-add"
          aria-hidden="true"
        >
          <Plus className="size-3" aria-hidden="true" />
        </span>
      )}
    </Handle>
  )
}
