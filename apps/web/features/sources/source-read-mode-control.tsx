import { SegmentedControl, SegmentedControlItem } from '@tapstate-web/ui/segmented-control'

interface SourceReadModeControlProps {
  ariaLabel: string
  disabled?: boolean
  modes: readonly string[]
  onChange: (value: string) => void
  value: string
}

export function SourceReadModeControl({
  ariaLabel,
  disabled = false,
  modes,
  onChange,
  value,
}: SourceReadModeControlProps) {
  return (
    <SegmentedControl
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      className="w-fit max-w-full"
    >
      {modes.map((mode) => (
        <SegmentedControlItem key={mode} value={mode} className="px-3">
          {mode}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
