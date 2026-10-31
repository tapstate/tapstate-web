import type { ApiFetcher } from './source-client'

/**
 * A collection a pipeline keeps up to date. A view is a document assembled by a pipeline; a
 * replica is a table copied as is. One pipeline can maintain several entries.
 */
export type ViewKind = 'view' | 'replica'

/**
 * Server-qualified observation availability and target-acked event age. Source idleness can
 * increase event age while observations remain current; this is not source-to-target lag.
 */
export interface ViewMeasurement {
  eventAgeSeconds?: number | null
  observedAt?: string | null
  refreshedAt?: string | null
  observationAgeSeconds?: number | null
  unit?: 's'
  aggregation?: 'max-input-table-event-age'
  reason?: string
}

export type ViewFreshness = ViewMeasurement &
  (
    | { state: 'fresh'; behindSeconds: number }
    | { state: 'stale'; staleSeconds: number | null }
    | { state: 'loading'; percent: number | null }
    | { state: 'not-loaded' }
  )

export interface ViewLocation {
  storeId: string
  database: string | null
  collection: string
}

export interface ViewSummary {
  id: string
  kind: ViewKind
  location: ViewLocation
  pipelineId: string
  status: ViewFreshness
  documents: number | null
  sizeBytes: number | null
  /** Epoch milliseconds of the last measured applied change, or null when not reported. */
  lastAppliedAt: number | null
}

/**
 * The view list, or a note that this server does not offer one yet. A server without the read
 * answers 404 or 405; that is an expected state of an older server, not an error.
 */
export interface UnresolvedOutput {
  pipelineId: string
  code: string
  params: Record<string, unknown>
}

export type ViewListResult =
  | { available: true; views: ViewSummary[]; unresolved?: UnresolvedOutput[] }
  | { available: false }

export class ViewClientError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ViewClientError'
    this.status = status
  }
}

export async function listViews(fetcher: ApiFetcher = fetch): Promise<ViewListResult> {
  let response: Response
  try {
    response = await fetcher('/api/views')
  } catch (error) {
    throw new ViewClientError(error instanceof Error ? error.message : 'network request failed')
  }
  if (response.status === 404 || response.status === 405) return { available: false }
  if (!response.ok) throw new ViewClientError('the view list request was refused', response.status)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ViewClientError('the server returned invalid JSON', response.status)
  }
  if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(isViewSummary))
    throw new ViewClientError('the view list response is malformed', response.status)
  if (
    payload.unresolved !== undefined &&
    (!Array.isArray(payload.unresolved) || !payload.unresolved.every(isUnresolvedOutput))
  )
    throw new ViewClientError('the output diagnostics response is malformed', response.status)
  return {
    available: true,
    views: payload.items,
    ...(payload.unresolved === undefined ? {} : { unresolved: payload.unresolved }),
  }
}

export function isUnresolvedOutput(value: unknown): value is UnresolvedOutput {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    typeof value.code === 'string' &&
    isRecord(value.params)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isFreshness(value: unknown): value is ViewFreshness {
  if (!isRecord(value)) return false
  for (const field of ['eventAgeSeconds', 'observationAgeSeconds']) {
    const number = value[field]
    if (
      number !== undefined &&
      number !== null &&
      (typeof number !== 'number' || !Number.isFinite(number) || number < 0)
    )
      return false
  }
  for (const field of ['observedAt', 'refreshedAt']) {
    const time = value[field]
    if (
      time !== undefined &&
      time !== null &&
      (typeof time !== 'string' || !Number.isFinite(Date.parse(time)))
    )
      return false
  }
  if (value.unit !== undefined && value.unit !== 's') return false
  if (value.aggregation !== undefined && value.aggregation !== 'max-input-table-event-age')
    return false
  switch (value.state) {
    case 'fresh':
      return typeof value.behindSeconds === 'number'
    case 'stale':
      return isNullableNumber(value.staleSeconds ?? null)
    case 'loading':
      return isNullableNumber(value.percent ?? null)
    case 'not-loaded':
      return true
    default:
      return false
  }
}

function isViewSummary(value: unknown): value is ViewSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.kind === 'view' || value.kind === 'replica') &&
    isRecord(value.location) &&
    typeof value.location.storeId === 'string' &&
    (value.location.database === null || typeof value.location.database === 'string') &&
    typeof value.location.collection === 'string' &&
    typeof value.pipelineId === 'string' &&
    isFreshness(value.status) &&
    isNullableNumber(value.documents) &&
    isNullableNumber(value.sizeBytes) &&
    isNullableNumber(value.lastAppliedAt)
  )
}
