import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20 flex min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-[13px] shadow-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  )
}
