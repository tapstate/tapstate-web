import type { ValidationValue } from '@/service/pipelines/validation-client'

type PathPart = string | number
export type CellValue =
  | { state: 'PRESENT'; value: ValidationValue }
  | { state: 'MISSING_FIELD' | 'NOT_RETAINED' }
  | { state: 'UNAVAILABLE'; raw: ValidationValue }
export interface RecordSide {
  identity: ValidationValue
  readId: string
  row: ValidationValue | null
  encodedRow: ValidationValue
}
export interface RecordSample {
  source: RecordSide | null
  target: RecordSide | null
}
export interface RecordFinding {
  kind: string
  path: readonly PathPart[]
  count: string | null
  multiplicity: { occurrences: string; exact: boolean } | null
  samples: readonly RecordSample[]
}
export interface RecordObservation {
  findings: readonly RecordFinding[]
  samplesTruncated: boolean
  notCompared: ValidationValue | null
  reads: ValidationValue | null
}
const empty = (): { ok: false } => ({ ok: false })
type Decoded = { ok: true; value: ValidationValue } | { ok: false }
export const member = (
  value: ValidationValue | null | undefined,
  name: string,
): ValidationValue | null =>
  value?.type === 'object'
    ? (value.value.find((entry) => entry.name === name)?.value ?? null)
    : null
const text = (value: ValidationValue | null): string | null =>
  value?.type === 'text' ? value.value : null
const scalar = (value: ValidationValue | null): string | null =>
  value &&
  ['int8', 'int16', 'int32', 'int64', 'integer', 'text'].includes(value.type) &&
  typeof value.value === 'string'
    ? value.value
    : null
const list = (value: ValidationValue | null): readonly ValidationValue[] | null =>
  value?.type === 'array' ? value.value : null
const signed = (value: string | null): value is string =>
  value !== null && /^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/.test(value)

/** Decodes the existing stored observation's explicit value tags, never JSON-coercing a business value. */
export function storedValidationValue(encoded: ValidationValue): ValidationValue | null {
  const budget = { remaining: 65536 }
  const decoded = decode(encoded, budget, 0)
  return decoded.ok ? decoded.value : null
}
function decode(encoded: ValidationValue, budget: { remaining: number }, depth: number): Decoded {
  if (--budget.remaining < 0 || depth > 64) return empty()
  const kind = text(member(encoded, 'kind')),
    value = member(encoded, 'value')
  const atom = (
    type: ValidationValue['type'],
    raw: string | boolean | null,
    metadata: Readonly<Record<string, string>> = {},
  ): Decoded => ({ ok: true, value: { type, value: raw, metadata } as ValidationValue })
  if (kind === 'NULL') return atom('null', null)
  if (kind === 'BOOLEAN') return value?.type === 'boolean' ? atom('boolean', value.value) : empty()
  if (kind === 'TEXT') return value?.type === 'text' ? atom('text', value.value) : empty()
  const numericType = {
    BYTE: 'int8',
    SHORT: 'int16',
    INT: 'int32',
    LONG: 'int64',
    INTEGER: 'integer',
  } as const
  if (kind !== null && Object.hasOwn(numericType, kind)) {
    const raw = scalar(value)
    return signed(raw) ? atom(numericType[kind as keyof typeof numericType], raw) : empty()
  }
  if (kind === 'DECIMAL') {
    const unscaled = text(member(encoded, 'unscaled')),
      scale = scalar(member(encoded, 'scale'))
    if (
      !signed(unscaled) ||
      !signed(scale) ||
      scale.length > 11 ||
      BigInt(scale) < -2147483648n ||
      BigInt(scale) > 2147483647n
    )
      return empty()
    return atom('decimal', unscaled, { scale })
  }
  if (kind === 'FLOAT_BITS' || kind === 'DOUBLE_BITS') {
    const raw = scalar(value),
      width = kind === 'FLOAT_BITS' ? 32 : 64
    if (!signed(raw) || raw.length > 20) return empty()
    const bits = BigInt(raw),
      half = 1n << BigInt(width - 1)
    if (bits < -half || bits >= half) return empty()
    return atom(
      width === 32 ? 'float32-bits' : 'float64-bits',
      BigInt.asUintN(width, bits)
        .toString(16)
        .padStart(width / 4, '0'),
    )
  }
  if (kind === 'BINARY') {
    const subtype = scalar(member(encoded, 'subtype'))
    if (
      value?.type !== 'binary' ||
      !signed(subtype) ||
      subtype.length > 3 ||
      BigInt(subtype) < -1n ||
      BigInt(subtype) > 255n
    )
      return empty()
    return atom('binary', value.value, { ...value.metadata, subtype })
  }
  if (kind === 'DATE' || kind === 'TIME' || kind === 'LOCAL_DATE_TIME')
    return value?.type === 'text'
      ? atom(kind === 'DATE' ? 'date' : kind === 'TIME' ? 'time' : 'local-date-time', value.value)
      : empty()
  if (kind === 'INSTANT') {
    const seconds = member(value, 'seconds'),
      nanos = member(value, 'nanos')
    if (!signed(scalar(seconds)) || !signed(scalar(nanos))) return empty()
    // Retain seconds and nanoseconds explicitly, including instants outside JavaScript Date's range.
    return {
      ok: true,
      value: {
        type: 'object',
        value: [
          { name: 'epochSeconds', value: seconds! },
          { name: 'nanoseconds', value: nanos! },
        ],
        metadata: { observedType: 'INSTANT' },
      },
    }
  }
  if (kind === 'TYPED') {
    const logicalType = text(member(encoded, 'logicalType')),
      codecBinding = text(member(encoded, 'codecBinding')),
      conversionOrigin = text(member(encoded, 'conversionOrigin'))
    if (
      logicalType === null ||
      codecBinding === null ||
      conversionOrigin === null ||
      value === null
    )
      return empty()
    const inner = decode(value, budget, depth + 1)
    if (!inner.ok) return empty()
    const nativeType = text(member(encoded, 'nativeType'))
    return {
      ok: true,
      value: {
        type: 'typed',
        value: inner.value,
        metadata: {
          logicalType,
          codecBinding,
          conversionOrigin,
          ...(nativeType === null ? {} : { nativeType }),
        },
      },
    }
  }
  if (kind === 'OBJECT') {
    const entries = list(member(encoded, 'entries'))
    if (entries === null) return empty()
    const children: { name: string; value: ValidationValue }[] = []
    for (const entry of entries) {
      const name = text(member(entry, 'name')),
        raw = member(entry, 'value')
      if (name === null || raw === null) return empty()
      const child = decode(raw, budget, depth + 1)
      if (!child.ok) return empty()
      children.push({ name, value: child.value })
    }
    return { ok: true, value: { type: 'object', value: children, metadata: {} } }
  }
  if (kind === 'ARRAY') {
    const values = list(member(encoded, 'values'))
    if (values === null) return empty()
    const children: ValidationValue[] = []
    for (const raw of values) {
      const child = decode(raw, budget, depth + 1)
      if (!child.ok) return empty()
      children.push(child.value)
    }
    return { ok: true, value: { type: 'array', value: children, metadata: {} } }
  }
  return empty()
}
function path(value: ValidationValue | null): PathPart[] | null {
  const values = list(value)
  if (values === null) return null
  const result: PathPart[] = []
  for (const value of values) {
    if (value.type === 'text') result.push(value.value)
    else if (
      value.type === 'int32' &&
      /^(0|[1-9][0-9]*)$/.test(value.value) &&
      BigInt(value.value) <= 2147483647n
    )
      result.push(Number(value.value))
    else return null
  }
  return result
}
function findingIdentity(value: ValidationValue): { kind: string; path: PathPart[] } | null {
  const kind = text(member(value, 'kind')),
    location = member(value, 'location'),
    parts = path(member(location, 'fieldPath'))
  return kind === null || parts === null ? null : { kind, path: parts }
}
function sampleSide(value: ValidationValue | null): RecordSide | null | undefined {
  if (value === null) return undefined
  if (value.type === 'null') return null
  const identity = member(value, 'identity'),
    readId = text(member(value, 'readId')),
    encodedRow = member(value, 'row')
  if (identity?.type !== 'object' || readId === null || readId.length === 0 || encodedRow === null)
    return undefined
  const decoded = storedValidationValue(encodedRow)
  return { identity, readId, encodedRow, row: decoded?.type === 'object' ? decoded : null }
}
// Display association only: not a root lookup, execution identity or durable fingerprint.
function semantic(value: ValidationValue | null): unknown {
  if (value === null) return null
  const metadata = Object.entries(value.metadata).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  if (value.type === 'object')
    return [
      value.type,
      value.value
        .map((entry) => [entry.name, semantic(entry.value)] as const)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      metadata,
    ]
  if (value.type === 'array') return [value.type, value.value.map(semantic), metadata]
  if (value.type === 'typed') return [value.type, semantic(value.value), metadata]
  return [value.type, value.value, metadata]
}
/** Mandatory findings remain visible even when diagnostic samples were not retained. */
export function validationRecordObservation(value: ValidationValue): RecordObservation | null {
  const findings = list(member(value, 'findings')),
    samples = list(member(value, 'samples')),
    truncated = member(value, 'samplesTruncated')
  if (findings === null || samples === null || truncated?.type !== 'boolean') return null
  const retainedByFinding = new Map<string, RecordSample[]>()
  const identityKey = (finding: ValidationValue) => {
    const location = member(finding, 'location')
    return JSON.stringify([
      text(member(finding, 'kind')),
      semantic(member(location, 'scope')),
      path(member(location, 'fieldPath')),
      semantic(member(finding, 'multiplicity')),
    ])
  }
  for (const sample of samples) {
    const finding = member(sample, 'finding')
    if (finding === null || findingIdentity(finding) === null) return null
    const key = identityKey(finding),
      retained = retainedByFinding.get(key) ?? []
    const source = sampleSide(member(sample, 'source')),
      target = sampleSide(member(sample, 'target'))
    if (source === undefined || target === undefined) return null
    retained.push({ source, target })
    retainedByFinding.set(key, retained)
  }
  const rows: RecordFinding[] = []
  for (const finding of findings) {
    const identity = findingIdentity(finding)
    if (identity === null) return null
    const retained = retainedByFinding.get(identityKey(finding)) ?? []
    const repeated = member(finding, 'multiplicity'),
      occurrences = scalar(member(repeated, 'occurrences')),
      exact = member(repeated, 'exact')
    const multiplicity =
      signed(occurrences) && exact?.type === 'boolean' ? { occurrences, exact: exact.value } : null
    rows.push({
      ...identity,
      count: scalar(member(finding, 'count')),
      multiplicity,
      samples: retained,
    })
  }
  return {
    findings: rows,
    samplesTruncated: truncated.value,
    notCompared: member(value, 'notCompared'),
    reads: member(value, 'reads'),
  }
}
/** String components are literal field names; only integer components address array ordinals. */
export function validationCell(row: ValidationValue | null, parts: readonly PathPart[]): CellValue {
  if (row === null) return { state: 'NOT_RETAINED' }
  let current = row
  for (const part of parts) {
    while (current.type === 'typed') current = current.value
    if (typeof part === 'number') {
      if (current.type !== 'array' || part >= current.value.length)
        return { state: 'MISSING_FIELD' }
      current = current.value[part]!
    } else {
      const next = member(current, part)
      if (next === null) return { state: 'MISSING_FIELD' }
      current = next
    }
  }
  return { state: 'PRESENT', value: current }
}

export function validationSampleCell(
  side: RecordSide | null,
  parts: readonly PathPart[],
): CellValue {
  if (side === null) return { state: 'NOT_RETAINED' }
  if (side.row === null) return { state: 'UNAVAILABLE', raw: side.encodedRow }
  return validationCell(side.row, parts)
}
