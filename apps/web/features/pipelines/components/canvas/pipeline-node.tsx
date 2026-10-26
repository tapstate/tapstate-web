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
  const configuredSource =
    data.configuration?.kind === 'source' || data.configuration?.kind === 'target'
      ? data.configuration.sourceId
      : null
  const nodeDetail = configuredSource || data.detail

  return (
    <div
      className={cn(
        'text-text-primary relative flex rounded-2xl border',
        isSelected ? 'border-components-option-card-option-selected-border' : 'border-transparent',
      )}
      data-node-selected={isSelected ? 'true' : 'false'}
    >
      <div className="group bg-workflow-block-bg relative w-60 rounded-[15px] border border-transparent pb-1 shadow-xs hover:shadow-lg">
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
        <div className="flex items-center rounded-t-2xl px-3 pt-3 pb-2">
          <div className="mr-1 flex min-w-0 grow items-center">
            <span className="mr-2 shrink-0">
              <PipelineNodeIcon data={data} />
            </span>
            <span
              className="system-sm-semibold-uppercase text-text-primary min-w-0 grow truncate"
              title={data.label}
            >
              {data.label}
            </span>
          </div>
        </div>
        {nodeDetail && data.nodeType !== 'source' && data.nodeType !== 'target' && (
          <div
            className="mx-3 mb-2 truncate rounded-md bg-[var(--pipeline-surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--pipeline-text-muted)]"
            title={nodeDetail}
          >
            {nodeDetail}
          </div>
        )}
        {description.trim() && (
          <p
            className="line-clamp-2 px-3 pt-1 pb-2 text-xs leading-[18px] wrap-break-word whitespace-pre-line text-[var(--pipeline-text-muted)]"
            title={description}
          >
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
