import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

export type SourceConfigState = Record<string, JsonValue | undefined>

export interface SourceConfigResult {
  config: Record<string, JsonValue>
  errors: Record<string, 'required' | 'number' | 'array'>
}

export type FormConnectorConfigField = ConnectorConfigField & { clearable?: boolean }

function getPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)
}

function setPath(target: Record<string, JsonValue>, path: string, value: JsonValue) {
  const segments = path.split('.')
  let current = target
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment]
    if (typeof child !== 'object' || child === null || Array.isArray(child)) current[segment] = {}
    current = current[segment] as Record<string, JsonValue>
  }
  const last = segments.at(-1)
  if (last) current[last] = value
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

export function createInitialConfig(
  fields: readonly FormConnectorConfigField[],
): SourceConfigState {
  const config: Record<string, JsonValue | undefined> = {}
  for (const field of fields) {
    const value = defaultValue(field)
    const segments = field.name.split('.')
    let current = config as Record<string, unknown>
    for (const segment of segments.slice(0, -1)) {
      const child = current[segment]
      if (typeof child !== 'object' || child === null || Array.isArray(child)) current[segment] = {}
      current = current[segment] as Record<string, unknown>
    }
    const last = segments.at(-1)
    if (last) current[last] = value
  }
  return config
}

export function isFieldVisible(field: ConnectorConfigField, config: SourceConfigState) {
  if (field.visibleWhen === null) return true

  const value = getPath(config, field.visibleWhen.controllingField)
  return field.visibleWhen.equalsAnyOf.includes(String(value ?? ''))
}

function isEmpty(value: JsonValue | undefined) {
  return value === undefined || value === null || value === ''
}

export function buildSourceConfig(
  fields: readonly FormConnectorConfigField[],
  state: SourceConfigState,
  retainedRequiredFields: readonly string[] = [],
): SourceConfigResult {
  const config: Record<string, JsonValue> = {}
  const errors: SourceConfigResult['errors'] = {}
  const retainedRequiredFieldNames = new Set(retainedRequiredFields)

  for (const field of fields) {
    if (!isFieldVisible(field, state)) continue

    const value = getPath(state, field.name) as JsonValue | undefined
    if (isEmpty(value)) {
      if (field.clearable && value === null && !field.secret) setPath(config, field.name, null)
      if (field.required && !retainedRequiredFieldNames.has(field.name))
        errors[field.name] = 'required'
      continue
    }

    if (field.type === 'number') {
      const numberValue = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(numberValue)) {
        errors[field.name] = 'number'
        continue
      }
      setPath(config, field.name, numberValue)
      continue
    }

    if (field.type === 'array') {
      if (Array.isArray(value)) {
        setPath(config, field.name, value)
        continue
      }
      const parsed = typeof value === 'string' ? parseArray(value) : value
      if (!Array.isArray(parsed)) {
        errors[field.name] = 'array'
        continue
      }
      setPath(config, field.name, parsed)
      continue
    }

    if (field.type === 'boolean') {
      setPath(config, field.name, typeof value === 'boolean' ? value : parseBoolean(String(value)))
      continue
    }

    setPath(config, field.name, String(value))
  }

  return { config, errors }
}
