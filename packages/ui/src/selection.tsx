import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Checkbox as SourceCheckbox } from './vendor/checkbox'
import { Switch as SourceSwitch } from './vendor/switch'
import { CircleIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from './cn'

type CheckboxProps = React.ComponentProps<typeof SourceCheckbox>

interface RadioGroupProps extends React.ComponentProps<'div'> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
}

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string
  disabled?: boolean
  required?: boolean
  name?: string
}

type SwitchProps = React.ComponentProps<typeof SourceSwitch>

export function Checkbox(props: CheckboxProps) {
  return <SourceCheckbox data-slot="checkbox" {...props} />
}

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('ui-radio-group', className)}
      {...props}
    />
  )
}

export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioPrimitive.Root data-slot="radio" className={cn('ui-radio', className)} {...props}>
      <RadioPrimitive.Indicator keepMounted>
        <CircleIcon aria-hidden="true" size={8} fill="currentColor" strokeWidth={0} />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export function Switch(props: SwitchProps) {
  return <SourceSwitch data-slot="switch" {...props} />
}
