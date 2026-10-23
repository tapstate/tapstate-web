import type { ReactNode } from 'react'

import { cn } from './cn'

export interface RouteTabItem<Value extends string = string> {
  value: Value
  label: ReactNode
}

export interface RouteTabsProps<Value extends string> {
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
    <nav aria-label={ariaLabel} className={cn('ui-route-tabs', className)}>
      <div className="ui-route-tabs-list">
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              aria-current={active ? 'page' : undefined}
              aria-pressed={active}
              data-active={active || undefined}
              className="ui-route-tab"
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
