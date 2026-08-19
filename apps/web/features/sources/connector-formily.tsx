import type { ISchema } from '@formily/json-schema'
import type { ReactNode } from 'react'

import { createForm, onFieldValueChange } from '@formily/core'
import {
  connect,
  createSchemaField,
  FormProvider,
  mapProps,
  observer,
  useField,
} from '@formily/react'
import { Eye, EyeOff, KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { SourceConfigState } from './source-form'

import {
  connectorFormKey,
  connectorFieldsToFormilySchema,
  formilyInitialValues,
} from './connector-formily-schema'

type FormValues = Record<string, unknown>
type SelectOption = { label: string; value: string }
export type SecretDraft = { action: 'keep' | 'replace' | 'clear'; value: string }

type ControlProps = {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  readOnly?: boolean
  dataSource?: SelectOption[]
  placeholder?: string
  configured?: boolean
  requiredSecret?: boolean
  draft?: SecretDraft
  fieldName?: string
  onSecretChange?: (name: string, draft: SecretDraft) => void
}

function InputBase({ value, onChange, disabled, readOnly, ...props }: ControlProps) {
  return (
    <input
      {...props}
      value={typeof value === 'string' ? value : String(value ?? '')}
      disabled={disabled}
      readOnly={readOnly}
      className="h-8 w-full rounded-lg border border-gray-200 px-2.5 text-[12px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50"
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}

function NumberInputBase({ value, onChange, disabled, readOnly }: ControlProps) {
  return (
    <input
      type="number"
      value={typeof value === 'number' ? String(value) : ''}
      disabled={disabled}
      readOnly={readOnly}
      className="h-8 w-full rounded-lg border border-gray-200 px-2.5 text-[12px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50"
      onChange={(event) =>
        onChange?.(event.target.value === '' ? undefined : Number(event.target.value))
      }
    />
  )
}

function CheckboxBase({ value, onChange, disabled, readOnly }: ControlProps) {
  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      disabled={disabled}
      readOnly={readOnly}
      className="h-4 w-4 rounded border-gray-300"
      onChange={(event) => onChange?.(event.target.checked)}
    />
  )
}

function ArrayInputBase({ value, onChange, disabled, readOnly }: ControlProps) {
  const text = Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value ?? '')
  return (
    <textarea
      rows={2}
      value={text}
      disabled={disabled}
      readOnly={readOnly}
      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50"
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}

const EMPTY_SELECT_VALUE = '__tapstate_empty_value__'

function encodeSelectValue(value: string) {
  return value === '' ? EMPTY_SELECT_VALUE : value
}

function decodeSelectValue(value: string) {
  return value === EMPTY_SELECT_VALUE ? '' : value
}

function SelectInputBase({ value, onChange, disabled, dataSource }: ControlProps) {
  return (
    <Select
      value={encodeSelectValue(typeof value === 'string' ? value : String(value ?? ''))}
      disabled={disabled}
      onValueChange={(next) => next !== null && onChange?.(decodeSelectValue(next))}
    >
      <SelectTrigger className="w-full" aria-label="select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(dataSource ?? []).map((option) => (
          <SelectItem
            key={`${option.value}-${option.label}`}
            value={encodeSelectValue(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SecretInputBase({
  value,
  onChange,
  disabled,
  configured,
  requiredSecret,
  draft,
  fieldName,
  onSecretChange,
}: ControlProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<SecretDraft>(
    draft ?? { action: 'keep', value: '' },
  )

  useEffect(() => {
    setCurrentDraft(draft ?? { action: 'keep', value: '' })
  }, [draft?.action, draft?.value])

  function updateSecretDraft(nextDraft: SecretDraft) {
    setCurrentDraft(nextDraft)
    if (fieldName) onSecretChange?.(fieldName, nextDraft)
  }

  const replacing = currentDraft.action === 'replace'
  const cleared = currentDraft.action === 'clear'

  if (!configured) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          type={visible ? 'text' : 'password'}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          autoComplete="new-password"
          onChange={(event) => onChange?.(event.target.value)}
        />
        <button
          type="button"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label={visible ? t('sources.edit.secretHide') : t('sources.edit.secretShow')}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="source-field">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          type={visible ? 'text' : 'password'}
          value={replacing ? currentDraft.value : ''}
          disabled={disabled || (!replacing && !cleared)}
          placeholder={
            cleared ? t('sources.edit.secretCleared') : t('sources.edit.secretConfigured')
          }
          autoComplete="new-password"
          onChange={(event) => updateSecretDraft({ action: 'replace', value: event.target.value })}
        />
        {replacing && (
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={visible ? t('sources.edit.secretHide') : t('sources.edit.secretShow')}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
        {!replacing && !cleared && (
          <button
            type="button"
            disabled={disabled}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={t('sources.edit.secretReplace')}
            onClick={() => updateSecretDraft({ action: 'replace', value: '' })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {!requiredSecret && (
          <button
            type="button"
            disabled={disabled}
            className={`rounded p-1 ${
              cleared ? 'text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'
            }`}
            aria-label={cleared ? t('sources.edit.secretKeep') : t('sources.edit.secretClear')}
            onClick={() =>
              updateSecretDraft(
                cleared ? { action: 'keep', value: '' } : { action: 'clear', value: '' },
              )
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <span className="source-field__hint">
        {cleared ? t('sources.edit.secretClearHint') : t('sources.edit.secretConfiguredHint')}
      </span>
    </div>
  )
}

const TextInput = connect(
  InputBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const NumberInput = connect(
  NumberInputBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const Checkbox = connect(
  CheckboxBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const ArrayInput = connect(
  ArrayInputBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const SelectInput = connect(
  SelectInputBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const SecretInput = connect(
  SecretInputBase,
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const FormItem = observer(function FormItem({
  title,
  required,
  error,
  children,
}: {
  title?: ReactNode
  required?: boolean
  error?: string
  children?: ReactNode
}) {
  const field = useField<any>()
  const feedback = field?.selfErrors?.[0]
  const label = title ?? field?.title
  const isRequired = required ?? field?.required
  return (
    <label className="source-field">
      <span className="source-field__label">
        {label}
        {isRequired && <small>*</small>}
      </span>
      {children}
      {(error || feedback) && <span className="source-field__error">{error || feedback}</span>}
    </label>
  )
})

const FormilySchemaField = createSchemaField({
  components: {
    FormItem,
    TextInput,
    NumberInput,
    Checkbox,
    ArrayInput,
    Select: SelectInput,
    SecretInput,
  },
})

export interface ConnectorFormilyProps {
  fields: readonly ConnectorConfigField[]
  schema?: ISchema
  resetKey?: string
  initialValues?: SourceConfigState
  configuredSecrets?: readonly string[]
  secretDrafts?: Record<string, SecretDraft>
  errors?: Record<string, string>
  disabled?: boolean
  onValuesChange?: (values: SourceConfigState) => void
  onSecretChange?: (name: string, draft: SecretDraft) => void
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value !== 'object') return false
  return Object.values(value).every(isJsonValue)
}

function sourceConfigState(values: FormValues): SourceConfigState {
  return Object.fromEntries(
    Object.entries(values).flatMap(([name, value]) =>
      value === undefined || isJsonValue(value) ? [[name, value]] : [],
    ),
  )
}

function createSchema(
  fields: readonly ConnectorConfigField[],
  errors: Record<string, string>,
  configuredSecrets: readonly string[],
  secretDrafts: Record<string, SecretDraft>,
  disabled: boolean,
  onSecretChange?: (name: string, draft: SecretDraft) => void,
  sourceSchema?: ISchema,
) {
  const base = (sourceSchema ?? connectorFieldsToFormilySchema(fields)) as ISchema & {
    properties: Record<string, ISchema>
  }
  const properties = Object.fromEntries(
    Object.entries(base.properties ?? {}).map(([name, property]) => {
      const field = fields.find((candidate) => candidate.name === name)
      const decoratorProps = {
        ...(property['x-decorator-props'] as Record<string, unknown> | undefined),
        ...(field ? { error: errors[field.name] } : {}),
      }
      const componentProps = {
        ...(property['x-component-props'] as Record<string, unknown> | undefined),
        disabled,
        ...(field?.secret
          ? {
              configured: configuredSecrets.includes(name),
              requiredSecret: field.required,
              draft: secretDrafts[name],
              fieldName: name,
              onSecretChange,
            }
          : {}),
      }
      return [
        name,
        {
          ...property,
          'x-decorator-props': decoratorProps,
          'x-component-props': componentProps,
        },
      ]
    }),
  )
  return { ...base, properties }
}

export function ConnectorFormily({
  fields,
  schema: sourceSchema,
  resetKey,
  initialValues,
  configuredSecrets = [],
  secretDrafts = {},
  errors = {},
  disabled = false,
  onValuesChange,
  onSecretChange,
}: ConnectorFormilyProps) {
  const valuesCallback = useRef(onValuesChange)
  valuesCallback.current = onValuesChange
  const formKey = connectorFormKey(fields, resetKey)
  const form = useMemo(
    () =>
      createForm({
        initialValues: initialValues ?? formilyInitialValues(fields),
        effects: () => {
          onFieldValueChange('*', (_field, nextForm) => {
            valuesCallback.current?.(sourceConfigState({ ...nextForm.values }))
          })
        },
      }),
    // The field list defines the lifecycle of a connector form. Values are updated
    // through Formily and are intentionally not recreated on every keystroke.
    [formKey],
  )

  const schema = useMemo(
    () =>
      createSchema(
        fields,
        errors,
        configuredSecrets,
        secretDrafts,
        disabled,
        onSecretChange,
        sourceSchema,
      ),
    [configuredSecrets, disabled, errors, fields, onSecretChange, secretDrafts, sourceSchema],
  )

  return (
    <FormProvider key={formKey} form={form}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormilySchemaField schema={schema} />
      </div>
    </FormProvider>
  )
}
