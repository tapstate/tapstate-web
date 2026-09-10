import type { NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'

import type { CanvasNode } from './pipeline-canvas-types'

import { PipelineHandle } from './pipeline-handle'
import { PipelineNodeIcon } from './pipeline-node-icon'
import { PipelineNodeToolbar } from './pipeline-node-toolbar'

/** Renders a selectable Pipeline node with connector-aware source and target marks. */
export function PipelineNode({ data, selected }: NodeProps<CanvasNode>) {
  const isSelected = selected
  const { description } = data
  const showInput = data.showInput
  const showOutput = data.showOutput && data.nodeType !== 'target'

  return (
    <div
      className={cn(
        'relative flex rounded-2xl border text-[var(--pipeline-text)]',
        isSelected ? 'border-pipeline-node-selected-border' : 'border-transparent',
      )}
      data-node-selected={isSelected ? 'true' : 'false'}
    >
      <div className="group relative w-60 rounded-[15px] border border-transparent bg-[var(--pipeline-surface)] pb-1 shadow-[var(--pipeline-shadow-node)] transition-shadow duration-150 hover:shadow-[var(--pipeline-shadow-node-hover)]">
        {showInput && (
          <PipelineHandle
            direction="input"
            nodeLabel={data.label}
            connected={data.hasInput}
            canAdd={data.canAddInput}
            nodeSelected={Boolean(isSelected)}
            onRequestAdd={
              data.onRequestAdd
                ? (handleDirection, screenPosition) =>
                    data.onRequestAdd?.(handleDirection, screenPosition)
                : undefined
            }
            isConnectable
          />
        )}
        <PipelineNodeToolbar
          nodeLabel={data.label}
          visible={Boolean(isSelected)}
          onRequestDelete={data.onRequestDelete}
        />
        <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-t-2xl px-3 pt-3 pb-2">
          <PipelineNodeIcon data={data} />
          <span className="min-w-0 truncate text-[13px] leading-4 font-semibold text-[var(--pipeline-text)]">
            {data.label}
          </span>
        </div>
        {description.trim() && (
          <p className="px-3 pt-1 pb-2 text-xs leading-[18px] wrap-break-word whitespace-pre-line text-[var(--pipeline-text-muted)]">
            {description}
          </p>
        )}
        {showOutput && (
          <PipelineHandle
            direction="output"
            nodeLabel={data.label}
            connected={data.hasOutput}
            canAdd={data.canAddOutput}
            nodeSelected={Boolean(isSelected)}
            isConnectable
            onRequestAdd={
              data.onRequestAdd
                ? (handleDirection, screenPosition) =>
                    data.onRequestAdd?.(handleDirection, screenPosition)
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
