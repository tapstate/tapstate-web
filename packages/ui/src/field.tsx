import {
  Field as SourceField,
  FieldDescription as SourceFieldDescription,
  FieldError as SourceFieldError,
  FieldLabel as SourceFieldLabel,
} from './vendor/field'
import { SpinnerIcon } from './vendor/spinner'
import * as React from 'react'

interface FieldContextValue {
  id: string
  descriptionId: string
  errorId: string
  invalid: boolean
  required: boolean
  hasDescription: boolean
  hasError: boolean
  pending: boolean
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

export function useFieldContext() {
  return React.useContext(FieldContext)
}

export interface FieldProps extends Omit<React.ComponentProps<'div'>, 'id'> {
  id?: string
  label: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  pending?: boolean
}

export function Field({
  id,
  label,
  description,
  error,
  required = false,
  pending = false,
  children,
  className,
  ...props
}: FieldProps) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId
  const context = React.useMemo<FieldContextValue>(
    () => ({
      id: controlId,
      descriptionId: `${controlId}-description`,
      errorId: `${controlId}-error`,
      invalid: Boolean(error),
      required,
      hasDescription: Boolean(description),
      hasError: Boolean(error),
      pending,
    }),
    [controlId, description, error, pending, required],
  )

  return (
    <FieldContext.Provider value={context}>
      <SourceField
        className={className}
        invalid={context.invalid}
        data-invalid={context.invalid || undefined}
        data-pending={pending || undefined}
        aria-busy={pending || undefined}
        {...props}
      >
        <FieldLabel>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </FieldLabel>
        {children}
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </SourceField>
    </FieldContext.Provider>
  )
}

export function FieldLabel({ className, htmlFor, ...props }: React.ComponentProps<'label'>) {
  const context = useFieldContext()
  return (
    <SourceFieldLabel className={className} htmlFor={htmlFor ?? context?.id} {...props}>
      {props.children}
      {context?.pending && <SpinnerIcon size="small" className="ms-1" />}
    </SourceFieldLabel>
  )
}

export function FieldDescription({ className, id, ...props }: React.ComponentProps<'p'>) {
  const context = useFieldContext()
  return (
    <SourceFieldDescription className={className} id={id ?? context?.descriptionId} {...props} />
  )
}

export function FieldError({ className, id, ...props }: React.ComponentProps<'p'>) {
  const context = useFieldContext()
  return (
    <SourceFieldError
      match
      className={className}
      id={id ?? context?.errorId}
      aria-live="polite"
      {...props}
    />
  )
}
