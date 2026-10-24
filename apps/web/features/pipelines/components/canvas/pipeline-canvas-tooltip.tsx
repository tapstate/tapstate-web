import type { ReactElement } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@tapstate-web/ui/tooltip'

export function PipelineCanvasTooltip({
  label,
  children,
}: {
  label: string
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent sideOffset={4} className="flex max-w-none items-center gap-1">
        <span className="px-0.5">{label}</span>
      </TooltipContent>
    </Tooltip>
  )
}
