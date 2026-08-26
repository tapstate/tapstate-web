import type { NodeProps } from '@xyflow/react'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { CanvasNode } from './pipeline-canvas-types'

import { PipelineHandle } from './pipeline-handle'
import { PipelineNodeIcon } from './pipeline-node-icon'

/** Renders a selectable Pipeline node with connector-aware source and target marks. */
export function PipelineNode({ data, selected }: NodeProps<CanvasNode>) {
  const { t } = useTranslation()
  const detail = data.detail ?? t('pipelines.workspace.nodeDescriptions.defaultDetail')
  const descriptionKey = `pipelines.workspace.nodeDescriptions.${data.nodeType}`

  return (
    <div
      className={cn(
        'pipeline-canvas__node group relative w-56 px-3 py-3 motion-reduce:transition-none',
        selected && 'pipeline-canvas__node--selected',
      )}
    >
      {data.showInput && (
        <PipelineHandle direction="input" nodeLabel={data.label} connected={data.hasInput} />
      )}
      <div className="pipeline-canvas__node-header flex min-w-0 items-center gap-2">
        <PipelineNodeIcon data={data} />
        <span className="pipeline-canvas__node-title min-w-0 truncate text-[13px] leading-5 font-semibold">
          {data.label}
        </span>
      </div>
      <p className="pipeline-canvas__node-description mt-2 min-h-5 truncate px-0.5 text-[11px] leading-5">
        {t(descriptionKey, { detail })}
      </p>
      {data.showOutput && (
        <PipelineHandle direction="output" nodeLabel={data.label} connected={data.hasOutput} />
      )}
    </div>
  )
}
