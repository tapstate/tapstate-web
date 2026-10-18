import { Input as SourceInput } from '@langgenius/dify-ui/input'
import * as React from 'react'

import { cn } from './cn'
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

function Textarea({ className, id, ...props }: React.ComponentProps<'textarea'>) {
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
    <textarea
      id={id ?? field?.id}
      data-slot="textarea"
      className={cn('ui-textarea', className)}
      aria-describedby={describedBy || undefined}
      aria-invalid={ariaInvalid ?? field?.invalid ?? undefined}
      required={required ?? field?.required}
      {...rest}
    />
  )
}

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('ui-input-group', className)} data-slot="input-group" {...props} />
}

function InputAddon({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('ui-input-addon', className)} data-slot="input-addon" {...props} />
}

export { Input, InputAddon, InputGroup, Textarea }
