import type { ComponentProps } from 'react'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-gray-300 bg-white text-white shadow-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-gray-900 data-checked:bg-gray-900 data-indeterminate:border-gray-900 data-indeterminate:bg-gray-900',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator keepMounted className="inline-flex items-center justify-center">
        <CheckIcon className="size-3" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
