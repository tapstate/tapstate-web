import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-gray-100', className)}
      data-slot="skeleton"
      {...props}
    />
  )
}
