import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { cn } from '@tapstate-web/ui/cn'

function ScrollArea({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('ui-scroll-area', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="ui-scroll-area-viewport">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'vertical' | 'horizontal' }) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn('ui-scroll-area-scrollbar', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="ui-scroll-area-thumb" />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
