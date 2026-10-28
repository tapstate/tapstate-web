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

import { ConnectorIcon } from '@/components/connector-icon'
import { cn } from '@/lib/utils'

import type { CanvasNodeData } from './pipeline-canvas-types'

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

function nodeTone(nodeType: string, detail: string | null) {
  if (nodeType === 'source') return 'pipeline-canvas__node-kind--source'
  if (nodeType === 'target') return 'pipeline-canvas__node-kind--target'
  if (nodeType === 'view') return 'pipeline-canvas__node-kind--view'
  if (nodeType === 'serve') return 'pipeline-canvas__node-kind--serve'
  return ['filter', 'join', 'union', 'nest'].includes(detail ?? '')
    ? 'pipeline-canvas__node-kind--logic'
    : 'pipeline-canvas__node-kind--transform'
}

/** Renders a connector image with the same layered glass treatment as the node surface. */
export function PipelineNodeIcon({
  data,
}: {
  data: Pick<CanvasNodeData, 'connector' | 'detail' | 'nodeType'>
}) {
  return (
    <span className="pipeline-canvas__node-icon" aria-hidden="true">
      {data.connector ? (
        <ConnectorIcon
          connectorId={data.connector.id}
          name={data.connector.name}
          iconPath={data.connector.icon}
          size={24}
          className="pipeline-canvas__connector-icon"
          withBackdropLayer
        />
      ) : (
        <span
          className={cn(
            'pipeline-canvas__node-kind flex size-6 shrink-0 items-center justify-center rounded-lg shadow-md',
            nodeTone(data.nodeType, data.detail),
          )}
        >
          {fallbackIcon(data)}
        </span>
      )}
    </span>
  )
}
