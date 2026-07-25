import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

export type SourceConfigState = Record<string, JsonValue | undefined>

export interface SourceConfigResult {
  config: Record<string, JsonValue>
  errors: Record<string, 'required' | 'number' | 'array'>
}

function parseBoolean(value: string) {
  return value.trim().toLowerCase() === 'true'
}

function parseArray(value: string): JsonValue[] | string {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as JsonValue[]) : value
  } catch {
    return value
  }
}

function defaultValue(field: ConnectorConfigField): JsonValue | undefined {
  if (field.defaultValue === null) return field.type === 'boolean' ? false : undefined

  switch (field.type) {
    case 'number': {
      const value = Number(field.defaultValue)
      return Number.isFinite(value) ? value : field.defaultValue
    }
    case 'boolean':
      return parseBoolean(field.defaultValue)
    case 'array':
      return parseArray(field.defaultValue)
    default:
      return field.defaultValue
  }
}

export function createInitialConfig(fields: readonly ConnectorConfigField[]): SourceConfigState {
  return Object.fromEntries(fields.map((field) => [field.name, defaultValue(field)]))
}

export function isFieldVisible(field: ConnectorConfigField, config: SourceConfigState) {
  if (field.visibleWhen === null) return true

  const value = config[field.visibleWhen.controllingField]
  return field.visibleWhen.equalsAnyOf.includes(String(value ?? ''))
}

function isEmpty(value: JsonValue | undefined) {
  return value === undefined || value === null || value === ''
}

export function buildSourceConfig(
  fields: readonly ConnectorConfigField[],
  state: SourceConfigState,
): SourceConfigResult {
  const config: Record<string, JsonValue> = {}
  const errors: SourceConfigResult['errors'] = {}

  for (const field of fields) {
    if (!isFieldVisible(field, state)) continue

    const value = state[field.name]
    if (isEmpty(value)) {
      if (field.required) errors[field.name] = 'required'
      continue
    }

    if (field.type === 'number') {
      const numberValue = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(numberValue)) {
        errors[field.name] = 'number'
        continue
      }
      config[field.name] = numberValue
      continue
    }

    if (field.type === 'array') {
      if (Array.isArray(value)) {
        config[field.name] = value
        continue
      }
      const parsed = typeof value === 'string' ? parseArray(value) : value
      if (!Array.isArray(parsed)) {
        errors[field.name] = 'array'
        continue
      }
      config[field.name] = parsed
      continue
    }

    if (field.type === 'boolean') {
      config[field.name] = typeof value === 'boolean' ? value : parseBoolean(String(value))
      continue
    }

    config[field.name] = String(value)
  }

  return { config, errors }
}
