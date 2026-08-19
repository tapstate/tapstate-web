import { createForm, onFieldValueChange, type Form } from '@formily/core'
import type { ISchema } from '@formily/json-schema'
import type { ComponentType } from 'react'

import { createSchemaField, FormProvider } from '@formily/react'
import { useMemo, useRef } from 'react'

/**
 * A Formily bridge independent from any visual component library.
 * Applications inject their own controls, such as shadcn adapters.
 */
export type FormilyComponentMap = Record<string, ComponentType<any>>

export interface FormilySchemaProps {
  form: Form
  schema: ISchema
  components: FormilyComponentMap
  className?: string
  schemaKey?: string
}

export interface UseFormilyFormOptions<T extends Record<string, unknown>> {
  resetKey?: string
  initialValues?: T
  onValuesChange?: (values: T) => void
}

export function useFormilyForm<T extends Record<string, unknown>>({
  resetKey,
  initialValues,
  onValuesChange,
}: UseFormilyFormOptions<T>) {
  const callback = useRef(onValuesChange)
  callback.current = onValuesChange
  const pendingValues = useRef<T | undefined>(undefined)
  const notificationQueued = useRef(false)

  function notify(values: T) {
    pendingValues.current = values
    if (notificationQueued.current) return
    notificationQueued.current = true
    queueMicrotask(() => {
      notificationQueued.current = false
      const nextValues = pendingValues.current
      pendingValues.current = undefined
      if (nextValues !== undefined) callback.current?.(nextValues)
    })
  }

  return useMemo(
    () =>
      createForm({
        initialValues,
        effects: () => {
          onFieldValueChange('*', (_field, nextForm) => {
            notify(nextForm.values as T)
          })
        },
      }),
    [resetKey],
  )
}

export function FormilySchema({
  form,
  schema,
  components,
  className = 'grid gap-3 sm:grid-cols-2',
  schemaKey,
}: FormilySchemaProps) {
  const SchemaField = useMemo(() => createSchemaField({ components }), [components])

  return (
    <FormProvider form={form}>
      <div className={className}>
        <SchemaField key={schemaKey} schema={schema} />
      </div>
    </FormProvider>
  )
}
