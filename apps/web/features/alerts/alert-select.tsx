import { Select } from '@tapstate-web/ui/select'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Choice = { value?: string | number; disabled?: boolean; children?: ReactNode }
type Change = { target: { value: string; selectedOptions: { value: string }[] } }
type Props = {
  children: ReactNode
  className?: string
  value?: string | number | readonly string[]
  multiple?: boolean
  disabled?: boolean
  required?: boolean
  'aria-label'?: string
  onChange?: (event: Change) => void
}

/** Keeps the alert form's typed choices on the shared, keyboard-accessible primitive. */
export function AlertSelect({
  children,
  className = 'w-full',
  value,
  multiple,
  disabled,
  required,
  onChange,
  ...label
}: Props) {
  const options = Children.toArray(children).filter((child): child is ReactElement<Choice> =>
    isValidElement<Choice>(child),
  )
  const choices = options.map((child) => ({
    value: String(child.props.value ?? child.props.children),
    label: child.props.children,
    disabled: child.props.disabled,
  }))
  const content = (
    <>
      <SelectTrigger {...label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value} disabled={choice.disabled}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </>
  )
  const change = (selected: string[]) =>
    onChange?.({
      target: { value: selected[0] ?? '', selectedOptions: selected.map((v) => ({ value: v })) },
    })
  return multiple ? (
    <Select<string, true>
      items={choices}
      multiple
      value={Array.isArray(value) ? [...value] : []}
      onValueChange={change}
      disabled={disabled}
      required={required}
    >
      {content}
    </Select>
  ) : (
    <Select
      items={choices}
      value={String(value ?? '')}
      onValueChange={(selected) => change(selected === null ? [] : [selected])}
      disabled={disabled}
      required={required}
    >
      {content}
    </Select>
  )
}
