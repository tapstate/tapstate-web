import { cn } from '@tapstate-web/ui/cn'
import {
  ScrollArea as SourceScrollArea,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@tapstate-web/ui/scroll-area'

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SourceScrollArea>) {
  return (
    <SourceScrollArea
      {...props}
      data-slot="scroll-area"
      className={cn('relative min-h-0 overflow-hidden', className)}
    >
      <ScrollAreaViewport data-slot="scroll-area-viewport">{children}</ScrollAreaViewport>
      <ScrollBar />
      <ScrollAreaCorner />
    </SourceScrollArea>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaScrollbar>) {
  return (
    <ScrollAreaScrollbar
      {...props}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={className}
    >
      <ScrollAreaThumb />
    </ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
