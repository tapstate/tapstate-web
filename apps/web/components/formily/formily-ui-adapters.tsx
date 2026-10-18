import type { Field as FormilyFieldState } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@tapstate-web/ui'
import { isValidElement, type ComponentType, type ReactNode } from 'react'

type FormilyFieldProps = {
  value?: string | number
  onChange?: (value: unknown) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-busy'?: boolean | 'true' | 'false'
}

type FormilyFieldDecoratorProps = {
  label?: ReactNode
  description?: ReactNode
  feedbackStatus?: string
  feedbackText?: ReactNode
  required?: boolean
  pending?: boolean
  children?: ReactNode
  className?: string
}

function FormilyFieldDecoratorBase({
  label,
  description,
  feedbackStatus,
  feedbackText,
  required,
  pending,
  children,
  className,
}: FormilyFieldDecoratorProps) {
  const error = feedbackStatus === 'error' ? feedbackText : undefined
  return (
    <Field
      label={label ?? ''}
      description={description}
      error={error}
      required={required}
      pending={pending}
      className={className}
    >
      {children}
    </Field>
  )
}

export const FormilyFieldDecorator = connect(
  FormilyFieldDecoratorBase,
  mapProps((props, untypedField) => {
    const field = untypedField as FormilyFieldState | undefined
    const error = field?.errors?.find((feedback) => feedback.messages?.length)?.messages?.[0]
    return {
      ...props,
      label: props.label ?? (typeof field?.title === 'string' ? field.title : undefined),
      description: props.description ?? field?.description,
      required: props.required ?? field?.required,
      pending: props.pending ?? Boolean(field?.loading || field?.validating || field?.submitting),
      feedbackStatus: props.feedbackStatus ?? (error ? 'error' : undefined),
      feedbackText: props.feedbackText ?? error,
    }
  }),
)

function formilyProps(props: FormilyFieldProps, field?: FormilyFieldState) {
  const originalOnChange = props.onChange
  return {
    ...props,
    value: field?.value ?? props.value,
    disabled: props.disabled ?? field?.disabled,
    required: props.required ?? field?.required,
    'aria-invalid': field?.validateStatus === 'error' || undefined,
    'aria-busy': field?.loading || field?.validating || field?.submitting || undefined,
    onChange: (eventOrValue: unknown) => {
      const value =
        typeof eventOrValue === 'object' && eventOrValue !== null && 'target' in eventOrValue
          ? (eventOrValue as { target: HTMLInputElement }).target.value
          : eventOrValue
      originalOnChange?.(value)
    },
  }
}

export const FormilyInput = connect(
  Input as ComponentType<FormilyFieldProps>,
  mapProps((props, field) => formilyProps(props, field as FormilyFieldState | undefined)),
)

export const FormilyTextarea = connect(
  Textarea as ComponentType<FormilyFieldProps>,
  mapProps((props, field) => {
    const { onChange, ...mapped } = formilyProps(props, field as FormilyFieldState | undefined)
    return { ...mapped, onValueChange: onChange }
  }),
)

export const FormilyNumberInput = connect(
  Input as ComponentType<FormilyFieldProps>,
  mapProps((props, untypedField) => {
    const field = untypedField as FormilyFieldState | undefined
    const originalOnChange = props.onChange
    return {
      ...props,
      type: 'number',
      value: field?.value ?? props.value,
      disabled: props.disabled ?? field?.disabled,
      required: props.required ?? field?.required,
      'aria-invalid': field?.validateStatus === 'error' || undefined,
      'aria-busy': field?.loading || field?.validating || field?.submitting || undefined,
      onChange: (eventOrValue: unknown) => {
        const target =
          typeof eventOrValue === 'object' && eventOrValue !== null && 'target' in eventOrValue
            ? (eventOrValue as { target: HTMLInputElement }).target
            : undefined
        const next = target
          ? target.value === ''
            ? undefined
            : target.valueAsNumber
          : eventOrValue
        originalOnChange?.(next)
      },
    }
  }),
)

interface SelectOption {
  label: ReactNode
  sourceValue?: unknown
  value: string
  disabled?: boolean
}

function formilySelectOptions(dataSource: unknown): SelectOption[] {
  if (!Array.isArray(dataSource)) return []

  return dataSource.flatMap((entry, index): SelectOption[] => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return [
        {
          label: String(entry),
          sourceValue: entry,
          value: `formily-option-${index}`,
        },
      ]
    }
    if (typeof entry !== 'object' || entry === null) return []

    const option = entry as Record<string, unknown>
    if (typeof option.value !== 'string' && typeof option.value !== 'number') return []

    const fallbackLabel = String(option.value)
    const label =
      typeof option.label === 'string' ||
      typeof option.label === 'number' ||
      isValidElement(option.label)
        ? option.label
        : fallbackLabel

    return [
      {
        label,
        sourceValue: option.value,
        value: `formily-option-${index}`,
        disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined,
      },
    ]
  })
}

interface FormilySelectProps extends FormilyFieldProps {
  options?: readonly SelectOption[]
  allowClear?: boolean
}

function FormilySelectBase({
  value,
  onChange,
  disabled,
  options = [],
  placeholder,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  required,
  'aria-busy': ariaBusy,
}: FormilySelectProps) {
  const selectedValue =
    options.find((option) => Object.is(option.sourceValue ?? option.value, value))?.value ??
    (typeof value === 'string' ? value : null)
  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => {
        const selectedOption = options.find((option) => option.value === nextValue)
        onChange?.(selectedOption?.sourceValue ?? nextValue)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-required={required || undefined}
        aria-busy={ariaBusy}
      >
        <SelectValue placeholder={placeholder}>
          {(selectedValue) =>
            options.find((option) => option.value === selectedValue)?.label ?? selectedValue
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const FormilySelect = connect(
  FormilySelectBase,
  mapProps((props, untypedField) => {
    const field = untypedField as FormilyFieldState | undefined
    return {
      ...props,
      value: field?.value ?? props.value,
      disabled: props.disabled ?? field?.disabled,
      required: props.required ?? field?.required,
      options: props.options ?? formilySelectOptions(field?.dataSource),
      'aria-busy': field?.loading || field?.validating || field?.submitting || undefined,
      onChange: (value: unknown) => field?.onInput(value),
    }
  }),
)

function PasswordInput(props: FormilyFieldProps) {
  return <Input {...props} type="password" />
}

export const FormilyPassword = connect(
  PasswordInput as ComponentType<FormilyFieldProps>,
  mapProps((props, field) => formilyProps(props, field as FormilyFieldState | undefined)),
)
