import type { PipelineMetrics, PipelineStatus } from '@/service/pipelines/pipeline-client'
import type {
  PipelineExplain,
  PipelineInitialLoadStage,
  PipelineSnapshot,
} from '@/service/pipelines/pipeline-observability-client'

/** A chain pinned longer than this is reported as not advancing; the server's diagnosis uses the same bound. */
export const STALL_THRESHOLD_MS = 60_000

const LAG_PREFIX = 'lag.'
const STALLED_PREFIX = 'frontierStalledMillis.'
const GAP_PREFIX = 'frontierGap.'
const ERRORS_PREFIX = 'errors.'
const NEST_INFO_METRIC = 'tapstate.pipeline.nest.namespace.info'
const RECORDS_METRIC = 'tapstate.pipeline.records'

export type HealthKind =
  | 'failed'
  | 'stale'
  | 'reconcileFailures'
  | 'noMovement'
  | 'stalled'
  | 'loading'
  | 'healthy'
  | 'notRunning'
  | 'unknown'

export type HealthTone = 'error' | 'warning' | 'info' | 'neutral'

export interface LoadingTable {
  table: string
  rowsRead: number | null
  rowsTotal: number | null
}

export interface MonitoringHealth {
  kind: HealthKind
  tone: HealthTone
  /** The table whose load has the most rows left, when a load is in progress. */
  loading?: LoadingTable
  landedTables?: number
  totalTables?: number
  stalledTables?: { table: string; stalledMs: number }[]
  /** The server's own words for its diagnosis and next step, when it gave them. */
  message?: string
  next?: string
  failureCode?: string
  observedAgeMillis?: number | null
}

export type TablePhase = 'pending' | 'loading' | 'streaming' | 'loaded' | 'unknown'

export interface MonitoringTableRow {
  table: string
  phase: TablePhase
  rowsRead: number | null
  rowsTotal: number | null
  stalledMs: number | null
  gap: number | null
  /** Seconds since the newest change delivered, when this table has its own output. */
  newestChangeSeconds: number | null
  recordsIn: number | null
}

export interface MonitoringOutput {
  output: string
  newestChangeSeconds: number
}

export interface NestStage {
  namespace: string
  step: string | null
  /** Path components of the document level; empty for the root. */
  path: string[] | null
  map: string | null
  entries: number | null
  accesses: number | null
  backfills: number | null
  backfillMillis: number | null
  pendingHighWater: number | null
}

export interface JoinRecompute {
  namespace: string
  done: number
  expected: number | null
}

export interface KeyFigures {
  newestChangeSeconds: number | null
  recordsIn: number | null
  recordsOut: number | null
  bytesIn: number | null
  bytesOut: number | null
  failures: number
  failureCodes: string[]
  landedTables: number | null
  totalTables: number | null
  rowsRead: number
  rowsTotal: number | null
}

export type MetricUnit = 'bytes' | 'milliseconds' | 'seconds' | 'count'

export type MetricGroupId =
  | 'throughput'
  | 'lag'
  | 'frontier'
  | 'initialLoad'
  | 'nest'
  | 'join'
  | 'errors'
  | 'other'

export interface MetricGroup {
  id: MetricGroupId
  metrics: { name: string; value: number; unit: MetricUnit }[]
}

const METRIC_GROUP_ORDER: MetricGroupId[] = [
  'throughput',
  'lag',
  'frontier',
  'initialLoad',
  'nest',
  'join',
  'errors',
  'other',
]

function byPrefix(metrics: Record<string, number>, prefix: string) {
  const found: Record<string, number> = {}
  for (const [name, value] of Object.entries(metrics)) {
    if (name.startsWith(prefix)) found[name.slice(prefix.length)] = value
  }
  return found
}

function stillLoading(stage: PipelineInitialLoadStage | undefined) {
  return stage === 'PENDING' || stage === 'READING' || stage === 'LANDING'
}

function phaseOf(
  stage: PipelineInitialLoadStage | undefined,
  readMode: string | undefined,
): TablePhase {
  if (stage === 'PENDING') return 'pending'
  if (stage === 'READING' || stage === 'LANDING') return 'loading'
  if (stage === 'LANDED') return readMode === 'snapshot_only' ? 'loaded' : 'streaming'
  return 'unknown'
}

/** Parses the engine's canonical JSON array of path components; null when it is not one. */
export function parseNestPath(path: string | undefined): string[] | null {
  if (path === undefined) return null
  try {
    const parsed: unknown = JSON.parse(path)
    return Array.isArray(parsed) && parsed.every((part) => typeof part === 'string') ? parsed : null
  } catch {
    return null
  }
}

function factPoints(metrics: PipelineMetrics | undefined, name: string) {
  return metrics?.facts?.find((fact) => fact.name === name)?.points ?? []
}

function recordsInByTable(metrics: PipelineMetrics | undefined) {
  const totals: Record<string, number> = {}
  for (const point of factPoints(metrics, RECORDS_METRIC)) {
    const table = point.attributes['tapstate.table.id']
    if (point.attributes.direction !== 'in' || table === undefined || point.value === undefined) {
      continue
    }
    totals[table] = (totals[table] ?? 0) + point.value
  }
  return totals
}

export function deriveTables(
  metrics: PipelineMetrics | undefined,
  snapshot: PipelineSnapshot | undefined,
): { rows: MonitoringTableRow[]; outputs: MonitoringOutput[] } {
  const flat = metrics?.metrics ?? {}
  const stalled = byPrefix(flat, STALLED_PREFIX)
  const gaps = byPrefix(flat, GAP_PREFIX)
  const lag = byPrefix(flat, LAG_PREFIX)
  const recordsIn = recordsInByTable(metrics)
  const load = snapshot?.initialLoad ?? undefined
  const names = new Set<string>([
    ...Object.keys(snapshot?.snapshot ?? {}),
    ...Object.keys(load?.tables ?? {}),
    ...Object.keys(stalled),
    ...Object.keys(gaps),
    ...Object.keys(recordsIn),
  ])

  const rows = [...names].map((table): MonitoringTableRow => {
    const loaded = load?.tables[table]
    const done = snapshot?.snapshot[table]
    return {
      table,
      phase: phaseOf(loaded?.stage, load?.readMode),
      rowsRead: loaded?.rowsRead ?? done?.rowsDone ?? null,
      rowsTotal: loaded?.rowsTotalEstimate ?? done?.rowsTotal ?? null,
      stalledMs: stalled[table] ?? null,
      gap: gaps[table] ?? null,
      newestChangeSeconds: lag[table] ?? null,
      recordsIn: recordsIn[table] ?? null,
    }
  })
  rows.sort(
    (left, right) => attentionRank(left) - attentionRank(right) || compareStalled(left, right),
  )

  const outputs = Object.entries(lag)
    .filter(([output]) => !names.has(output))
    .map(([output, newestChangeSeconds]) => ({ output, newestChangeSeconds }))
    .sort((left, right) => left.output.localeCompare(right.output))
  return { rows, outputs }
}

function attentionRank(row: MonitoringTableRow) {
  if (row.phase === 'loading') return 0
  if (row.phase === 'pending') return 1
  if ((row.stalledMs ?? 0) > STALL_THRESHOLD_MS) return 2
  return 3
}

function compareStalled(left: MonitoringTableRow, right: MonitoringTableRow) {
  return (right.stalledMs ?? 0) - (left.stalledMs ?? 0) || left.table.localeCompare(right.table)
}

export function deriveHealth(
  status: PipelineStatus | undefined,
  explain: PipelineExplain | undefined,
  snapshot: PipelineSnapshot | undefined,
): MonitoringHealth {
  const state = status?.displayState ?? status?.state
  const observedAgeMillis = explain?.observedAgeMillis ?? status?.observedAgeMillis ?? null
  const words = {
    message: explain?.message,
    next: explain?.next?.message ?? undefined,
    observedAgeMillis,
  }

  if (state === 'FAILED' || status?.failure || explain?.kind === 'CODED_FAILURE') {
    return { kind: 'failed', tone: 'error', failureCode: status?.failure?.code, ...words }
  }
  if (explain?.kind === 'OBSERVATION_STALE') return { kind: 'stale', tone: 'warning', ...words }
  if (explain?.kind === 'RECONCILE_FAILURES') {
    return { kind: 'reconcileFailures', tone: 'warning', ...words }
  }
  if (explain?.kind === 'FRONTIER_STALLED') {
    const stalledTables = explain.evidence
      .filter((evidence) => evidence.field.startsWith(STALLED_PREFIX))
      .map((evidence) => ({
        table: evidence.field.slice(STALLED_PREFIX.length),
        stalledMs: typeof evidence.value === 'number' ? evidence.value : 0,
      }))
    return { kind: 'stalled', tone: 'warning', stalledTables, ...words }
  }

  const tables = Object.entries(snapshot?.initialLoad?.tables ?? {})
  const loading = tables
    .filter(([, table]) => stillLoading(table.stage))
    .map(([table, load]) => ({
      table,
      rowsRead: load.rowsRead ?? null,
      rowsTotal: load.rowsTotalEstimate ?? null,
    }))
    .sort(
      (left, right) => remaining(right) - remaining(left) || left.table.localeCompare(right.table),
    )
  if (loading.length > 0) {
    return {
      kind: 'loading',
      tone: 'info',
      loading: loading[0],
      landedTables: tables.length - loading.length,
      totalTables: tables.length,
      ...words,
    }
  }
  if (explain?.kind === 'NO_MOVEMENT') return { kind: 'noMovement', tone: 'warning', ...words }
  if (state === 'RUNNING') return { kind: 'healthy', tone: 'neutral', observedAgeMillis }
  if (state === undefined) return { kind: 'unknown', tone: 'neutral', observedAgeMillis }
  return { kind: 'notRunning', tone: 'neutral', observedAgeMillis }
}

function remaining(table: LoadingTable) {
  if (table.rowsTotal === null) return Number.MAX_SAFE_INTEGER
  return Math.max(0, table.rowsTotal - (table.rowsRead ?? 0))
}

export function deriveKeyFigures(
  metrics: PipelineMetrics | undefined,
  snapshot: PipelineSnapshot | undefined,
): KeyFigures {
  const flat = metrics?.metrics ?? {}
  const lags = Object.values(byPrefix(flat, LAG_PREFIX))
  const errors = byPrefix(flat, ERRORS_PREFIX)
  const loadTables = Object.values(snapshot?.initialLoad?.tables ?? {})
  const snapshotTables = Object.values(snapshot?.snapshot ?? {})
  const rowsRead =
    loadTables.length > 0
      ? loadTables.reduce((sum, table) => sum + (table.rowsRead ?? 0), 0)
      : snapshotTables.reduce((sum, table) => sum + table.rowsDone, 0)
  const totals =
    loadTables.length > 0
      ? loadTables.map((table) => table.rowsTotalEstimate)
      : snapshotTables.map((table) => table.rowsTotal)
  const rowsTotal = totals.every((total) => typeof total === 'number')
    ? totals.reduce<number>((sum, total) => sum + (total ?? 0), 0)
    : null
  return {
    // The newest change across outputs: the largest value is usually just the quietest output.
    newestChangeSeconds: lags.length > 0 ? Math.min(...lags) : null,
    recordsIn: flat['records.in'] ?? null,
    recordsOut: flat['records.out'] ?? null,
    bytesIn: flat['bytes.in'] ?? null,
    bytesOut: flat['bytes.out'] ?? null,
    failures: Object.values(errors).reduce((sum, count) => sum + count, 0),
    failureCodes: Object.entries(errors)
      .filter(([, count]) => count > 0)
      .map(([code]) => code)
      .sort(),
    landedTables: snapshot?.initialLoad
      ? loadTables.filter((table) => table.stage === 'LANDED').length
      : null,
    totalTables: snapshot?.initialLoad ? loadTables.length : null,
    rowsRead,
    rowsTotal: totals.length > 0 ? rowsTotal : null,
  }
}

export function deriveNestStages(metrics: PipelineMetrics | undefined): NestStage[] {
  const flat = metrics?.metrics ?? {}
  const origins = new Map<string, { step?: string; path?: string; map?: string }>()
  for (const point of factPoints(metrics, NEST_INFO_METRIC)) {
    const namespace = point.attributes['tapstate.nest.namespace']
    if (namespace === undefined) continue
    origins.set(namespace, {
      step: point.attributes['tapstate.nest.step'],
      path: point.attributes['tapstate.nest.path'],
      map: point.attributes['tapstate.nest.map'],
    })
  }
  const entries = byPrefix(flat, 'nestStateEntries.')
  const accesses = byPrefix(flat, 'nestStateAccesses.')
  const backfills = byPrefix(flat, 'nestStateBackfills.')
  const backfillMillis = byPrefix(flat, 'nestStateBackfillMillis.')
  const pendingHighWater = byPrefix(flat, 'nestStatePendingHighWater.')
  const namespaces = new Set([
    ...Object.keys(entries),
    ...Object.keys(accesses),
    ...Object.keys(backfills),
    ...Object.keys(backfillMillis),
    ...Object.keys(pendingHighWater),
  ])
  return [...namespaces]
    .map((namespace): NestStage => {
      const origin = origins.get(namespace)
      return {
        namespace,
        step: origin?.step ?? null,
        path: parseNestPath(origin?.path),
        map: origin?.map ?? null,
        entries: entries[namespace] ?? null,
        accesses: accesses[namespace] ?? null,
        backfills: backfills[namespace] ?? null,
        backfillMillis: backfillMillis[namespace] ?? null,
        pendingHighWater: pendingHighWater[namespace] ?? null,
      }
    })
    .sort(compareStages)
}

/** Named stages first, by step, level and map; stages the server could not name after them. */
function compareStages(left: NestStage, right: NestStage) {
  if ((left.step === null) !== (right.step === null)) return left.step === null ? 1 : -1
  return (
    (left.step ?? '').localeCompare(right.step ?? '') ||
    (left.path ?? []).join('.').localeCompare((right.path ?? []).join('.')) ||
    (left.map ?? '').localeCompare(right.map ?? '') ||
    left.namespace.localeCompare(right.namespace)
  )
}

export function deriveJoinRecomputes(metrics: PipelineMetrics | undefined): JoinRecompute[] {
  const flat = metrics?.metrics ?? {}
  const done = byPrefix(flat, 'joinRecomputeRowsDone.')
  const expected = byPrefix(flat, 'joinRecomputeRowsExpected.')
  return Object.keys(done)
    .sort()
    .map((namespace) => ({
      namespace,
      done: done[namespace] ?? 0,
      expected: expected[namespace] ?? null,
    }))
}

function groupOf(name: string): MetricGroupId {
  if (name.startsWith('records.') || name.startsWith('bytes.') || name === 'recordCount') {
    return 'throughput'
  }
  if (name.startsWith(LAG_PREFIX)) return 'lag'
  if (name.startsWith('frontier')) return 'frontier'
  if (name.startsWith('snapshot.')) return 'initialLoad'
  if (name.startsWith('nest')) return 'nest'
  if (name.startsWith('join')) return 'join'
  if (name.startsWith(ERRORS_PREFIX) || name === 'reconcileFailuresInARow') return 'errors'
  return 'other'
}

export function unitOf(name: string): MetricUnit {
  if (name.startsWith('bytes.')) return 'bytes'
  if (name.startsWith(LAG_PREFIX)) return 'seconds'
  if (name.includes('Millis')) return 'milliseconds'
  return 'count'
}

export function groupMetrics(metrics: PipelineMetrics | undefined): MetricGroup[] {
  const groups = new Map<MetricGroupId, MetricGroup>()
  for (const [name, value] of Object.entries(metrics?.metrics ?? {})) {
    const id = groupOf(name)
    const group = groups.get(id) ?? { id, metrics: [] }
    group.metrics.push({ name, value, unit: unitOf(name) })
    groups.set(id, group)
  }
  return METRIC_GROUP_ORDER.flatMap((id) => {
    const group = groups.get(id)
    if (!group) return []
    group.metrics.sort((left, right) => left.name.localeCompare(right.name))
    return [group]
  })
}

/** The earliest start any accumulating counter reports: when the current run began counting. */
export function runStartedAt(metrics: PipelineMetrics | undefined): number | null {
  const starts = (metrics?.facts ?? [])
    .flatMap((fact) => fact.points)
    .map((point) => (point.startTime ? Date.parse(point.startTime) : Number.NaN))
    .filter((value) => Number.isFinite(value))
  return starts.length > 0 ? Math.min(...starts) : null
}

/** The output names lag is reported under, which are what the lag history must be asked for. */
export function lagOutputs(metrics: PipelineMetrics | undefined): string[] {
  return Object.keys(byPrefix(metrics?.metrics ?? {}, LAG_PREFIX)).sort()
}
