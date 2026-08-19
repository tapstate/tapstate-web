import type { ISchema } from '@formily/json-schema'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import type { SourceConfigState } from './source-form'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function connectionSchema(text: string): JsonRecord {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Connector spec contains invalid JSON')
  }

  const spec = asRecord(parsed)
  const options = asRecord(spec?.configOptions)
  const connection = asRecord(options?.connection)
  if (connection === null || asRecord(connection.properties) === null)
    throw new Error('Connector spec does not declare configOptions.connection')
  return connection
}

function componentAlias(component: unknown) {
  switch (component) {
    case 'Input':
      return 'TextInput'
    case 'InputNumber':
      return 'NumberInput'
    case 'Password':
      return 'SecretInput'
    case 'Switch':
      return 'Checkbox'
    case 'ArrayItems':
      return 'ArrayInput'
    default:
      return component
  }
}

function adaptNode(
  value: unknown,
  secretFields: ReadonlySet<string>,
  fieldName?: string,
): JsonRecord {
  const node = asRecord(value) ?? {}
  const properties = asRecord(node.properties)
  const component = secretFields.has(fieldName ?? '')
    ? 'SecretInput'
    : componentAlias(node['x-component'])

  const next: JsonRecord = {
    ...node,
    ...(component === undefined ? {} : { 'x-component': component }),
  }

  if (properties) {
    next.properties = Object.fromEntries(
      Object.entries(properties).map(([name, property]) => [
        name,
        adaptNode(property, secretFields, name),
      ]),
    )
  }

  if (component === 'ArrayInput') {
    delete next.items
    delete next.properties
  }

  return next
}

export function connectorSpecConnectionSchema(
  text: string,
  fields: readonly ConnectorConfigField[],
): ISchema {
  const secretFields = new Set(fields.filter((field) => field.secret).map((field) => field.name))
  return adaptNode(connectionSchema(text), secretFields) as ISchema
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value !== 'object') return false
  return Object.values(value).every(isJsonValue)
}

function readDefaults(node: JsonRecord, values: SourceConfigState) {
  const properties = asRecord(node.properties)
  if (properties === null) return

  for (const [name, value] of Object.entries(properties)) {
    const property = asRecord(value)
    if (property === null) continue
    if (property.default !== undefined && isJsonValue(property.default))
      values[name] = property.default
    readDefaults(property, values)
  }
}

export function connectorSpecInitialValues(text: string): SourceConfigState {
  const values: SourceConfigState = {}
  readDefaults(connectionSchema(text), values)
  return values
}
