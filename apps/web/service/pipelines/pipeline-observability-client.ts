import type { ApiFetcher } from '../source-client'

import { PipelineClientError, type PipelineRuntimeState } from './pipeline-client'

export type PipelineHistoryResolution = 'auto' | 'raw' | 'PT5M' | 'PT30M' | 'PT1H' | 'PT3H' | 'PT6H'

export type PipelineHistoryStartReason =
  | 'WINDOW_START'
  | 'CONTINUATION'
  | 'COUNTER_RESET'
  | 'GAP'
  | 'EXECUTION_CHANGE'

export type PipelineExplainKind =
  | 'OBSERVATION_STALE'
  | 'CODED_FAILURE'
  | 'RECONCILE_FAILURES'
  | 'NO_MOVEMENT'
  | 'FRONTIER_STALLED'
  | 'NO_MATCH'

export interface PipelineHistoryQuery {
  from: string
  to: string
  resolution?: PipelineHistoryResolution
  limit?: number
  tables?: string[]
  cursor?: string
}

export interface PipelineHistoryRate {
  delta: number
  averageRate: number
  maxRate: number
}

export interface PipelineHistoryLagPoint {
  table: string
  observedAt: string
  last: number
  max: number
}

export interface PipelineHistoryPoint {
  intervalStart: string
  intervalEnd: string
  recordsOut?: PipelineHistoryRate
  bytesOut?: PipelineHistoryRate
  lag: PipelineHistoryLagPoint[]
}

export interface PipelineHistorySegment {
  intervalStart: string
  intervalEnd: string
  startReason: PipelineHistoryStartReason
  points: PipelineHistoryPoint[]
}

export interface PipelineHistoryGap {
  intervalStart: string
  intervalEnd: string
  reason: 'SAMPLE_GAP'
}

export interface PipelineHistoryUnavailableMetric {
  metric: 'records.out' | 'bytes.out' | 'lag'
  table?: string
}

export interface PipelineMetricsHistory {
  pipelineId: string
  from: string
  to: string
  effectiveFrom: string
  effectiveTo: string
  retentionCutoff: string
  effectiveResolution: Exclude<PipelineHistoryResolution, 'auto' | 'raw'> | 'PT1M'
  status: 'OK' | 'NO_RETAINED_SAMPLES'
  consistency: 'EVENTUAL'
  segments: PipelineHistorySegment[]
  gaps: PipelineHistoryGap[]
  unavailable: PipelineHistoryUnavailableMetric[]
  nextCursor: string | null
}

export interface PipelineExplainEvidence {
  source: string
  field: string
  value: unknown
}

export interface PipelineExplainNext {
  action: 'CHECK_SERVER' | 'OPEN_PIPELINE_LOGS' | 'CHECK_TARGET'
  message: string
}

export interface PipelineExplain {
  pipelineId: string
  state: PipelineRuntimeState
  kind: PipelineExplainKind
  message: string
  observedAt?: string
  observedAgeMillis?: number
  freshness: 'FRESH' | 'STALE' | 'UNKNOWN'
  evidence: PipelineExplainEvidence[]
  cannotSay: string[]
  next: PipelineExplainNext | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isHistoryRate(value: unknown): value is PipelineHistoryRate {
  return (
    isRecord(value) &&
    isFiniteNumber(value.delta) &&
    isFiniteNumber(value.averageRate) &&
    isFiniteNumber(value.maxRate)
  )
}

function isHistoryLagPoint(value: unknown): value is PipelineHistoryLagPoint {
  return (
    isRecord(value) &&
    typeof value.table === 'string' &&
    typeof value.observedAt === 'string' &&
    isFiniteNumber(value.last) &&
    isFiniteNumber(value.max)
  )
}

function isHistoryPoint(value: unknown): value is PipelineHistoryPoint {
  return (
    isRecord(value) &&
    typeof value.intervalStart === 'string' &&
    typeof value.intervalEnd === 'string' &&
    (value.recordsOut === undefined || isHistoryRate(value.recordsOut)) &&
    (value.bytesOut === undefined || isHistoryRate(value.bytesOut)) &&
    Array.isArray(value.lag) &&
    value.lag.every(isHistoryLagPoint)
  )
}

function isHistorySegment(value: unknown): value is PipelineHistorySegment {
  return (
    isRecord(value) &&
    typeof value.intervalStart === 'string' &&
    typeof value.intervalEnd === 'string' &&
    ['WINDOW_START', 'CONTINUATION', 'COUNTER_RESET', 'GAP', 'EXECUTION_CHANGE'].includes(
      value.startReason as string,
    ) &&
    Array.isArray(value.points) &&
    value.points.every(isHistoryPoint)
  )
}

function isHistoryGap(value: unknown): value is PipelineHistoryGap {
  return (
    isRecord(value) &&
    typeof value.intervalStart === 'string' &&
    typeof value.intervalEnd === 'string' &&
    value.reason === 'SAMPLE_GAP'
  )
}

function isUnavailableMetric(value: unknown): value is PipelineHistoryUnavailableMetric {
  return (
    isRecord(value) &&
    ['records.out', 'bytes.out', 'lag'].includes(value.metric as string) &&
    (value.table === undefined || typeof value.table === 'string')
  )
}

function isPipelineMetricsHistory(value: unknown): value is PipelineMetricsHistory {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.effectiveFrom === 'string' &&
    typeof value.effectiveTo === 'string' &&
    typeof value.retentionCutoff === 'string' &&
    ['PT1M', 'PT5M', 'PT30M', 'PT1H', 'PT3H', 'PT6H'].includes(
      value.effectiveResolution as string,
    ) &&
    ['OK', 'NO_RETAINED_SAMPLES'].includes(value.status as string) &&
    value.consistency === 'EVENTUAL' &&
    Array.isArray(value.segments) &&
    value.segments.every(isHistorySegment) &&
    Array.isArray(value.gaps) &&
    value.gaps.every(isHistoryGap) &&
    Array.isArray(value.unavailable) &&
    value.unavailable.every(isUnavailableMetric) &&
    (value.nextCursor === null || typeof value.nextCursor === 'string')
  )
}

function isPipelineExplainEvidence(value: unknown): value is PipelineExplainEvidence {
  return isRecord(value) && typeof value.source === 'string' && typeof value.field === 'string'
}

function isPipelineExplainNext(value: unknown): value is PipelineExplainNext {
  return (
    isRecord(value) &&
    ['CHECK_SERVER', 'OPEN_PIPELINE_LOGS', 'CHECK_TARGET'].includes(value.action as string) &&
    typeof value.message === 'string'
  )
}

function isPipelineExplain(value: unknown): value is PipelineExplain {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    ['NEW', 'RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED', 'FAILED'].includes(
      value.state as string,
    ) &&
    [
      'OBSERVATION_STALE',
      'CODED_FAILURE',
      'RECONCILE_FAILURES',
      'NO_MOVEMENT',
      'FRONTIER_STALLED',
      'NO_MATCH',
    ].includes(value.kind as string) &&
    typeof value.message === 'string' &&
    (value.observedAt === undefined || typeof value.observedAt === 'string') &&
    (value.observedAgeMillis === undefined || isFiniteNumber(value.observedAgeMillis)) &&
    ['FRESH', 'STALE', 'UNKNOWN'].includes(value.freshness as string) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isPipelineExplainEvidence) &&
    isStringArray(value.cannotSay) &&
    (value.next === null || isPipelineExplainNext(value.next))
  )
}

function responseMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : fallback
}

async function request(path: string, fetcher: ApiFetcher): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(`/api${path}`)
  } catch (error) {
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'The request did not reach Tapstate.',
    )
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline observability request.'),
      response.status,
      code,
      params,
    )
  }
  return payload
}

function historySearch(query: PipelineHistoryQuery) {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  if (query.resolution) params.set('resolution', query.resolution)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  for (const table of query.tables ?? []) params.append('table', table)
  if (query.cursor) params.set('cursor', query.cursor)
  return params.toString()
}

export async function getPipelineMetricsHistory(
  pipelineId: string,
  query: PipelineHistoryQuery,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineMetricsHistory> {
  const payload = await request(
    `/pipelines/${encodeURIComponent(pipelineId)}/metrics/history?${historySearch(query)}`,
    fetcher,
  )
  if (!isPipelineMetricsHistory(payload) || payload.pipelineId !== pipelineId) {
    throw new PipelineClientError('protocol', 'Tapstate returned invalid Pipeline metrics history.')
  }
  return payload
}

export async function getPipelineExplain(
  pipelineId: string,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineExplain> {
  const payload = await request(`/pipelines/${encodeURIComponent(pipelineId)}/explain`, fetcher)
  if (!isPipelineExplain(payload) || payload.pipelineId !== pipelineId) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline explanation.')
  }
  return payload
}
