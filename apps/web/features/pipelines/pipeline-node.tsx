import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  ArrowDownToLine,
  Boxes,
  Braces,
  Code2,
  Combine,
  Database,
  Filter,
  GitFork,
  GitMerge,
  Radio,
  WandSparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ConnectorIcon } from '@/components/connector-icon'
import { cn } from '@/lib/utils'

import type { CanvasNode, CanvasNodeData } from './pipeline-canvas-types'

function fallbackIcon({ nodeType, detail }: Pick<CanvasNodeData, 'nodeType' | 'detail'>) {
  if (nodeType === 'source') return <Database className="size-4" aria-hidden="true" />
  if (nodeType === 'target') return <ArrowDownToLine className="size-4" aria-hidden="true" />
  if (nodeType === 'view') return <GitFork className="size-4" aria-hidden="true" />
  if (nodeType === 'serve') return <Radio className="size-4" aria-hidden="true" />
  if (detail === 'filter') return <Filter className="size-4" aria-hidden="true" />
  if (detail === 'map') return <Braces className="size-4" aria-hidden="true" />
  if (detail === 'union') return <Combine className="size-4" aria-hidden="true" />
  if (detail === 'nest') return <Boxes className="size-4" aria-hidden="true" />
  if (detail === 'join') return <GitMerge className="size-4" aria-hidden="true" />
  if (detail === 'js') return <Code2 className="size-4" aria-hidden="true" />
  return <WandSparkles className="size-4" aria-hidden="true" />
}

function nodeTone(nodeType: string) {
  if (nodeType === 'source') return 'pipeline-canvas__node-kind--source'
  if (nodeType === 'target') return 'pipeline-canvas__node-kind--target'
  if (nodeType === 'view') return 'pipeline-canvas__node-kind--view'
  if (nodeType === 'serve') return 'pipeline-canvas__node-kind--serve'
  return 'pipeline-canvas__node-kind--transform'
}

function NodeLeadingIcon({ data }: { data: CanvasNodeData }) {
  if (data.connector) {
    return (
      <ConnectorIcon
        connectorId={data.connector.id}
        name={data.connector.name}
        iconPath={data.connector.icon}
        size={24}
        className="pipeline-canvas__connector-icon"
      />
    )
  }

  return (
    <span
      className={cn(
        'pipeline-canvas__node-kind flex size-6 shrink-0 items-center justify-center rounded-md',
        nodeTone(data.nodeType),
      )}
    >
      {fallbackIcon(data)}
    </span>
  )
}

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
      {data.hasInput && (
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          isConnectable={false}
          className={cn('pipeline-canvas__handle pipeline-canvas__handle--input')}
          aria-label={t('pipelines.workspace.handles.input', { node: data.label })}
        />
      )}
      <div className="flex min-w-0 items-center gap-2">
        <NodeLeadingIcon data={data} />
        <span className="pipeline-canvas__node-title min-w-0 truncate text-[13px] leading-5 font-semibold">
          {data.label}
        </span>
      </div>
      <p className="pipeline-canvas__node-description mt-2 min-h-5 truncate px-0.5 text-[11px] leading-5">
        {t(descriptionKey, { detail })}
      </p>
      {data.hasOutput && (
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={cn('pipeline-canvas__handle pipeline-canvas__handle--output')}
          aria-label={t('pipelines.workspace.handles.output', { node: data.label })}
        />
      )}
    </div>
  )
}
