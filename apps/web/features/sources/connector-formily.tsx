import type { Field } from '@formily/core'
import type { ISchema } from '@formily/json-schema'

import { connect, mapProps } from '@formily/react'
import * as AntdFormily from '@potop/formily-antd-v6'
import { FormilySchema, useFormilyForm, type FormilyComponentMap } from '@tapstate-web/formily'
import { Input as AntdInput } from 'antd'
import { Eye, EyeOff, KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import { FormilyAntdProvider } from '@/components/formily/formily-antd-provider'
import { FormilySegmentedRadioGroup } from '@/components/formily/formily-segmented-radio'
import { Button } from '@/components/ui/button'

import type { SourceConfigState } from './source-form'

import {
  connectorFormKey,
  connectorFieldsToFormilySchema,
  formilyInitialValues,
} from './connector-formily-schema'
import { TextFileReader } from './text-file-reader'

type FormValues = Record<string, unknown>
export type SecretDraft = { action: 'keep' | 'replace' | 'clear'; value: string }

type ControlProps = {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  readOnly?: boolean
  requiredSecret?: boolean
  draft?: SecretDraft
  fieldName?: string
  onSecretChange?: (name: string, draft: SecretDraft) => void
}

function ConfigSection({ title, children }: ComponentProps<'fieldset'> & { title?: string }) {
  return (
    <fieldset className="border-border grid gap-4 rounded-lg border p-4">
      {title && <legend className="text-foreground px-1 text-[13px] font-semibold">{title}</legend>}
      {children}
    </fieldset>
  )
}

function ArrayInputBase({ value, onChange, disabled, readOnly }: ControlProps) {
  const text = Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value ?? '')
  return (
    <AntdInput.TextArea
      rows={3}
      value={text}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}

function ConfiguredSecretInputBase({
  disabled,
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

  return (
    <div>
      <AntdInput
        type={visible ? 'text' : 'password'}
        prefix={<KeyRound className="text-muted-foreground size-3.5" aria-hidden="true" />}
        suffix={
          <div className="flex items-center gap-0.5">
            {replacing && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label={visible ? t('sources.edit.secretHide') : t('sources.edit.secretShow')}
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            )}
            {!replacing && !cleared && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t('sources.edit.secretReplace')}
                onClick={() => updateSecretDraft({ action: 'replace', value: '' })}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {!requiredSecret && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                className={
                  cleared
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                }
                aria-label={cleared ? t('sources.edit.secretKeep') : t('sources.edit.secretClear')}
                onClick={() =>
                  updateSecretDraft(
                    cleared ? { action: 'keep', value: '' } : { action: 'clear', value: '' },
                  )
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        }
        value={replacing ? currentDraft.value : ''}
        disabled={disabled || (!replacing && !cleared)}
        placeholder={cleared ? t('sources.edit.secretCleared') : t('sources.edit.secretConfigured')}
        autoComplete="new-password"
        onChange={(event) => updateSecretDraft({ action: 'replace', value: event.target.value })}
      />
      <span className="source-field__hint">
        {cleared ? t('sources.edit.secretClearHint') : t('sources.edit.secretConfiguredHint')}
      </span>
    </div>
  )
}

function formilyControlProps(field: unknown) {
  const connectedField = field as Field | undefined
  return {
    value: connectedField?.value,
    onChange: (value: unknown) => connectedField?.onInput(value),
  }
}

const ArrayInput = connect(
  ArrayInputBase,
  mapProps((props, field) => ({ ...props, ...formilyControlProps(field) })),
)

const ConfiguredSecretInput = connect(
  ConfiguredSecretInputBase,
  mapProps((props, field) => ({ ...props, ...formilyControlProps(field) })),
)

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

function sourceConfigState(values: FormValues): SourceConfigState {
  function clean(value: unknown): JsonValue | undefined {
    if (value === undefined) return undefined
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      return value
    if (Array.isArray(value))
      return value.flatMap((item) => {
        const cleaned = clean(item)
        return cleaned === undefined ? [] : [cleaned]
      })
    if (typeof value !== 'object') return undefined
    return Object.fromEntries(
      Object.entries(value).flatMap(([name, child]) => {
        const cleaned = clean(child)
        return cleaned === undefined ? [] : [[name, cleaned]]
      }),
    )
  }

  return clean(values) as SourceConfigState
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

  function decorateProperties(
    properties: Record<string, ISchema>,
    path: string[] = [],
  ): Record<string, ISchema> {
    return Object.fromEntries(
      Object.entries(properties).map(([name, property]) => {
        const propertyRecord = property as ISchema & { properties?: Record<string, ISchema> }
        const fieldPath = property.type === 'void' ? path : [...path, name]
        const fieldName = fieldPath.join('.')
        const field = fields.find((candidate) => candidate.name === fieldName)
        const configuredFieldSecret = Boolean(
          field?.secret && configuredSecrets.includes(fieldName),
        )
        const decoratorPropsFromSchema = property['x-decorator-props'] as
          | Record<string, unknown>
          | undefined
        const componentPropsFromSchema = property['x-component-props'] as
          | Record<string, unknown>
          | undefined
        const fieldTitle = typeof property.title === 'string' ? property.title : field?.label
        const decoratorProps = {
          ...decoratorPropsFromSchema,
          label: decoratorPropsFromSchema?.label ?? fieldTitle,
          colon: false,
          layout: 'vertical',
          feedbackLayout: 'loose',
          ...(field && errors[fieldName]
            ? { feedbackStatus: 'error', feedbackText: errors[fieldName] }
            : {}),
        }
        const fileNameField =
          typeof (property as ISchema & { fileNameField?: unknown }).fileNameField === 'string'
            ? (property as ISchema & { fileNameField: string }).fileNameField
            : undefined
        const componentProps = {
          ...componentPropsFromSchema,
          ...(fileNameField ? { fileNameField } : {}),
          ...(typeof fieldTitle === 'string' &&
          componentPropsFromSchema?.['aria-label'] === undefined
            ? { 'aria-label': fieldTitle }
            : {}),
          disabled,
          ...(configuredFieldSecret
            ? {
                requiredSecret: field?.required ?? false,
                configuredSecret: true,
                draft: secretDrafts[fieldName],
                fieldName,
                onSecretChange,
              }
            : {}),
        }
        const component = property['x-component']
        const childProperties = propertyRecord.properties
        return [
          name,
          {
            ...property,
            ...(field?.secret && component !== 'TextFileReader'
              ? { 'x-component': configuredFieldSecret ? 'ConfiguredSecretInput' : 'Password' }
              : {}),
            'x-decorator-props': decoratorProps,
            'x-component-props': componentProps,
            ...(childProperties
              ? { properties: decorateProperties(childProperties, fieldPath) }
              : {}),
          },
        ]
      }),
    )
  }

  const properties = decorateProperties(base.properties ?? {})
  return { ...base, properties }
}

const {
  FormDialog: _formDialog,
  FormDrawer: _formDrawer,
  FormLayoutDeepContext: _formLayoutDeepContext,
  FormLayoutShallowContext: _formLayoutShallowContext,
  InternalArrayCards: _internalArrayCards,
  InternalRadio: _internalRadio,
  Placeholder: _placeholder,
  PlaceholderContext: _placeholderContext,
  createFormGrid: _createFormGrid,
  useFormDeepLayout: _useFormDeepLayout,
  useFormGrid: _useFormGrid,
  useFormItemLayout: _useFormItemLayout,
  useFormLayout: _useFormLayout,
  useFormShallowLayout: _useFormShallowLayout,
  useOverflow: _useOverflow,
  usePlaceholder: _usePlaceholder,
  ...schemaAdapterComponents
} = AntdFormily

/**
 * Register every public adapter component that is safe for a backend-defined
 * `x-component`. The package's imperative factories, hooks, contexts, and
 * internal implementation details are intentionally omitted.
 */
const antdFormilyComponents = {
  ...schemaAdapterComponents,
  // Connector specs also use Ant Design's familiar component name.
  InputNumber: AntdFormily.NumberPicker,
  Radio: Object.assign(
    function FormilyRadio(props: ComponentProps<typeof AntdFormily.Radio>) {
      return <AntdFormily.Radio {...props} />
    },
    { Group: FormilySegmentedRadioGroup },
  ),
} satisfies FormilyComponentMap

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
  const formKey = connectorFormKey(fields, resetKey)
  const form = useFormilyForm<FormValues>({
    resetKey: formKey,
    initialValues: initialValues ?? formilyInitialValues(fields),
    onValuesChange: (values) => onValuesChange?.(sourceConfigState(values)),
  })

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
  const components = useMemo<FormilyComponentMap>(
    () => ({
      ...antdFormilyComponents,
      ArrayInput,
      ConfiguredSecretInput,
      ConfigSection,
      TextFileReader,
    }),
    [],
  )

  return (
    <FormilyAntdProvider>
      <AntdFormily.FormLayout layout="vertical">
        <FormilySchema key={formKey} form={form} schema={schema} components={components} />
      </AntdFormily.FormLayout>
    </FormilyAntdProvider>
  )
}
