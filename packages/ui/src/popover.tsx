import {
  Popover as SourcePopover,
  PopoverClose as SourcePopoverClose,
  PopoverContent as SourcePopoverContent,
  PopoverTrigger as SourcePopoverTrigger,
} from './vendor/popover'
import * as React from 'react'

type PopoverRootProps = React.ComponentProps<typeof SourcePopover>
type ComposedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}
type PositionProps = {
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
}

function Popover(props: PopoverRootProps) {
  return <SourcePopover {...props} />
}

function PopoverTrigger({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <SourcePopoverTrigger data-slot="popover-trigger" render={child} {...props}>
      {child ? undefined : children}
    </SourcePopoverTrigger>
  )
}

function PopoverContent({
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  ...props
}: React.ComponentProps<typeof SourcePopoverContent> & PositionProps) {
  return (
    <SourcePopoverContent
      data-slot="popover-content"
      placement={align === 'center' ? side : `${side}-${align}`}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      {...props}
    />
  )
}

function PopoverClose({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <SourcePopoverClose data-slot="popover-close" render={child} {...props}>
      {child ? undefined : children}
    </SourcePopoverClose>
  )
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }
