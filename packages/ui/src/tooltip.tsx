import {
  Tooltip as SourceTooltip,
  TooltipContent as SourceTooltipContent,
  TooltipProvider as SourceTooltipProvider,
  TooltipTrigger as SourceTooltipTrigger,
} from '@langgenius/dify-ui/tooltip'
import * as React from 'react'

type TooltipRootProps = React.ComponentProps<typeof SourceTooltip>
type TooltipContentProps = React.ComponentProps<typeof SourceTooltipContent> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
}
type TooltipTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

function TooltipProvider(props: React.ComponentProps<typeof SourceTooltipProvider>) {
  return <SourceTooltipProvider {...props} />
}

function Tooltip(props: TooltipRootProps) {
  return <SourceTooltip {...props} />
}

function TooltipTrigger({ asChild = false, children, ...props }: TooltipTriggerProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <SourceTooltipTrigger data-slot="tooltip-trigger" render={child} {...props}>
      {child ? undefined : children}
    </SourceTooltipTrigger>
  )
}

function TooltipContent({ side = 'top', ...props }: TooltipContentProps) {
  return <SourceTooltipContent data-slot="tooltip-content" placement={side} {...props} />
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
