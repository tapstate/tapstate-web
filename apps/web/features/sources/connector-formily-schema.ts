import type { ISchema } from '@formily/json-schema'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import {
  buildSourceConfig,
  createInitialConfig,
  type SourceConfigResult,
  type SourceConfigState,
} from './source-form'

type FormilySchema = ISchema & {
  properties?: Record<string, FormilySchema>
  enum?: Array<{ label: string; value: string }>
}

function fieldComponent(field: ConnectorConfigField) {
  if (field.secret) return 'Password'
  if (field.options.length > 0) return 'Select'
  switch (field.type) {
    case 'number':
      return 'NumberPicker'
    case 'boolean':
      return 'Switch'
    case 'array':
      return 'ArrayInput'
    default:
      return 'Input'
  }
}

function fieldSchema(field: ConnectorConfigField): FormilySchema {
  const initial = createInitialConfig([field])[field.name]
  const schema: FormilySchema = {
    type: field.type,
    title: field.label,
    'x-component': fieldComponent(field),
  }

  if (initial !== undefined) schema.default = initial
  if (field.secret) schema['x-value-change'] = 'replace'
  if (field.options.length > 0) {
    schema.enum = field.options.map((option) => ({
      label: option.label,
      value: option.value,
    }))
  }
  if (field.visibleWhen) {
    const values = field.visibleWhen.equalsAnyOf
      .map((value) => `$deps[0] === ${JSON.stringify(value)}`)
      .join(' || ')
    schema['x-reactions'] = {
      dependencies: [field.visibleWhen.controllingField],
      fulfill: {
        state: {
          visible: values ? `{{${values}}}` : false,
        },
      },
    }
  }
  schema['x-decorator'] = 'FormItem'
  return schema
}

export function connectorFieldsToFormilySchema(
  fields: readonly ConnectorConfigField[],
): FormilySchema {
  const required = fields.filter((field) => field.required).map((field) => field.name)
  return {
    type: 'object',
    properties: Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
    ...(required.length > 0 ? { required } : {}),
  }
}

export function connectorFormKey(
  fields: readonly ConnectorConfigField[],
  resetKey: string | undefined,
) {
  return `${resetKey ?? ''}\u0000${fields
    .map((field) => `${field.name}:${field.type}:${field.secret}`)
    .join('|')}`
}

export function formilyInitialValues(fields: readonly ConnectorConfigField[]) {
  return createInitialConfig(fields)
}

export function formilyValuesToSourceConfig(
  fields: readonly ConnectorConfigField[],
  values: Record<string, unknown>,
): SourceConfigResult {
  const state: SourceConfigState = {}
  for (const field of fields) {
    const value = values[field.name]
    state[field.name] = value as JsonValue | undefined
  }
  return buildSourceConfig(fields, state)
}
