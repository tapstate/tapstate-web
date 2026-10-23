import {
  Select as SourceSelect,
  SelectContent as SourceSelectContent,
  SelectGroup as SourceSelectGroup,
  SelectGroupLabel as SourceSelectGroupLabel,
  SelectItem as SourceSelectItem,
  SelectItemIndicator as SourceSelectItemIndicator,
  SelectItemText as SourceSelectItemText,
  SelectSeparator as SourceSelectSeparator,
  SelectTrigger as SourceSelectTrigger,
  SelectValue as SourceSelectValue,
} from '@langgenius/dify-ui/select'
import * as React from 'react'

import { useFieldContext } from './field'

type SelectRootProps = React.ComponentProps<typeof SourceSelect<string>>

function collectItems(children: React.ReactNode, items: Record<string, React.ReactNode>) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: string; children?: React.ReactNode }>(child)) return
    if (child.type === SelectItem && child.props.value !== undefined) {
      items[child.props.value] = child.props.children
    } else {
      collectItems(child.props.children, items)
    }
  })
}

function Select({ children, items: suppliedItems, ...props }: SelectRootProps) {
  const items: Record<string, React.ReactNode> = {}
  collectItems(children, items)
  return (
    <SourceSelect<string> items={suppliedItems ?? items} {...props}>
      {children}
    </SourceSelect>
  )
}

function SelectGroup(props: React.ComponentProps<typeof SourceSelectGroup>) {
  return <SourceSelectGroup {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SourceSelectValue<string>>) {
  return <SourceSelectValue<string> {...props} />
}

function SelectTrigger(props: React.ComponentProps<typeof SourceSelectTrigger>) {
  const field = useFieldContext()
  const {
    'aria-describedby': customDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    ...rest
  } = props
  const describedBy = [
    customDescribedBy,
    field?.hasDescription ? field.descriptionId : undefined,
    field?.hasError ? field.errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <SourceSelectTrigger
      data-slot="select-trigger"
      id={props.id ?? field?.id}
      aria-describedby={describedBy || undefined}
      aria-invalid={ariaInvalid ?? field?.invalid ?? undefined}
      aria-required={ariaRequired ?? field?.required ?? undefined}
      {...rest}
    />
  )
}

type SelectPositionProps = {
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

function SelectContent({
  align = 'start',
  side = 'bottom',
  ...props
}: React.ComponentProps<typeof SourceSelectContent> & SelectPositionProps) {
  return (
    <SourceSelectContent placement={align === 'center' ? side : `${side}-${align}`} {...props} />
  )
}

function SelectLabel(props: React.ComponentProps<typeof SourceSelectGroupLabel>) {
  return <SourceSelectGroupLabel {...props} />
}

function SelectItem({ children, ...props }: React.ComponentProps<typeof SourceSelectItem<string>>) {
  return (
    <SourceSelectItem<string> data-slot="select-item" {...props}>
      <SourceSelectItemText>{children}</SourceSelectItemText>
      <SourceSelectItemIndicator />
    </SourceSelectItem>
  )
}

function SelectSeparator(props: React.ComponentProps<typeof SourceSelectSeparator>) {
  return <SourceSelectSeparator {...props} />
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
