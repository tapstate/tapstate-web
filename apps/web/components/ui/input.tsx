import { Input as SourceInput } from '@tapstate-web/ui/input'
import {
  InputGroup as SourceInputGroup,
  InputGroupAddon as SourceInputGroupAddon,
  InputGroupInput as SourceInputGroupInput,
} from '@tapstate-web/ui/input-group'
import { Textarea as SourceTextarea } from '@tapstate-web/ui/textarea'
import * as React from 'react'

import { useFieldContext } from './field'

type InputProps = React.ComponentProps<'input'>

function Input({ className, id, ...props }: InputProps) {
  const field = useFieldContext()
  const {
    'aria-describedby': customDescribedBy,
    'aria-invalid': ariaInvalid,
    required,
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
    <SourceInput
      id={id ?? field?.id}
      data-slot="input"
      className={className}
      aria-describedby={describedBy || undefined}
      aria-invalid={ariaInvalid ?? field?.invalid ?? undefined}
      required={required ?? field?.required}
      {...rest}
    />
  )
}

function Textarea({ id, ...props }: React.ComponentProps<typeof SourceTextarea>) {
  const field = useFieldContext()
  const {
    'aria-describedby': customDescribedBy,
    'aria-invalid': ariaInvalid,
    required,
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
    <SourceTextarea
      id={id ?? field?.id}
      data-slot="textarea"
      aria-describedby={describedBy || undefined}
      aria-invalid={ariaInvalid ?? field?.invalid ?? undefined}
      required={required ?? field?.required}
      {...rest}
    />
  )
}

function InputGroupInput({ id, ...props }: React.ComponentProps<typeof SourceInputGroupInput>) {
  const field = useFieldContext()
  const {
    'aria-describedby': customDescribedBy,
    'aria-invalid': ariaInvalid,
    required,
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
    <SourceInputGroupInput
      id={id ?? field?.id}
      aria-describedby={describedBy || undefined}
      aria-invalid={ariaInvalid ?? field?.invalid ?? undefined}
      required={required ?? field?.required}
      {...rest}
    />
  )
}

export {
  Input,
  SourceInputGroupAddon as InputAddon,
  SourceInputGroup as InputGroup,
  InputGroupInput,
  Textarea,
}
