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
  if (nodeType === 'source') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (nodeType === 'target') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (nodeType === 'view') return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (nodeType === 'serve') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

function NodeLeadingIcon({ data }: { data: CanvasNodeData }) {
  if (data.connector) {
    return (
      <ConnectorIcon
        connectorId={data.connector.id}
        name={data.connector.name}
        iconPath={data.connector.icon}
        size={24}
        className="rounded-md bg-white ring-1 ring-slate-200 ring-inset"
      />
    )
  }

  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset',
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
        'group relative w-56 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-150 hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.12)] motion-reduce:transition-none',
        selected && 'border-[#528bff] ring-2 ring-[#528bff]/25',
      )}
    >
      {data.hasInput && (
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          isConnectable={false}
          className={cn(
            '!top-1/2 !-left-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:left-1.5 before:h-3 before:w-0.5 before:-translate-y-1/2 before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
            selected && 'before:bg-[#528bff]',
          )}
          aria-label={t('pipelines.workspace.handles.input', { node: data.label })}
        />
      )}
      <div className="flex min-w-0 items-center gap-2">
        <NodeLeadingIcon data={data} />
        <span className="min-w-0 truncate text-[13px] leading-5 font-semibold text-slate-800">
          {data.label}
        </span>
      </div>
      <p className="mt-2 min-h-5 truncate px-0.5 text-[11px] leading-5 text-slate-500">
        {t(descriptionKey, { detail })}
      </p>
      {data.hasOutput && (
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={cn(
            '!top-1/2 !-right-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:right-1.5 before:h-3 before:w-0.5 before:-translate-y-1/2 before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
            selected && 'before:bg-[#528bff]',
          )}
          aria-label={t('pipelines.workspace.handles.output', { node: data.label })}
        />
      )}
    </div>
  )
}
