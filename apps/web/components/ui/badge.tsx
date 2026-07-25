import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white ring-gray-900/10',
        secondary: 'bg-gray-50 text-gray-600 ring-gray-600/15',
        destructive: 'bg-red-50 text-red-700 ring-red-600/15',
        outline: 'bg-white text-gray-600 ring-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ className, variant }))} data-slot='badge' {...props} />
}

export { badgeVariants }
