import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export function PipelineHandle({
  direction,
  nodeLabel,
  connected = false,
  isConnectable = true,
}: {
  direction: 'input' | 'output'
  nodeLabel: string
  connected?: boolean
  isConnectable?: boolean
}) {
  const { t } = useTranslation()
  const isInput = direction === 'input'

  return (
    <Handle
      id={direction}
      type={isInput ? 'target' : 'source'}
      position={isInput ? Position.Left : Position.Right}
      isConnectable={isConnectable}
      className={cn(
        'pipeline-canvas__handle',
        isInput ? 'pipeline-canvas__handle--input' : 'pipeline-canvas__handle--output',
      )}
      aria-label={t(`pipelines.workspace.handles.${direction}`, { node: nodeLabel })}
      data-handle-role={direction}
      data-handle-direction={direction}
      data-handle-connected={connected ? 'true' : 'false'}
      data-handle-connectable={isConnectable ? 'true' : 'false'}
    />
  )
}
