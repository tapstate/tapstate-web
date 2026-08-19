import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  )
}
