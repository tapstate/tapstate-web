import type { ReactNode } from 'react'

import { connect, mapProps } from '@formily/react'
import { SegmentedControl, SegmentedControlItem } from '@langgenius/dify-ui/segmented-control'

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
    <SegmentedControl
      aria-label={ariaLabel}
      disabled={disabled || readOnly}
      value={value}
      onValueChange={onChange}
    >
      {options.map(normalizeOption).map((option) => {
        return (
          <SegmentedControlItem
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SegmentedControlItem>
        )
      })}
    </SegmentedControl>
  )
}

/**
 * A Formily Radio.Group renderer using the vendored Dify segmented control.
 */
export const FormilySegmentedRadioGroup = connect(
  SegmentedRadioGroup,
  mapProps({ dataSource: 'options' }),
)
