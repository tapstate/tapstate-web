const ENVELOPE_FIELD = /^(?:after|before|schema)\.|^(?:op|ts|src)$/
const NUMBER_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

export type FilterLiteralKind = 'auto' | 'string' | 'number' | 'boolean' | 'null'
export type FilterFieldKind = 'unknown' | 'string' | 'number' | 'boolean' | 'other'

export function celFilterField(field: string): string {
  const normalized = field.trim()
  return ENVELOPE_FIELD.test(normalized) ? normalized : `after.${normalized}`
}

export function celFilterFieldType(field: string, fieldTypes?: Readonly<Record<string, string>>) {
  const normalized = field.trim()
  const name = normalized.replace(/^(?:after|before)\./, '')
  return fieldTypes?.[normalized] ?? fieldTypes?.[name]
}

export function celFilterFieldKind(fieldType?: string): FilterFieldKind {
  if (!fieldType) return 'unknown'
  const normalizedType = fieldType
    .toLowerCase()
    .replace(/\(.*$/, '')
    .replace(/(?:unsigned|zerofill).*$/, '')
    .replace(/\s+/g, '')

  if (
    /^(?:tinyint|smallint|mediumint|u?int\d*|int[248]|integer|bigint|serial|bigserial|smallserial|float\d*|real|double|doubleprecision|decimal|numeric|number|money|long|short|byte|java\.lang\.(?:byte|short|integer|long|float|double)|java\.math\.big(?:integer|decimal))$/.test(
      normalizedType,
    )
  ) {
    return 'number'
  }
  if (/^(?:bool|boolean|java\.lang\.boolean)$/.test(normalizedType)) return 'boolean'
  if (
    /^(?:char|character|charactervarying|varchar\d*|nvarchar\d*|nationalvarchar|nchar|bpchar|name|citext|text|tinytext|mediumtext|longtext|clob|nclob|string|enum|java\.lang\.string)$/.test(
      normalizedType,
    )
  ) {
    return 'string'
  }
  return 'other'
}

export function celFilterLiteral(
  value: string,
  fieldType?: string,
  literalKind: FilterLiteralKind = 'auto',
  stringOnly = false,
) {
  const normalizedValue = value.trim()
  if (stringOnly) return JSON.stringify(normalizedValue)

  const fieldKind = celFilterFieldKind(fieldType)
  const isNumericField = fieldKind === 'number'
  const isBooleanField = fieldKind === 'boolean'

  if (
    (isNumericField || (!fieldType && literalKind === 'number')) &&
    NUMBER_LITERAL.test(normalizedValue)
  ) {
    return normalizedValue
  }
  if (
    (isBooleanField || (!fieldType && literalKind === 'boolean')) &&
    /^(?:true|false)$/i.test(normalizedValue)
  ) {
    return normalizedValue.toLowerCase()
  }
  if (!fieldType && literalKind === 'null' && normalizedValue === 'null') return 'null'
  if (fieldType && !isNumericField && !isBooleanField) return JSON.stringify(normalizedValue)
  if (literalKind === 'string') {
    return JSON.stringify(readExplicitString(normalizedValue) ?? normalizedValue)
  }
  if (literalKind === 'auto') {
    const explicitString = readExplicitString(normalizedValue)
    if (explicitString !== null) return JSON.stringify(explicitString)
    if (NUMBER_LITERAL.test(normalizedValue)) return normalizedValue
    if (/^(?:true|false)$/i.test(normalizedValue)) return normalizedValue.toLowerCase()
    if (normalizedValue === 'null') return 'null'
  }
  return JSON.stringify(normalizedValue)
}

function readExplicitString(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return null
  }
}
