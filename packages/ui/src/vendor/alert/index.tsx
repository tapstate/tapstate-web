'use client'

import { memo } from 'react'
import { cn } from '../cn'
import { IconButton } from '../icon-button'

type AlertProps = Readonly<{
  message: string
  onHide: () => void
  closeLabel: string
  className?: string
}>

function Alert({ message, onHide, closeLabel, className }: AlertProps) {
  return (
    <div className={cn('pointer-events-none w-full', className)} role="status">
      <div className="relative flex space-x-1 overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg-blur p-3 shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-components-badge-status-light-normal-halo to-background-gradient-mask-transparent opacity-[0.4]" />
        <div className="flex size-6 items-center justify-center">
          <span className="i-ri-information-2-fill text-text-accent" aria-hidden="true" />
        </div>
        <div className="p-1">
          <div className="system-xs-regular text-text-secondary">{message}</div>
        </div>
        <IconButton aria-label={closeLabel} className="pointer-events-auto" size="md" onClick={onHide}>
          <span className="i-ri-close-line size-4 text-text-tertiary" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

export default memo(Alert)
