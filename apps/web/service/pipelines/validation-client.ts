import type { ApiFetcher } from '../source-client'

import { PipelineClientError } from './pipeline-client'

export type ValidationMethod = 'COUNT' | 'UNIQUE_KEY' | 'FULL_COLUMN'
export interface ValidationSelection {
  pipelineId: string
  taskId: string
  /** Omit for fresh authoring; subsequent requests use the server-assigned generation. */
  taskGeneration?: string
  expectedRevision: string
  method: ValidationMethod
  mappings: readonly { mappingId: string; outputId: string; sourceId: string; table: string }[]
  confirmations: Readonly<
    Record<string, { id: string; fields: readonly { source: string; target: string }[] }>
  >
}
export interface ValidationSave {
  input: ValidationSelection
  fingerprint: string
  commandId: string
  historyLimit: number
  schedule?: ValidationSchedule | null
  scheduleEnabled: boolean
}
export interface ValidationDisable {
  pipeline: string
  task: string
  taskGeneration: string
  expectedRevision: string
  command: string
}
export interface ValidationReference {
  pipeline: string
  task: string
  generation: string
  sequence: string
  run: string
}
export interface ValidationPaging {
  offset?: number
  limit?: number
}

type Budget = { nodes: number }
type Check<T> = (value: unknown, budget?: Budget) => value is T
type Decoded<G> = G extends Check<infer T> ? T : never
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text: Check<string> = (value): value is string => typeof value === 'string'
const flag: Check<boolean> = (value): value is boolean => typeof value === 'boolean'
const nil: Check<null> = (value): value is null => value === null
const counter: Check<string> = (value): value is string =>
  text(value) && /^(0|[1-9][0-9]{0,18})$/.test(value)
const positive: Check<string> = (value): value is string =>
  text(value) && /^[1-9][0-9]{0,18}$/.test(value)
const signed: Check<string> = (value): value is string =>
  text(value) && /^(0|-?[1-9][0-9]*)$/.test(value)
const uuid: Check<string> = (value): value is string =>
  text(value) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
const hash: Check<string> = (value): value is string => text(value) && /^[0-9a-f]{64}$/.test(value)
const pageOffset: Check<number> = (value): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647
const pageLimit: Check<number> = (value): value is number =>
  pageOffset(value) && value >= 1 && value <= 20
const historyLimit: Check<number> = (value): value is number =>
  pageOffset(value) && value >= 1 && value <= 100
const strings: Check<Readonly<Record<string, string>>> = (
  value,
): value is Readonly<Record<string, string>> =>
  record(value) && Object.values(value).every((entry) => text(entry))
function oneOf<const T extends readonly string[]>(...values: T): Check<T[number]> {
  return (value): value is T[number] => text(value) && (values as readonly string[]).includes(value)
}
function nullable<T>(accept: Check<T>): Check<T | null> {
  return (value, budget): value is T | null => value === null || accept(value, budget)
}
function array<T>(accept: Check<T>, max = Infinity): Check<readonly T[]> {
  return (value, budget): value is readonly T[] =>
    Array.isArray(value) && value.length <= max && value.every((item) => accept(item, budget))
}
function shape<const S extends Record<string, Check<unknown>>>(
  fields: S,
): Check<{ readonly [K in keyof S]: Decoded<S[K]> }> {
  return (value, budget): value is { readonly [K in keyof S]: Decoded<S[K]> } =>
    record(value) &&
    Object.entries(fields).every(
      ([key, accept]) => Object.hasOwn(value, key) && accept(value[key], budget),
    )
}

const method = oneOf('COUNT', 'UNIQUE_KEY', 'FULL_COLUMN')
const premise = oneOf('INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE')
const observationScope = oneOf('READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT')
const state = oneOf('STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'COMPLETED', 'FAILED')
const context = shape({ cluster: text, node: text, boot: text, member: uuid, incarnation: uuid })
export type ValidationContext = Decoded<typeof context>
const operation = shape({
  context,
  pipeline: text,
  task: text,
  taskGeneration: uuid,
  revision: positive,
  sequence: positive,
  command: uuid,
})
export type ValidationOperation = Decoded<typeof operation>
const schedule = shape({
  kind: oneOf('INTERVAL', 'CRON'),
  every: nullable(positive),
  unit: nullable(oneOf('MINUTES', 'HOURS', 'DAYS')),
  anchor: nullable(text),
  expression: nullable(text),
  zoneId: text,
})
export type ValidationSchedule = Decoded<typeof schedule>
const permissionFields = shape({
  phase: oneOf('OPEN', 'BORN', 'CLOSED'),
  taskGeneration: uuid,
  revision: positive,
  sequence: positive,
  command: uuid,
  run: text,
})
const ownerLease = oneOf('LIVE', 'NOT_LIVE', 'UNKNOWN')
type Permission = Decoded<typeof permissionFields> & {
  readonly ownerLease?: Decoded<typeof ownerLease>
}
const permission: Check<Permission> = (value, budget): value is Permission =>
  record(value) &&
  permissionFields(value, budget) &&
  (!('ownerLease' in value) ||
    (Object.hasOwn(value, 'ownerLease') && ownerLease(value.ownerLease, budget)))
const scheduleObservation = shape({
  node: text,
  boot: text,
  member: uuid,
  context: uuid,
  observedAt: text,
  nextDue: nullable(text),
  lastDue: nullable(text),
  state: oneOf(
    'WAITING',
    'OFF',
    'START_REQUESTED',
    'SKIPPED_BUSY',
    'SKIPPED_LATE',
    'FAILED',
    'UNKNOWN',
  ),
  reason: nullable(text),
  command: nullable(uuid),
  run: nullable(text),
  sequence: nullable(positive),
})
const savedKeys = shape({
  confirmationId: uuid,
  fields: array(shape({ source: array(text), target: array(text) })),
})
const savedMapping = shape({
  mappingId: text,
  outputId: text,
  sourceId: text,
  sourceTable: text,
  targetSourceId: text,
  targetTable: text,
  keys: nullable(savedKeys),
})
const task = shape({
  pipelineId: text,
  taskId: text,
  taskGeneration: uuid,
  revision: positive,
  nextStartSequence: positive,
  closed: flag,
  method,
  comparisonFingerprint: hash,
  historyLimit,
  schedule: nullable(schedule),
  scheduleEnabled: flag,
  mappings: array(savedMapping),
  context: nullable(context),
  permission: nullable(permission),
  scheduleObservation: nullable(scheduleObservation),
})
export type ValidationTask = Decoded<typeof task>
const sourceHints = shape({
  connectionId: text,
  connectorId: text,
  tables: array(shape({ name: text }), 1024),
  discoveredAt: (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
})
export type ValidationSourceHints = Decoded<typeof sourceHints>
const sourceFieldHints = shape({
  connectionId: text,
  tables: array(shape({ name: text, fields: array(shape({ name: text }), 4096) }), 1024),
})
export type ValidationSourceFieldHints = Decoded<typeof sourceFieldHints>

const field = shape({
  name: text,
  type: nullable(text),
  keyDomain: nullable(text),
  unavailableReason: nullable(text),
})
const candidate = shape({ origin: text, fields: array(text), issues: array(text) })
const side = shape({
  nodeId: text,
  sourceId: text,
  database: nullable(text),
  schema: nullable(text),
  table: text,
  modelVersion: nullable(text),
  codecBinding: nullable(text),
  countOperation: nullable(text),
  fields: array(field),
  candidates: array(candidate),
  pipelineWriteKeyUnknown: flag,
})
const evaluationShape = shape({
  method,
  configurationRevision: counter,
  mappingRevision: nullable(positive),
  fingerprint: nullable(hash),
  comparisonFingerprint: nullable(hash),
  mappings: array(shape({ id: text, source: side, target: side })),
  premise,
  conclusionScope: observationScope,
  context: nullable(context),
})
const evaluation: Check<Decoded<typeof evaluationShape>> = (
  value,
  budget,
): value is Decoded<typeof evaluationShape> =>
  evaluationShape(value, budget) &&
  (value.mappingRevision === null) === (value.fingerprint === null) &&
  (value.mappingRevision === null) === (value.comparisonFingerprint === null)
export type ValidationEvaluation = Decoded<typeof evaluation>
const saved = shape({
  outcome: oneOf('APPLIED', 'DUPLICATE'),
  fingerprint: hash,
  taskGeneration: uuid,
})
const saveRefused = shape({
  outcome: oneOf('CONFLICT', 'CLOSED', 'PRECHECK_REQUIRED'),
  fingerprint: nullable(hash),
  taskGeneration: nil,
})
export type ValidationSaved = Decoded<typeof saved> | Decoded<typeof saveRefused>
const disabled = shape({
  outcome: oneOf('APPLIED', 'DUPLICATE'),
  taskGeneration: uuid,
  receiptRevision: positive,
  command: uuid,
  scheduleEnabled: (value: unknown): value is false => value === false,
})
const disableRefused = shape({
  outcome: oneOf('CONFLICT', 'CLOSED'),
  taskGeneration: nil,
  receiptRevision: nil,
  command: uuid,
  scheduleEnabled: nil,
})
export type ValidationDisabled = Decoded<typeof disabled> | Decoded<typeof disableRefused>
const previewShape = shape({
  base: text,
  inputRevision: positive,
  zoneId: text,
  rulesVersion: text,
  occurrences: array(shape({ at: text, local: text, offset: text, weekday: text }), 5),
})
const preview: Check<Decoded<typeof previewShape>> = (
  value,
  budget,
): value is Decoded<typeof previewShape> =>
  previewShape(value, budget) && value.occurrences.length === 5
export type ValidationPreview = Decoded<typeof preview>
const execution = shape({
  original: operation,
  run: text,
  outcome: oneOf('PENDING', 'ACCEPTED', 'UNKNOWN', 'CAPACITY', 'REJECTED', 'BUSY'),
  state: nullable(state),
  admitted: flag,
  waiting: flag,
  controlUnknown: flag,
  retired: flag,
  drain: oneOf('UNKNOWN', 'NOT_DRAINED', 'DRAINED'),
  reason: nullable(text),
  tables: array(shape({ mapping: text, phase: text })),
  premise,
  conclusionScope: observationScope,
})
export type ValidationExecution = Decoded<typeof execution>
const reference = shape({
  pipeline: text,
  task: text,
  generation: uuid,
  sequence: positive,
  run: text,
})
const window = shape({ startedAt: text, finishedAt: nullable(text) })
const boundary = shape({ readId: text, contractVersion: text, startedAt: text, finishedAt: text })
const count = shape({
  mapping: text,
  output: text,
  source: counter,
  target: counter,
  difference: (value: unknown): value is string => signed(value) && value.length <= 20,
  sourceRead: boundary,
  targetRead: boundary,
})
const reportTable = shape({
  node: text,
  source: text,
  database: nullable(text),
  schema: nullable(text),
  table: text,
  modelVersion: nullable(text),
  codecBinding: nullable(text),
})
const component = shape({
  path: array(text),
  domain: text,
  logicalTypes: array(text),
  numericPolicy: text,
})
const reportMapping = shape({
  id: text,
  outputKind: text,
  output: text,
  source: reportTable,
  target: reportTable,
  keys: nullable(shape({ confirmation: uuid, source: array(component), target: array(component) })),
})
const failure = shape({
  code: nullable(text),
  params: strings,
  exceptionType: text,
  message: nullable(text),
  technical: nullable(text),
  fatal: flag,
})
const summary = shape({
  reference,
  method,
  closed: flag,
  terminal: nullable(state),
  terminalKnownAt: nullable(text),
  endedAt: nullable(text),
  window: nullable(window),
  rootCount: counter,
  retainedBytes: counter,
  countedTables: counter,
  mismatchedTables: counter,
})
export type ValidationSummary = Decoded<typeof summary>
const reportShape = shape({
  reference,
  method,
  mappingRevision: positive,
  rulesVersion: text,
  fingerprint: hash,
  mappings: array(reportMapping),
  closed: flag,
  terminal: nullable(state),
  terminalKnownAt: nullable(text),
  endedAt: nullable(text),
  window: nullable(window),
  failure: nullable(failure),
  rootCount: counter,
  retainedBytes: counter,
  counts: array(count),
  result: oneOf(
    'IN_PROGRESS',
    'INCOMPLETE',
    'COMPLETE_NO_ISSUES_OBSERVED',
    'COMPLETE_WITH_OBSERVATIONS',
  ),
  premise,
  premiseVerifiedBySystem: (value: unknown): value is false => value === false,
  conclusionScope: observationScope,
  physicalDrain: oneOf('UNKNOWN'),
})
const report: Check<Decoded<typeof reportShape>> = (
  value,
  budget,
): value is Decoded<typeof reportShape> => {
  if (
    !reportShape(value, budget) ||
    !value.counts.every(
      (item) => BigInt(item.source) - BigInt(item.target) === BigInt(item.difference),
    )
  )
    return false
  const complete =
    value.result === 'COMPLETE_NO_ISSUES_OBSERVED' || value.result === 'COMPLETE_WITH_OBSERVATIONS'
  if (complete !== (value.terminal === 'COMPLETED') || (complete && !value.closed)) return false
  if (complete) {
    const issues = value.rootCount !== '0' || value.counts.some((item) => item.difference !== '0')
    if ((value.result === 'COMPLETE_WITH_OBSERVATIONS') !== issues) return false
    if (
      value.method === 'COUNT' &&
      (value.counts.length !== value.mappings.length ||
        new Set(value.counts.map((item) => item.mapping)).size !== value.counts.length ||
        value.counts.some(
          (item) =>
            !value.mappings.some(
              (mapping) => mapping.id === item.mapping && mapping.output === item.output,
            ),
        ))
    )
      return false
  }
  return true
}
export type ValidationReport = Decoded<typeof report>

type ValueMetadata = Readonly<Record<string, string>>
type StringValueType =
  | 'text'
  | 'int8'
  | 'int16'
  | 'int32'
  | 'int64'
  | 'integer'
  | 'decimal'
  | 'float32-bits'
  | 'float64-bits'
  | 'date'
  | 'time'
  | 'local-date-time'
  | 'instant'
  | 'binary'
export type ValidationValue =
  | { readonly type: 'null'; readonly value: null; readonly metadata: ValueMetadata }
  | { readonly type: 'boolean'; readonly value: boolean; readonly metadata: ValueMetadata }
  | { readonly type: StringValueType; readonly value: string; readonly metadata: ValueMetadata }
  | { readonly type: 'typed'; readonly value: ValidationValue; readonly metadata: ValueMetadata }
  | {
      readonly type: 'array'
      readonly value: readonly ValidationValue[]
      readonly metadata: ValueMetadata
    }
  | {
      readonly type: 'object'
      readonly value: readonly { readonly name: string; readonly value: ValidationValue }[]
      readonly metadata: ValueMetadata
    }

function wire(value: unknown, budget: Budget, depth = 1): value is ValidationValue {
  if (++budget.nodes > 65536 || depth > 64 || !record(value) || !strings(value.metadata))
    return false
  const data = value.value
  switch (value.type) {
    case 'null':
      return data === null
    case 'boolean':
      return flag(data)
    case 'typed':
      return (
        text(value.metadata.logicalType) &&
        text(value.metadata.codecBinding) &&
        text(value.metadata.conversionOrigin) &&
        wire(data, budget, depth + 1)
      )
    case 'array':
      return (
        Array.isArray(data) &&
        data.length <= 65536 &&
        data.every((item) => wire(item, budget, depth + 1))
      )
    // Literal names and ordered entries stay arrays, including __proto__, dotted names and duplicates.
    case 'object':
      return (
        Array.isArray(data) &&
        data.length <= 65536 &&
        data.every((item) => record(item) && text(item.name) && wire(item.value, budget, depth + 1))
      )
    case 'integer':
      return signed(data)
    case 'decimal':
      return signed(data) && signed(value.metadata.scale)
    case 'float32-bits':
      return text(data) && /^[0-9a-f]{8}$/.test(data)
    case 'float64-bits':
      return text(data) && /^[0-9a-f]{16}$/.test(data)
    case 'binary':
      return (
        text(data) &&
        value.metadata.encoding === 'base64' &&
        text(value.metadata.subtype) &&
        /^(-1|0|[1-9][0-9]{0,2})$/.test(value.metadata.subtype) &&
        BigInt(value.metadata.subtype) <= 255n
      )
    case 'int8':
    case 'int16':
    case 'int32':
    case 'int64':
      return signed(data)
    case 'text':
    case 'date':
    case 'time':
    case 'local-date-time':
    case 'instant':
      return text(data)
    default:
      return false
  }
}
const wireValue: Check<ValidationValue> = (value, budget): value is ValidationValue =>
  wire(value, budget ?? { nodes: 0 })
const keyPart = shape({ domain: text, value: wireValue })
const root = shape({
  mappingId: text,
  outputId: text,
  key: array(keyPart),
  ancestors: array(shape({ fieldPath: array(text), key: array(keyPart) })),
})
const rootSummary = shape({ id: hash, root, summary: wireValue })
const rootDetail = shape({ id: hash, revision: positive, root, observation: wireValue })
export type ValidationRootSummary = Decoded<typeof rootSummary>
export type ValidationRootDetail = Decoded<typeof rootDetail>
function page<T>(item: Check<T>) {
  return shape({ items: array(item, 20), total: counter, offset: pageOffset, limit: pageLimit })
}
export interface ValidationPage<T> {
  readonly items: readonly T[]
  readonly total: string
  readonly offset: number
  readonly limit: number
}

function protocol(): never {
  throw new PipelineClientError('protocol', 'Tapstate returned an invalid validation response.')
}
// Accommodates the bounded evaluation projection and report wire forms, including JSON escaping.
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024
async function boundedBody(response: Response, maxBytes = MAX_RESPONSE_BYTES): Promise<string> {
  const length = response.headers.get('content-length')
  if (length && /^\d+$/.test(length) && (length.length > 10 || Number(length) > maxBytes)) {
    void response.body?.cancel().catch(() => {})
    return protocol()
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  let buffer = new Uint8Array(8192),
    used = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      if (next.value.byteLength > maxBytes - used) {
        void reader.cancel().catch(() => {})
        return protocol()
      }
      const needed = used + next.value.byteLength
      if (needed > buffer.length) {
        const grown = new Uint8Array(Math.min(maxBytes, Math.max(buffer.length * 2, needed)))
        grown.set(buffer.subarray(0, used))
        buffer = grown
      }
      buffer.set(next.value, used)
      used = needed
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, used))
    } catch {
      return protocol()
    }
  } finally {
    reader.releaseLock()
  }
}
function decode<T>(value: unknown, accept: Check<T>): T {
  if (!accept(value, { nodes: 0 })) return protocol()
  return value
}
function sameReference(left: ValidationReference, right: ValidationReference) {
  return (
    left.pipeline === right.pipeline &&
    left.task === right.task &&
    left.generation === right.generation &&
    left.sequence === right.sequence &&
    left.run === right.run
  )
}
function sameOperation(left: ValidationOperation, right: ValidationOperation) {
  return (
    left.pipeline === right.pipeline &&
    left.task === right.task &&
    left.taskGeneration === right.taskGeneration &&
    left.revision === right.revision &&
    left.sequence === right.sequence &&
    left.command === right.command &&
    left.context.cluster === right.context.cluster &&
    left.context.node === right.context.node &&
    left.context.boot === right.context.boot &&
    left.context.member === right.context.member &&
    left.context.incarnation === right.context.incarnation
  )
}

/** Supply the existing authenticated ApiFetcher. No command retry, identity refresh or local state is performed. */
export function createValidationClient(fetcher: ApiFetcher) {
  async function request<T>(
    path: string,
    accept: Check<T>,
    signal?: AbortSignal,
    body?: unknown,
    absent = false,
    refusal?: Check<T>,
    maxBytes = MAX_RESPONSE_BYTES,
  ): Promise<T | null> {
    const encoded = body === undefined ? undefined : JSON.stringify(body)
    let response: Response
    try {
      response = await fetcher(`/api${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        cache: 'no-store',
        signal,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: encoded,
      })
    } catch (error) {
      if (record(error) && error.name === 'AbortError') throw error
      throw new PipelineClientError('network', 'The validation request did not reach Tapstate.')
    }
    let raw: string
    try {
      raw = await boundedBody(response, maxBytes)
    } catch (error) {
      if (error instanceof PipelineClientError) throw error
      if (record(error) && error.name === 'AbortError') throw error
      throw new PipelineClientError(
        'network',
        'The validation response did not finish.',
        response.status,
      )
    }
    if (absent && response.status === 404 && raw.trim() === '') return null
    let payload: unknown = null
    try {
      payload = JSON.parse(raw)
    } catch {
      /* A non-JSON refusal still retains its HTTP status. */
    }
    if (response.status === 409 && refusal?.(payload, { nodes: 0 })) return payload
    if (!response.ok) {
      const code = record(payload) && text(payload.code) ? payload.code : null
      const params = record(payload) && record(payload.params) ? payload.params : {}
      const message =
        record(payload) && text(payload.message)
          ? payload.message
          : `Validation request refused (HTTP ${response.status}).`
      throw new PipelineClientError('server', message, response.status, code, params)
    }
    return decode(payload, accept)
  }
  async function post<T>(
    verb: string,
    body: unknown,
    accept: Check<T>,
    signal?: AbortSignal,
    refusal?: Check<T>,
  ): Promise<T> {
    const result = await request(`/validation:${verb}`, accept, signal, body, false, refusal)
    return result === null ? protocol() : result
  }
  function taskPath(pipeline: string, taskId: string) {
    return `/pipelines/${encodeURIComponent(pipeline)}/validation-tasks/${encodeURIComponent(taskId)}`
  }
  function reportPath(identity: ValidationReference, suffix = '') {
    decode(identity, reference)
    return `${taskPath(identity.pipeline, identity.task)}/reports/${encodeURIComponent(identity.run)}${suffix}?${new URLSearchParams({ generation: identity.generation, sequence: identity.sequence })}`
  }
  function paging(query: ValidationPaging = {}) {
    const offset = query.offset ?? 0,
      limit = query.limit ?? 10
    if (!pageOffset(offset) || !pageLimit(limit)) return protocol()
    return new URLSearchParams({ offset: String(offset), limit: String(limit) }).toString()
  }
  async function control(
    verb: 'start' | 'progress' | 'stop',
    input: ValidationOperation,
    signal?: AbortSignal,
  ) {
    decode(input, operation)
    const original = { ...input, context: { ...input.context } }
    const result = await post(verb, original, execution, signal)
    if (!sameOperation(result.original, original)) return protocol()
    return result
  }
  return {
    /** Existing platform models provide suggestions only; missing discovery never invents fields. */
    async sourceFieldHints(
      source: string,
      signal?: AbortSignal,
    ): Promise<ValidationSourceFieldHints | null> {
      const result = await request(
        `/sources/${encodeURIComponent(source)}/schema`,
        sourceFieldHints,
        signal,
        undefined,
        true,
        undefined,
        8 * 1024 * 1024,
      )
      if (result === null) return null
      if (
        result.connectionId !== source ||
        result.tables.some(
          (table) =>
            table.name.length === 0 ||
            table.name.length > 512 ||
            new Set(table.fields.map((field) => field.name)).size !== table.fields.length ||
            table.fields.some((field) => field.name.length === 0 || field.name.length > 512),
        )
      )
        return protocol()
      if (new Set(result.tables.map((table) => table.name)).size !== result.tables.length)
        return protocol()
      return {
        connectionId: source,
        tables: result.tables.map((table) => ({
          name: table.name,
          fields: table.fields.map((field) => ({ name: field.name })),
        })),
      }
    },
    /** Retained, server-scoped names are authoring hints; evaluation rechecks the selected scope. */
    async sourceHints(source: string, signal?: AbortSignal): Promise<ValidationSourceHints | null> {
      const result = await request(
        `/sources/${encodeURIComponent(source)}/schema`,
        sourceHints,
        signal,
        undefined,
        true,
        undefined,
        8 * 1024 * 1024,
      )
      if (
        result !== null &&
        (result.connectionId !== source ||
          source.length > 512 ||
          result.connectorId.length === 0 ||
          result.connectorId.length > 512 ||
          result.tables.some((table) => table.name.length === 0 || table.name.length > 512) ||
          new Set(result.tables.map((table) => table.name)).size !== result.tables.length)
      )
        return protocol()
      return result === null
        ? null
        : {
            connectionId: result.connectionId,
            connectorId: result.connectorId,
            discoveredAt: result.discoveredAt,
            tables: result.tables.map((table) => ({ name: table.name })),
          }
    },
    evaluate: (input: ValidationSelection, signal?: AbortSignal) =>
      post('evaluate', input, evaluation, signal),
    save: (input: ValidationSave, signal?: AbortSignal): Promise<ValidationSaved> =>
      post<ValidationSaved>('save', input, saved, signal, saveRefused),
    disableSchedule: (
      input: ValidationDisable,
      signal?: AbortSignal,
    ): Promise<ValidationDisabled> =>
      post<ValidationDisabled>('schedule-disable', input, disabled, signal, disableRefused),
    async previewSchedule(
      input: { schedule: ValidationSchedule; inputRevision: string },
      signal?: AbortSignal,
    ) {
      const result = await post('schedule-preview', input, preview, signal)
      if (result.inputRevision !== input.inputRevision || result.zoneId !== input.schedule.zoneId)
        return protocol()
      return result
    },
    async task(
      pipeline: string,
      taskId: string,
      signal?: AbortSignal,
    ): Promise<ValidationTask | null> {
      const result = await request(taskPath(pipeline, taskId), task, signal, undefined, true)
      if (result !== null && (result.pipelineId !== pipeline || result.taskId !== taskId))
        return protocol()
      return result
    },
    start: (input: ValidationOperation, signal?: AbortSignal) => control('start', input, signal),
    progress: (input: ValidationOperation, signal?: AbortSignal) =>
      control('progress', input, signal),
    stop: (input: ValidationOperation, signal?: AbortSignal) => control('stop', input, signal),
    async history(
      pipeline: string,
      taskId: string,
      query?: ValidationPaging,
      signal?: AbortSignal,
    ): Promise<ValidationPage<ValidationSummary>> {
      const result = await request(
        `${taskPath(pipeline, taskId)}/reports?${paging(query)}`,
        page(summary),
        signal,
      )
      if (
        result === null ||
        result.items.some(
          (item) => item.reference.pipeline !== pipeline || item.reference.task !== taskId,
        )
      )
        return protocol()
      return result
    },
    async report(
      identity: ValidationReference,
      signal?: AbortSignal,
    ): Promise<ValidationReport | null> {
      const result = await request(reportPath(identity), report, signal, undefined, true)
      if (result !== null && !sameReference(result.reference, identity)) return protocol()
      return result
    },
    roots: async (
      identity: ValidationReference,
      query?: ValidationPaging,
      signal?: AbortSignal,
    ): Promise<ValidationPage<ValidationRootSummary> | null> =>
      request(
        `${reportPath(identity, '/roots')}&${paging(query)}`,
        page(rootSummary),
        signal,
        undefined,
        true,
      ),
    async root(
      identity: ValidationReference,
      id: string,
      signal?: AbortSignal,
    ): Promise<ValidationRootDetail | null> {
      if (!hash(id)) return protocol()
      const result = await request(
        reportPath(identity, `/roots/${encodeURIComponent(id)}`),
        rootDetail,
        signal,
        undefined,
        true,
      )
      if (result !== null && result.id !== id) return protocol()
      return result
    },
  }
}
