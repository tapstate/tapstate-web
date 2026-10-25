'use client'

import type { ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../cn'

type FirstEmptyActionCardProps = {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  className?: string
}

function FirstEmptyActionCard({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  disabledReason,
  className,
}: FirstEmptyActionCardProps) {
  const descriptionId = useId()

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={disabled ? title : undefined}
      aria-describedby={disabled ? descriptionId : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-components-button-secondary-bg px-3 py-2.5 text-left shadow-xs backdrop-blur-md transition-colors hover:bg-components-panel-on-panel-item-bg-hover focus-visible:ring-2 focus-visible:ring-state-accent-solid focus-visible:outline-hidden',
        disabled &&
          'cursor-not-allowed text-text-disabled shadow-none hover:bg-components-button-secondary-bg',
        className,
      )}
      onClick={disabled ? undefined : onClick}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-section text-text-tertiary',
          disabled && 'text-text-disabled',
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn('truncate system-md-medium text-text-secondary', disabled && 'text-text-disabled')}
          title={title}
        >
          {title}
        </span>
        <span
          className={cn('truncate system-xs-regular text-text-tertiary', disabled && 'text-text-disabled')}
          title={description}
        >
          {description}
        </span>
      </span>
      {disabledReason && (
        <span className="ml-3 shrink-0 system-xs-medium text-text-disabled">
          {disabledReason}
        </span>
      )}
      {disabled && (
        <span id={descriptionId} className="sr-only">
          {description} {disabledReason}
        </span>
      )}
    </button>
  )
}

export { FirstEmptyActionCard }
export type { FirstEmptyActionCardProps }
