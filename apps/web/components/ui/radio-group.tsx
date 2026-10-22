import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const radioGroupItemVariants = cva(
  'bg-background inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50',
  {
    variants: {
      tone: {
        default:
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 data-checked:border-primary',
        destructive:
          'border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20 data-checked:border-destructive',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

const radioGroupIndicatorVariants = cva('size-2 rounded-full data-unchecked:hidden', {
  variants: {
    tone: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: { tone: 'default' },
})

function RadioGroup<Value>({ className, ...props }: RadioGroupPrimitive.Props<Value>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid gap-2', className)}
      {...props}
    />
  )
}

function RadioGroupItem<Value>({
  className,
  tone,
  ...props
}: RadioPrimitive.Root.Props<Value> & VariantProps<typeof radioGroupItemVariants>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(radioGroupItemVariants({ tone }), className)}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={radioGroupIndicatorVariants({ tone })}
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
