import type { NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'

import type { CanvasNode } from './pipeline-canvas-types'

import { PipelineHandle } from './pipeline-handle'
import { PipelineNodeIcon } from './pipeline-node-icon'

/** Renders a selectable Pipeline node with connector-aware source and target marks. */
export function PipelineNode({ data, selected }: NodeProps<CanvasNode>) {
  const { description } = data

  return (
    <div
      className={cn(
        'pipeline-canvas__node group relative w-60 motion-reduce:transition-none',
        selected && 'pipeline-canvas__node--selected',
      )}
    >
      <div className="pipeline-canvas__node-surface">
        {data.showInput && (
          <PipelineHandle direction="input" nodeLabel={data.label} connected={data.hasInput} />
        )}
        <div className="pipeline-canvas__node-header flex min-w-0 items-center gap-2 rounded-t-2xl px-3 pt-3 pb-2">
          <PipelineNodeIcon data={data} />
          <span className="pipeline-canvas__node-title min-w-0 truncate text-[13px] leading-4 font-semibold uppercase">
            {data.label}
          </span>
        </div>
        {description.trim() && (
          <p className="pipeline-canvas__node-description px-3 pt-1 pb-2 text-xs leading-[18px] wrap-break-word whitespace-pre-line">
            {description}
          </p>
        )}
        {data.showOutput && (
          <PipelineHandle direction="output" nodeLabel={data.label} connected={data.hasOutput} />
        )}
      </div>
    </div>
  )
}
