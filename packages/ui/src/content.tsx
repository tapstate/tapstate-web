import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { SkeletonRectangle } from '@langgenius/dify-ui/skeleton'
import { CircleIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from './cn'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: Tone
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | Tone
}

function normalizeTone(variant?: BadgeProps['variant'], tone?: Tone): Tone {
  if (tone) return tone
  if (variant === 'destructive') return 'danger'
  if (variant === 'secondary' || variant === 'outline') return 'neutral'
  if (variant === 'default') return 'brand'
  return variant ?? 'neutral'
}

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <span
      className={cn('ui-badge', className)}
      data-slot="badge"
      data-tone={normalizeTone(variant, tone)}
      {...props}
    />
  )
}

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

export function TableContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('ui-table-container', className)} data-slot="table-container" {...props} />
  )
}

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return <table className={cn('ui-table', className)} data-slot="table" {...props} />
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={className} data-slot="table-header" {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={className} data-slot="table-body" {...props} />
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return <tfoot className={className} data-slot="table-footer" {...props} />
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={className} data-slot="table-row" {...props} />
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={className} data-slot="table-head" {...props} />
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={className} data-slot="table-cell" {...props} />
}
