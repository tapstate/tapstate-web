import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import * as React from 'react'

import { cn } from './cn'

interface PopoverRootProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

type ComposedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

interface PositionProps {
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
}

function Popover(props: PopoverRootProps) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" render={child} {...props}>
      {child ? undefined : children}
    </PopoverPrimitive.Trigger>
  )
}

function PopoverContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  children,
  ...props
}: React.ComponentProps<'div'> & PositionProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="ui-popover-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn('ui-popover-content', className)}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverClose({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <PopoverPrimitive.Close data-slot="popover-close" render={child} {...props}>
      {child ? undefined : children}
    </PopoverPrimitive.Close>
  )
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }
