import { SkeletonRectangle } from './vendor/skeleton'
import * as React from 'react'

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <SkeletonRectangle aria-hidden="true" className={className} data-slot="skeleton" {...props} />
  )
}
