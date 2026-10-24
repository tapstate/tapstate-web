'use client'

import { cn } from '../cn'
import { Spinner } from '../spinner'

type LoadingPlaceholderProps = {
  label: string
  className?: string
}

function LoadingPlaceholder({ label, className }: LoadingPlaceholderProps) {
  return (
    <div className={cn('flex w-full items-center justify-center', className)}>
      <Spinner aria-label={label} />
    </div>
  )
}

export { LoadingPlaceholder }
export type { LoadingPlaceholderProps }
