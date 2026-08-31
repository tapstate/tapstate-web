import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface RouteTabItem<Value extends string = string> {
  value: Value
  label: ReactNode
}

interface RouteTabsProps<Value extends string> {
  items: readonly RouteTabItem<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  'aria-label': string
  className?: string
}

export function RouteTabs<Value extends string>({
  items,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  className,
}: RouteTabsProps<Value>) {
  return (
    <nav aria-label={ariaLabel} className={cn('min-w-0 overflow-x-auto', className)}>
      <div className="flex min-w-max items-center gap-5">
        {items.map((item) => {
          const active = item.value === value

          return (
            <button
              key={item.value}
              type="button"
              aria-current={active ? 'page' : undefined}
              data-active={active}
              className={cn(
                'text-muted-foreground relative inline-flex h-9 shrink-0 items-center border-b-2 border-transparent px-0.5 text-[13px] font-medium transition-colors outline-none',
                'hover:text-foreground focus-visible:ring-ring/50 hover:bg-transparent focus-visible:rounded-sm focus-visible:ring-2',
                'data-[active=true]:border-foreground data-[active=true]:text-foreground',
              )}
              onClick={() => onValueChange(item.value)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
