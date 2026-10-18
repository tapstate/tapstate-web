import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { SkeletonRectangle } from '@langgenius/dify-ui/skeleton'
import { CircleIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from './cn'

export function Panel({
  className,
  variant = 'bordered',
  ...props
}: React.ComponentProps<'section'> & { variant?: 'bordered' | 'plain' }) {
  return (
    <section
      className={cn('ui-panel', className)}
      data-slot="panel"
      data-variant={variant}
      {...props}
    />
  )
}

export function SelectableCard({
  className,
  selected = false,
  children,
  ...props
}: Omit<React.ComponentProps<'button'>, 'aria-pressed'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn('ui-selectable-card', className)}
      data-slot="selectable-card"
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  )
}

interface RadioCardProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string
  disabled?: boolean
  required?: boolean
  name?: string
}

export function RadioCard({ className, children, ...props }: RadioCardProps) {
  return (
    <RadioPrimitive.Root
      className={cn('ui-radio-card', className)}
      data-slot="radio-card"
      {...props}
    >
      <RadioPrimitive.Indicator className="ui-radio-card-indicator" keepMounted>
        <CircleIcon aria-hidden="true" size={8} fill="currentColor" strokeWidth={0} />
      </RadioPrimitive.Indicator>
      {children}
    </RadioPrimitive.Root>
  )
}

export function ActionRow({
  type = 'button',
  className,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn('ui-action-row', className)}
      data-slot="action-row"
      {...props}
    />
  )
}

export function EmptyState({
  className,
  title,
  description,
  action,
  ...props
}: React.ComponentProps<'div'> & {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className={cn('ui-empty-state', className)} data-slot="empty-state" {...props}>
      <h2 className="ui-empty-state-title">{title}</h2>
      {description && <p className="ui-empty-state-description">{description}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <SkeletonRectangle aria-hidden="true" className={className} data-slot="skeleton" {...props} />
  )
}
