import type { ISchema } from '@formily/json-schema'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import type { SourceConfigState } from './source-form'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function resolveSchemaMessages(value: unknown, messages: JsonRecord): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^{}]+)\}/g, (template, key: string) => {
      const message = messages[key.trim()]
      return typeof message === 'string' ? message : template
    })
  }

  if (Array.isArray(value)) return value.map((item) => resolveSchemaMessages(item, messages))

  const record = asRecord(value)
  if (record === null) return value

  const resolved: JsonRecord = {}
  for (const [key, child] of Object.entries(record)) {
    resolved[key] = resolveSchemaMessages(child, messages)
  }
  return resolved
}

function parseConnectionSchema(text: string): { connection: JsonRecord; spec: JsonRecord } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Connector spec contains invalid JSON')
  }

  const spec = asRecord(parsed)
  if (spec === null) throw new Error('Connector spec does not declare configOptions.connection')
  const options = asRecord(spec?.configOptions)
  const connection = asRecord(options?.connection)
  if (connection === null || asRecord(connection.properties) === null)
    throw new Error('Connector spec does not declare configOptions.connection')
  return { connection, spec }
}

function messageLocaleCandidates(locale: string) {
  const normalized = locale.replace('-', '_')
  const candidates = normalized === 'en' ? ['en_US', 'en'] : [normalized, locale]
  return [...new Set(candidates)]
}

function messagesForLocale(spec: JsonRecord, locale: string) {
  const messages = asRecord(spec.messages)
  if (messages === null) return {}

  for (const candidate of messageLocaleCandidates(locale)) {
    const localizedMessages = asRecord(messages[candidate])
    if (localizedMessages !== null) return localizedMessages
  }
  return {}
}

const MONGODB_PRESENTATION_FIELD_NAMES = new Set(['isUrlTips1', 'isUrlTips2', 'uriTips'])

function isMongoDbConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mongodb'
}

function isAtlasConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mongodb-atlas'
}

function isMongoFamilyConnector(connectorId: string | undefined) {
  return isMongoDbConnector(connectorId) || isAtlasConnector(connectorId)
}

function isMysqlConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mysql'
}

function finiteNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || value.trim() === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * A few connector specs predate the typed catalog contract. MySQL's top-level
 * port is one of those fields: it is declared as a string while rendered by
 * InputNumber. Keep this compatibility rule at the spec boundary so both the
 * Formily schema and its defaults agree on the value type.
 */
function withConnectorSpecificSchema(node: JsonRecord, connectorId?: string): JsonRecord {
  if (isAtlasConnector(connectorId)) {
    const properties = asRecord(node.properties)
    const isUri = asRecord(properties?.isUri)
    if (properties === null || isUri === null || !Array.isArray(isUri.enum)) return node

    // The real Atlas connector also connects from resolved hosts and standard fields. Its upstream
    // spec disables that choice, so expose only this verified option without changing PDK bytes.
    return {
      ...node,
      properties: {
        ...properties,
        isUri: {
          ...isUri,
          enum: isUri.enum.map((option) => {
            const entry = asRecord(option)
            return entry?.value === false ? { ...entry, disabled: false } : option
          }),
        },
      },
    }
  }

  if (!isMysqlConnector(connectorId)) return node

  const properties = asRecord(node.properties)
  const port = asRecord(properties?.port)
  if (properties === null || port === null) return node

  const defaultPort = finiteNumber(port.default)
  return {
    ...node,
    properties: {
      ...properties,
      port: {
        ...port,
        type: 'number',
        ...(defaultPort === undefined ? {} : { default: defaultPort }),
      },
    },
  }
}

function withoutMongoPresentationFields(node: JsonRecord): JsonRecord {
  const properties = asRecord(node.properties)
  if (properties === null) return node

  const nextProperties = Object.fromEntries(
    Object.entries(properties)
      .filter(([name]) => !MONGODB_PRESENTATION_FIELD_NAMES.has(name))
      .map(([name, value]) => {
        const property = asRecord(value)
        return [name, property === null ? value : withoutMongoPresentationFields(property)]
      }),
  )
  const required = Array.isArray(node.required)
    ? node.required.filter(
        (name): name is string =>
          typeof name === 'string' && !MONGODB_PRESENTATION_FIELD_NAMES.has(name),
      )
    : node.required

  return {
    ...node,
    properties: nextProperties,
    ...(required === undefined ? {} : { required }),
  }
}

function connectionSchema(text: string, locale: string, connectorId?: string): JsonRecord {
  const { connection, spec } = parseConnectionSchema(text)
  const resolved = resolveSchemaMessages(connection, messagesForLocale(spec, locale)) as JsonRecord
  const normalized = withConnectorSpecificSchema(resolved, connectorId)
  return isMongoFamilyConnector(connectorId)
    ? withoutMongoPresentationFields(normalized)
    : normalized
}

export function connectorSpecConnectionSchema(
  text: string,
  locale: string,
  connectorId?: string,
): ISchema {
  return connectionSchema(text, locale, connectorId) as ISchema
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

export function connectorSpecInitialValues(text: string, connectorId?: string): SourceConfigState {
  const values: SourceConfigState = {}
  const connection = parseConnectionSchema(text).connection
  readDefaults(
    isMongoFamilyConnector(connectorId)
      ? withoutMongoPresentationFields(withConnectorSpecificSchema(connection, connectorId))
      : withConnectorSpecificSchema(connection, connectorId),
    values,
  )
  return values
}

/**
 * Align catalog field metadata with connector-specific spec fixes. This is
 * intentionally narrow: only the MySQL connection port is corrected, while
 * unrelated connectors keep the catalog-declared type.
 */
export function normalizeConnectorConfigFields(
  connectorId: string | undefined,
  fields: readonly ConnectorConfigField[],
): ConnectorConfigField[] {
  if (!isMysqlConnector(connectorId)) return [...fields]

  return fields.map((field) =>
    field.name === 'port' ? { ...field, type: 'number' as const } : field,
  )
}

export function normalizeConnectorConfigValues(
  connectorId: string | undefined,
  values: Record<string, unknown>,
): SourceConfigState {
  const normalized = { ...values } as SourceConfigState
  if (!isMysqlConnector(connectorId) || !Object.hasOwn(values, 'port')) return normalized

  const port = finiteNumber(values.port)
  if (port !== undefined) normalized.port = port
  return normalized
}
