import type { ISchema } from '@formily/json-schema'

import type { JsonValue } from '@/service/source-client'

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

function connectionSchema(text: string, locale: string): JsonRecord {
  const { connection, spec } = parseConnectionSchema(text)
  return resolveSchemaMessages(connection, messagesForLocale(spec, locale)) as JsonRecord
}

export function connectorSpecConnectionSchema(text: string, locale: string): ISchema {
  return connectionSchema(text, locale) as ISchema
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
  readDefaults(parseConnectionSchema(text).connection, values)
  return values
}
