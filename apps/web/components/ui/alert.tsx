import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-[13px]', {
  variants: {
    variant: {
      default: 'border-gray-200 bg-white text-gray-700',
      destructive: 'border-red-200 bg-red-50 text-red-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface AlertProps extends ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      className={cn(alertVariants({ className, variant }))}
      data-slot="alert"
      role="alert"
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      data-slot="alert-title"
      {...props}
    />
  )
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-gray-600', className)} data-slot="alert-description" {...props} />
}
