import type { ReactNode } from 'react'

import { connect, mapProps } from '@formily/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RadioOption = {
  disabled?: boolean
  label?: ReactNode
  value?: unknown
}

type SegmentedRadioProps = {
  'aria-label'?: string
  disabled?: boolean
  onChange?: (value: unknown) => void
  options?: Array<RadioOption | string | number>
  readOnly?: boolean
  value?: unknown
}

function normalizeOption(option: RadioOption | string | number): Required<RadioOption> {
  if (typeof option === 'object' && option !== null) {
    return {
      disabled: option.disabled ?? false,
      label: option.label ?? String(option.value ?? ''),
      value: option.value,
    }
  }

  return { disabled: false, label: String(option), value: option }
}

function SegmentedRadioGroup({
  'aria-label': ariaLabel,
  disabled = false,
  onChange,
  options = [],
  readOnly = false,
  value,
}: SegmentedRadioProps) {
  return (
    <div
      data-slot="button-group"
      className="border-border bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border p-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(normalizeOption).map((option) => {
        const selected = Object.is(option.value, value)

        return (
          <Button
            key={String(option.value)}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={selected}
            disabled={disabled || readOnly || option.disabled}
            className={cn(
              'shrink-0',
              selected
                ? 'bg-background text-foreground hover:bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
            )}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

/**
 * A Formily Radio.Group renderer using the application's shadcn button-group
 * visual language instead of AntD's radio-button styling.
 */
export const FormilySegmentedRadioGroup = connect(
  SegmentedRadioGroup,
  mapProps({ dataSource: 'options' }),
)
