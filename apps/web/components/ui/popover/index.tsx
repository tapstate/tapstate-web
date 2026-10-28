import type { ComponentProps } from 'react'

import { Popover as Primitive } from '@base-ui/react/popover'

import { cn } from '@/lib/utils'

export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger
export const PopoverClose = Primitive.Close

export function PopoverContent({ className, ...props }: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        side="bottom"
        align="end"
        sideOffset={8}
        className="z-(--z-overlay-popover)"
      >
        <Primitive.Popup
          className={cn(
            'border-popover-border bg-popover text-popover-foreground rounded-surface data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 border p-4 shadow-lg outline-hidden',
            className,
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}
