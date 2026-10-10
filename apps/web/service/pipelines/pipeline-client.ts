import type { ApiFetcher } from '../source-client'

export type PipelineDagNodeType = 'source' | 'transform' | 'view' | 'serve' | 'target'

export interface PipelineDagNode {
  id: string
  type: PipelineDagNodeType
  label: string
  detail: string | null
  /** Target table names represented by one multi-table target node. */
  tableRefs?: string[]
  description?: string | null
}

export interface PipelineDagEdge {
  id: string
  source: string
  target: string
  label: string | null
}

export interface PipelineDag {
  nodes: PipelineDagNode[]
  edges: PipelineDagEdge[]
}

export interface PipelineMetadata {
  labels: Record<string, string>
  description: string | null
}

export interface PipelineSourceSummary {
  id: string
  metadata: PipelineMetadata | null
  connector: string | null
  resolved?: boolean
}

export type PipelineJsonObject = Record<string, unknown>

/** The post-normalization transform step returned by PipelineView. */
export interface PipelineTransformStep extends PipelineJsonObject {
  id: string
  from: unknown
  type?: string
  use?: string
  options?: PipelineJsonObject | null
  experimental?: PipelineJsonObject | null
  expr?: string
  fields?: PipelineJsonObject
  engine?: string
  sql?: string
  script?: string
  primary_key?: string | null
  order?: string | null
  entries_in_memory?: number | null
  max_elements_per_document?: number | null
  root?: PipelineJsonObject | null
}

export interface PipelineViewBlock extends PipelineJsonObject {
  id?: string | null
  use?: string | null
  from?: unknown
}

export interface PipelineServeBlock extends PipelineJsonObject {
  id?: string | null
  use?: string | null
  from?: unknown
  sync?: PipelineJsonObject[] | null
  push?: PipelineJsonObject[] | null
}

export interface PipelineSettings extends PipelineJsonObject {
  errorPolicy?: string | null
  batchSize?: number | null
  parallelism?: number | null
  schedule?: string | null
  readMode?: string | null
  startFrom?: string | null
}

export interface PipelineView {
  id: string
  metadata?: PipelineMetadata | null
  sources?: PipelineSourceSummary[]
  transforms?: PipelineTransformStep[] | null
  view?: PipelineViewBlock | null
  serve?: PipelineServeBlock | null
  settings?: PipelineSettings | null
  experimental?: PipelineJsonObject | null
  dag: PipelineDag
  contentHash: string
  status?: PipelineStatus | null
}

/** Structured write payload; layout and DAG geometry intentionally stay out of this contract. */
export interface PipelineMutation {
  id: string
  metadata?: PipelineMetadata | null
  sources: string[]
  transforms: PipelineTransformStep[]
  view?: PipelineViewBlock | null
  serve?: PipelineServeBlock | null
  settings?: PipelineSettings | null
  experimental?: PipelineJsonObject | null
}

export type PipelineDraftMode = 'dag' | 'wizard'

export interface PipelineDraftNode {
  id: string
  type: string
  sourceId?: string | null
  table?: string | null
  config: PipelineJsonObject
  metadata: PipelineJsonObject
}

export interface PipelineDraftGraph {
  nodes: readonly PipelineDraftNode[]
  edges: readonly { id: string; source: string; target: string }[]
  viewport: { x: number; y: number; zoom: number }
}

export interface PipelineDraft {
  pipelineId: string
  schemaVersion: number
  revision: number
  mode: PipelineDraftMode
  name: string | null
  description: string | null
  graph: PipelineDraftGraph | null
  wizard: PipelineJsonObject | null
  baseArtifactHash: string | null
  publishedDraftRevision: number | null
  publishedArtifactHash: string | null
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export type PipelineDraftSummary = Omit<PipelineDraft, 'schemaVersion' | 'graph' | 'wizard'>

export interface PipelineDraftMutation {
  pipelineId: string
  mode: PipelineDraftMode
  name?: string | null
  description?: string | null
  graph?: PipelineDraftGraph | null
  wizard?: PipelineJsonObject | null
  baseArtifactHash?: string | null
}

export interface PipelineDraftPreview {
  pipelineId: string
  revision: number
  dsl?: string
  artifact: PipelineJsonObject
}

export interface PipelinePreviewRequest {
  pipelineId: string
  drafts: { source?: string; content: string; expectedContentHash?: string }[]
  outputId?: string
  rootLimit?: number
  sampleId?: string
  signal?: AbortSignal
}

export interface PipelinePreviewEvent {
  runId: string
  candidateHash: string
  seq: number
  kind: string
  at: string
  payload: Record<string, unknown>
}

export interface PipelinePreviewRun {
  runId: string
  candidateHash: string
  format: 'logical-json' | 'mongo-extended-json' | null
  executionSpec: Record<string, unknown>
  contexts: Record<string, unknown>[]
  sample: Record<string, unknown> | null
  documents: Record<string, unknown>[]
  trace: Record<string, unknown>[]
  sampleId: string | null
  rowCount: number
  failure: { code: string; reason: string } | null
}

export interface PipelineDraftPublishResult {
  pipelineId: string
  revision: number
  artifactHash: string
  published: true
}

export type PipelineRuntimeState = 'NEW' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'FAILED'

export interface PipelineStatusFailure {
  code: string
  params: Record<string, unknown>
  message?: string
}

export interface PipelineStatus {
  pipelineId: string
  state: PipelineCatalogState
  failure?: PipelineStatusFailure | null
  observedAt?: string | null
  observedAgeMillis?: number | null
  desiredState?: PipelineRuntimeState | null
  observedState?: PipelineRuntimeState | null
  hasArtifact?: boolean
}

export type PipelineCatalogState =
  | PipelineRuntimeState
  | 'DRAFT'
  | 'STARTING'
  | 'PAUSING'
  | 'RESUMING'
  | 'STOPPING'
  | 'UNAVAILABLE'

export interface PipelineCatalogStatus {
  state: PipelineCatalogState
  desiredState?: PipelineRuntimeState | null
  observedState?: PipelineRuntimeState | null
  failure?: PipelineStatusFailure | null
  observedAt?: string | null
}

/** Unified list projection across saved editor documents, applied artifacts, and runtime state. */
export interface PipelineCatalogItem {
  id: string
  name: string
  description?: string | null
  mode?: PipelineDraftMode | null
  revision?: number | null
  updatedAt?: string | null
  contentHash?: string | null
  hasArtifact: boolean
  status: PipelineCatalogStatus
}

export interface PipelineMetrics {
  pipelineId: string
  metrics: Record<string, number>
  targetAckedPosition?: Record<string, string>
  positionsNotCollected?: string[]
  facts?: PipelineMetricFact[]
  /** Retained for older servers during the transition to targetAckedPosition. */
  perTableOffset?: Record<string, string>
}

export interface PipelineMetricFactPoint {
  attributes: Record<string, string>
  observedAt: string
  value?: number
  startTime?: string
  count?: number
  sum?: number
  bounds?: number[]
  bucketCounts?: number[]
}

export interface PipelineMetricFact {
  name: string
  type: 'counter' | 'gauge' | 'histogram'
  unit: string
  points: PipelineMetricFactPoint[]
}

export interface PipelineLogLine {
  timestampMillis: number
  level: string
  message: string
}

export interface PipelineLogs {
  pipelineId: string
  lines: PipelineLogLine[]
}

export interface PipelineLayoutPosition {
  x: number
  y: number
}

export interface PipelineLayoutViewport {
  x: number
  y: number
  zoom: number
}

export interface PipelineLayout {
  pipelineId: string
  nodes: Record<string, PipelineLayoutPosition>
  viewport: PipelineLayoutViewport | null
}

export class PipelineClientError extends Error {
  constructor(
    readonly kind: 'network' | 'server' | 'protocol',
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
    readonly params: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'PipelineClientError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function responseMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }
  return fallback
}

function isPosition(value: unknown): value is PipelineLayoutPosition {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number'
}

function isViewport(value: unknown): value is PipelineLayoutViewport {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.zoom === 'number'
  )
}

function isDagNode(value: unknown): value is PipelineDagNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    ['source', 'transform', 'view', 'serve', 'target'].includes(value.type as string) &&
    typeof value.label === 'string' &&
    (value.detail === null || typeof value.detail === 'string') &&
    (value.tableRefs === undefined ||
      (Array.isArray(value.tableRefs) &&
        value.tableRefs.every((item) => typeof item === 'string'))) &&
    (value.description === undefined ||
      value.description === null ||
      typeof value.description === 'string')
  )
}

function isDagEdge(value: unknown): value is PipelineDagEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    (value.label === null || typeof value.label === 'string')
  )
}

function isMetadata(value: unknown): value is PipelineMetadata {
  return (
    isRecord(value) &&
    isRecord(value.labels) &&
    Object.values(value.labels).every((item) => typeof item === 'string') &&
    (value.description === null || typeof value.description === 'string')
  )
}

function isSourceSummary(value: unknown): value is PipelineSourceSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.metadata === null || isMetadata(value.metadata)) &&
    (typeof value.connector === 'string' ||
      (value.connector === null && value.resolved === false)) &&
    (value.resolved === undefined || typeof value.resolved === 'boolean')
  )
}

function isJsonObject(value: unknown): value is PipelineJsonObject {
  return isRecord(value)
}

function isDraftViewport(value: unknown): value is PipelineDraftGraph['viewport'] {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.zoom === 'number' &&
    value.zoom > 0
  )
}

function isDraftNode(value: unknown): value is PipelineDraftNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    (value.sourceId === undefined ||
      value.sourceId === null ||
      typeof value.sourceId === 'string') &&
    (value.table === undefined || value.table === null || typeof value.table === 'string') &&
    isJsonObject(value.config) &&
    isJsonObject(value.metadata)
  )
}

function isDraftGraph(value: unknown): value is PipelineDraftGraph {
  return (
    isRecord(value) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isDraftNode) &&
    Array.isArray(value.edges) &&
    value.edges.every(
      (edge) =>
        isRecord(edge) &&
        typeof edge.id === 'string' &&
        typeof edge.source === 'string' &&
        typeof edge.target === 'string',
    ) &&
    isDraftViewport(value.viewport)
  )
}

function isPipelineDraft(value: unknown): value is PipelineDraft {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    typeof value.revision === 'number' &&
    Number.isInteger(value.revision) &&
    value.revision > 0 &&
    (value.mode === 'dag' || value.mode === 'wizard') &&
    (value.name === null || typeof value.name === 'string') &&
    (value.description === null || typeof value.description === 'string') &&
    (value.graph === null || isDraftGraph(value.graph)) &&
    (value.wizard === null || isJsonObject(value.wizard)) &&
    (value.baseArtifactHash === null || typeof value.baseArtifactHash === 'string') &&
    (value.publishedDraftRevision === null ||
      (typeof value.publishedDraftRevision === 'number' &&
        Number.isInteger(value.publishedDraftRevision))) &&
    (value.publishedArtifactHash === null || typeof value.publishedArtifactHash === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.updatedBy === 'string'
  )
}

function isPipelineDraftSummary(value: unknown): value is PipelineDraftSummary {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    typeof value.revision === 'number' &&
    Number.isInteger(value.revision) &&
    value.revision > 0 &&
    (value.mode === 'dag' || value.mode === 'wizard') &&
    (value.name === null || typeof value.name === 'string') &&
    (value.description === null || typeof value.description === 'string') &&
    (value.baseArtifactHash === null || typeof value.baseArtifactHash === 'string') &&
    (value.publishedDraftRevision === null || Number.isInteger(value.publishedDraftRevision)) &&
    (value.publishedArtifactHash === null || typeof value.publishedArtifactHash === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.updatedBy === 'string'
  )
}

function isTransformStep(value: unknown): value is PipelineTransformStep {
  return isRecord(value) && typeof value.id === 'string' && 'from' in value
}

function isPipelineStatusFailure(value: unknown): value is PipelineStatusFailure {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    isRecord(value.params) &&
    (value.message === undefined || typeof value.message === 'string')
  )
}

function isPipelineStatus(value: unknown): value is PipelineStatus {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    ['DRAFT', 'NEW', 'STARTING', 'RUNNING', 'PAUSING', 'PAUSED', 'RESUMING', 'STOPPING', 'STOPPED', 'COMPLETED', 'FAILED', 'UNAVAILABLE'].includes(
      value.state as string,
    ) &&
    (value.failure === undefined ||
      value.failure === null ||
      isPipelineStatusFailure(value.failure))
  )
}

function isPipelineCatalogStatus(value: unknown): value is PipelineCatalogStatus {
  const runtimeStates = ['NEW', 'RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED', 'FAILED']
  return (
    isRecord(value) &&
    [...runtimeStates, 'DRAFT', 'STARTING', 'PAUSING', 'RESUMING', 'STOPPING', 'UNAVAILABLE'].includes(
      value.state as string,
    ) &&
    (value.desiredState === undefined ||
      value.desiredState === null ||
      runtimeStates.includes(value.desiredState as string)) &&
    (value.observedState === undefined ||
      value.observedState === null ||
      runtimeStates.includes(value.observedState as string)) &&
    (value.failure === undefined ||
      value.failure === null ||
      isPipelineStatusFailure(value.failure)) &&
    (value.observedAt === undefined ||
      value.observedAt === null ||
      typeof value.observedAt === 'string')
  )
}

function isPipelineCatalogItem(value: unknown): value is PipelineCatalogItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === undefined ||
      value.description === null ||
      typeof value.description === 'string') &&
    (value.mode === undefined ||
      value.mode === null ||
      value.mode === 'dag' ||
      value.mode === 'wizard') &&
    (value.revision === undefined ||
      value.revision === null ||
      (typeof value.revision === 'number' && Number.isInteger(value.revision))) &&
    (value.updatedAt === undefined ||
      value.updatedAt === null ||
      typeof value.updatedAt === 'string') &&
    (value.contentHash === undefined ||
      value.contentHash === null ||
      typeof value.contentHash === 'string') &&
    typeof value.hasArtifact === 'boolean' &&
    isPipelineCatalogStatus(value.status)
  )
}

function isNumberMap(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'number')
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function isMetricFactPoint(value: unknown): value is PipelineMetricFactPoint {
  return (
    isRecord(value) &&
    isStringMap(value.attributes) &&
    typeof value.observedAt === 'string' &&
    (value.value === undefined || typeof value.value === 'number') &&
    (value.startTime === undefined || typeof value.startTime === 'string') &&
    (value.count === undefined || typeof value.count === 'number') &&
    (value.sum === undefined || typeof value.sum === 'number') &&
    (value.bounds === undefined ||
      (Array.isArray(value.bounds) && value.bounds.every((n) => typeof n === 'number'))) &&
    (value.bucketCounts === undefined ||
      (Array.isArray(value.bucketCounts) && value.bucketCounts.every((n) => typeof n === 'number')))
  )
}

function isPipelineMetricFact(value: unknown): value is PipelineMetricFact {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    ['counter', 'gauge', 'histogram'].includes(value.type as string) &&
    typeof value.unit === 'string' &&
    Array.isArray(value.points) &&
    value.points.every(isMetricFactPoint)
  )
}

function isPipelineMetrics(value: unknown): value is PipelineMetrics {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    isNumberMap(value.metrics) &&
    (value.targetAckedPosition === undefined || isStringMap(value.targetAckedPosition)) &&
    (value.positionsNotCollected === undefined || isStringArray(value.positionsNotCollected)) &&
    (value.facts === undefined ||
      (Array.isArray(value.facts) && value.facts.every(isPipelineMetricFact))) &&
    (value.perTableOffset === undefined || isStringMap(value.perTableOffset))
  )
}

function isPipelineLogLine(value: unknown): value is PipelineLogLine {
  return (
    isRecord(value) &&
    typeof value.timestampMillis === 'number' &&
    typeof value.level === 'string' &&
    typeof value.message === 'string'
  )
}

function isPipelineLogs(value: unknown): value is PipelineLogs {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    Array.isArray(value.lines) &&
    value.lines.every(isPipelineLogLine)
  )
}

function isPipelineView(value: unknown): value is PipelineView {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isRecord(value.dag) &&
    Array.isArray(value.dag.nodes) &&
    value.dag.nodes.every(isDagNode) &&
    Array.isArray(value.dag.edges) &&
    value.dag.edges.every(isDagEdge) &&
    typeof value.contentHash === 'string' &&
    (value.metadata === undefined || value.metadata === null || isMetadata(value.metadata)) &&
    (value.sources === undefined ||
      (Array.isArray(value.sources) && value.sources.every(isSourceSummary))) &&
    (value.transforms === undefined ||
      value.transforms === null ||
      (Array.isArray(value.transforms) && value.transforms.every(isTransformStep))) &&
    (value.view === undefined || value.view === null || isJsonObject(value.view)) &&
    (value.serve === undefined || value.serve === null || isJsonObject(value.serve)) &&
    (value.settings === undefined || value.settings === null || isJsonObject(value.settings)) &&
    (value.experimental === undefined ||
      value.experimental === null ||
      isJsonObject(value.experimental)) &&
    (value.status === undefined || value.status === null || isPipelineStatus(value.status))
  )
}

function isPipelineLayout(value: unknown): value is PipelineLayout {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    isRecord(value.nodes) &&
    Object.values(value.nodes).every(isPosition) &&
    (value.viewport === null || isViewport(value.viewport))
  )
}

async function request(path: string, fetcher: ApiFetcher, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(`/api${path}`, init)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'The request did not reach Tapstate.',
    )
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline request.'),
      response.status,
      code,
      params,
    )
  }
  if (payload === null)
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned no JSON response.',
      response.status,
    )
  return payload
}

function quotedHash(value: string | null): value is `"${string}"` {
  return value !== null && /^"[0-9a-f]{64}"$/.test(value)
}

function quotedRevision(value: string | null): value is `"${string}"` {
  return value !== null && /^"[1-9][0-9]*"$/.test(value)
}

async function requestMutation(
  path: string,
  body: PipelineMutation,
  fetcher: ApiFetcher,
  init: RequestInit,
): Promise<{ pipeline: PipelineView; etag: string }> {
  let response: Response
  try {
    response = await fetcher(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'Pipeline request failed.',
    )
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline mutation.'),
      response.status,
      code,
      params,
    )
  }
  const etag = response.headers.get('ETag')
  if (!isPipelineView(payload) || !quotedHash(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline mutation response.',
      response.status,
    )
  }
  return { pipeline: payload, etag }
}

export async function updatePipeline(
  id: string,
  mutation: PipelineMutation,
  etag: string,
  fetcher: ApiFetcher = fetch,
): Promise<{ pipeline: PipelineView; etag: string }> {
  if (!quotedHash(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Pipeline mutations require a quoted content hash.',
      428,
      'pipeline.precondition-required',
      { id },
    )
  }
  if (mutation.id !== id) {
    throw new PipelineClientError(
      'protocol',
      'Pipeline mutation id does not match the route.',
      400,
      'pipeline.id-mismatch',
      { id, bodyId: mutation.id },
    )
  }
  return requestMutation(`/pipelines/${encodeURIComponent(id)}`, mutation, fetcher, {
    method: 'PUT',
    headers: { 'If-Match': etag },
  })
}

export async function createPipeline(
  mutation: PipelineMutation,
  fetcher: ApiFetcher = fetch,
): Promise<{ pipeline: PipelineView; etag: string }> {
  return requestMutation('/pipelines', mutation, fetcher, { method: 'POST' })
}

async function requestDraftMutation(
  path: string,
  body: PipelineDraftMutation,
  fetcher: ApiFetcher,
  init: RequestInit,
): Promise<{ draft: PipelineDraft; etag: string }> {
  let response: Response
  try {
    response = await fetcher(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'Pipeline draft request failed.',
    )
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline draft mutation.'),
      response.status,
      code,
      params,
    )
  }
  const etag = response.headers.get('ETag')
  if (!isPipelineDraft(payload) || !quotedRevision(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline draft mutation response.',
      response.status,
    )
  }
  return { draft: payload, etag }
}

export async function listPipelineDrafts(
  fetcher: ApiFetcher = fetch,
): Promise<PipelineDraftSummary[]> {
  const payload = await request('/pipeline-drafts', fetcher)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isPipelineDraftSummary)
  ) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline draft list.')
  }
  return payload.items
}

export async function getPipelineDraft(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<{ draft: PipelineDraft; etag: string }> {
  let response: Response
  try {
    response = await fetcher(`/api/pipelines/${encodeURIComponent(id)}/draft`)
  } catch (error) {
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'Pipeline draft request failed.',
    )
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline draft request.'),
      response.status,
      code,
      params,
    )
  }
  const etag = response.headers.get('ETag')
  if (!isPipelineDraft(payload) || !quotedRevision(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline draft.',
      response.status,
    )
  }
  return { draft: payload, etag }
}

export async function createPipelineDraft(
  id: string,
  mutation: PipelineDraftMutation,
  fetcher: ApiFetcher = fetch,
  options: { keepalive?: boolean } = {},
): Promise<{ draft: PipelineDraft; etag: string }> {
  if (mutation.pipelineId !== id) {
    throw new PipelineClientError('protocol', 'Pipeline draft id does not match the route.', 400)
  }
  return requestDraftMutation(`/pipelines/${encodeURIComponent(id)}/draft`, mutation, fetcher, {
    method: 'POST',
    keepalive: options.keepalive,
  })
}

export async function updatePipelineDraft(
  id: string,
  mutation: PipelineDraftMutation,
  etag: string,
  fetcher: ApiFetcher = fetch,
  options: { keepalive?: boolean } = {},
): Promise<{ draft: PipelineDraft; etag: string }> {
  if (!quotedRevision(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Pipeline draft mutations require a quoted revision ETag.',
      428,
      'pipeline-draft.precondition-required',
      { id },
    )
  }
  if (mutation.pipelineId !== id) {
    throw new PipelineClientError('protocol', 'Pipeline draft id does not match the route.', 400)
  }
  return requestDraftMutation(`/pipelines/${encodeURIComponent(id)}/draft`, mutation, fetcher, {
    method: 'PUT',
    headers: { 'If-Match': etag },
    keepalive: options.keepalive,
  })
}

export async function deletePipelineDraft(
  id: string,
  etag: string,
  fetcher: ApiFetcher = fetch,
): Promise<void> {
  if (!quotedRevision(etag)) {
    throw new PipelineClientError(
      'protocol',
      'Pipeline draft deletion requires a quoted revision ETag.',
      428,
      'pipeline-draft.precondition-required',
      { id },
    )
  }
  const response = await fetcher(`/api/pipelines/${encodeURIComponent(id)}/draft`, {
    method: 'DELETE',
    headers: { 'If-Match': etag },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline draft deletion.'),
      response.status,
      code,
      params,
    )
  }
  if (response.status !== 204) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline draft deletion response.',
      response.status,
    )
  }
}

export async function previewPipelineDraft(
  id: string,
  revision: number,
  fetcher: ApiFetcher = fetch,
  signal?: AbortSignal,
  candidate?: PipelineDraftMutation,
): Promise<PipelineDraftPreview> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/draft:preview`, fetcher, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revision, ...(candidate ? { candidate } : {}) }),
    signal,
  })
  if (
    !isRecord(payload) ||
    payload.pipelineId !== id ||
    payload.revision !== revision ||
    !isJsonObject(payload.artifact)
  ) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline draft preview.',
    )
  }
  return payload as unknown as PipelineDraftPreview
}

/** Opens the bounded runtime preview and validates its ordered NDJSON event stream. */
export async function streamPipelinePreview(
  request: PipelinePreviewRequest,
  fetcher: ApiFetcher = fetch,
  onEvent?: (event: PipelinePreviewEvent) => void,
): Promise<PipelinePreviewRun> {
  let response: Response
  try {
    response = await fetcher('/api/artifacts:preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
      body: JSON.stringify({
        pipelineId: request.pipelineId,
        drafts: request.drafts,
        ...(request.outputId ? { outputId: request.outputId } : {}),
        ...(request.rootLimit ? { rootLimit: request.rootLimit } : {}),
        ...(request.sampleId ? { sampleId: request.sampleId } : {}),
      }),
      signal: request.signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'The preview request did not reach Tapstate.',
    )
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new PipelineClientError(
      'server',
      responseMessage(payload, 'Tapstate refused the Pipeline preview.'),
      response.status,
      code,
      params,
    )
  }
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/x-ndjson')) {
    throw new PipelineClientError('protocol', 'Tapstate returned a non-NDJSON Pipeline preview.')
  }
  if (!response.body) {
    throw new PipelineClientError('protocol', 'Tapstate returned an empty Pipeline preview stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let receivedBytes = 0
  let expectedSequence = 0
  let runId: string | null = null
  let candidateHash: string | null = null
  let executionSpec: Record<string, unknown> | null = null
  let contexts: Record<string, unknown>[] = []
  let sample: Record<string, unknown> | null = null
  let documents: Record<string, unknown>[] = []
  let format: PipelinePreviewRun['format'] = null
  let trace: Record<string, unknown>[] = []
  let sampleId: string | null = null
  let rowCount = 0
  let failure: PipelinePreviewRun['failure'] = null
  let terminal = false
  let accepted = false
  let compileCompleted = false
  let sampleCompleted = false
  let resultCompleted = false

  const consumeLine = (line: string) => {
    if (!line.trim()) return
    if (line.length > 10 * 1024 * 1024) {
      throw new PipelineClientError('protocol', 'A Pipeline preview event exceeded its size limit.')
    }
    let raw: unknown
    try {
      raw = JSON.parse(line)
    } catch {
      throw new PipelineClientError(
        'protocol',
        'Tapstate returned malformed Pipeline preview JSON.',
      )
    }
    if (
      !isRecord(raw) ||
      typeof raw.runId !== 'string' ||
      typeof raw.candidateHash !== 'string' ||
      !Number.isInteger(raw.seq) ||
      typeof raw.kind !== 'string' ||
      typeof raw.at !== 'string' ||
      !isRecord(raw.payload)
    ) {
      throw new PipelineClientError(
        'protocol',
        'Tapstate returned an invalid Pipeline preview event.',
      )
    }
    if (terminal) {
      throw new PipelineClientError(
        'protocol',
        'Tapstate sent an event after the Pipeline preview ended.',
      )
    }
    if (raw.seq !== expectedSequence++) {
      throw new PipelineClientError(
        'protocol',
        'Tapstate returned an out-of-order Pipeline preview event.',
      )
    }
    if (runId === null) {
      runId = raw.runId
      candidateHash = raw.candidateHash
    } else if (raw.runId !== runId || raw.candidateHash !== candidateHash) {
      throw new PipelineClientError(
        'protocol',
        'Tapstate changed the Pipeline preview identity mid-stream.',
      )
    }
    const event = raw as unknown as PipelinePreviewEvent
    onEvent?.(event)
    const payload = event.payload
    switch (event.kind) {
      case 'run.accepted':
        if (event.seq !== 0 || accepted || typeof payload.pipelineId !== 'string') {
          throw new PipelineClientError(
            'protocol',
            'Tapstate returned an invalid preview acceptance event.',
          )
        }
        accepted = true
        break
      case 'compile.completed':
        if (
          !accepted ||
          compileCompleted ||
          !isRecord(payload.executionSpec) ||
          !Array.isArray(payload.contexts) ||
          !payload.contexts.every(
            (context) =>
              isRecord(context) &&
              typeof context.id === 'string' &&
              typeof context.kind === 'string' &&
              Array.isArray(context.pointerPatterns) &&
              context.pointerPatterns.every((pointer) => typeof pointer === 'string'),
          )
        ) {
          throw new PipelineClientError(
            'protocol',
            'The preview compiler returned an invalid execution spec.',
          )
        }
        compileCompleted = true
        executionSpec = payload.executionSpec
        contexts = payload.contexts
        break
      case 'sample.completed':
        if (
          !compileCompleted ||
          sampleCompleted ||
          payload.complete !== true ||
          !isStringArray(payload.rootSourceKeys) ||
          typeof payload.rootRows !== 'number' ||
          typeof payload.inputRows !== 'number' ||
          typeof payload.inputBytes !== 'number' ||
          typeof payload.rootTruncated !== 'boolean' ||
          typeof payload.repeatable !== 'boolean'
        ) {
          throw new PipelineClientError(
            'protocol',
            'Tapstate returned invalid preview sample facts.',
          )
        }
        sampleCompleted = true
        sample = payload
        sampleId = typeof payload.sampleId === 'string' ? payload.sampleId : null
        break
      case 'step.completed':
        if (
          !sampleCompleted ||
          resultCompleted ||
          typeof payload.nodeId !== 'string' ||
          typeof payload.inputRows !== 'number' ||
          typeof payload.outputRows !== 'number' ||
          !Array.isArray(payload.samples) ||
          !payload.samples.every(isRecord) ||
          !isStringArray(payload.pointerPatterns) ||
          typeof payload.pointerPatternsComplete !== 'boolean' ||
          payload.countComplete !== true ||
          typeof payload.truncated !== 'boolean'
        ) {
          throw new PipelineClientError(
            'protocol',
            'Tapstate returned invalid preview trace facts.',
          )
        }
        trace.push(payload, ...payload.samples)
        {
          const nodeId = payload.nodeId
          const pointers = payload.pointerPatterns
          const rootSourceKeys =
            isRecord(sample) && isStringArray(sample.rootSourceKeys) ? sample.rootSourceKeys : []
          if (rootSourceKeys.includes(nodeId)) {
            const rootContext = contexts.find((context) => context.id === 'root')
            if (rootContext) {
              const existing = isStringArray(rootContext.pointerPatterns)
                ? rootContext.pointerPatterns
                : []
              rootContext.pointerPatterns = [...new Set([...existing, ...pointers])]
              rootContext.pointerPatternsComplete =
                rootContext.pointerPatternsComplete !== false && payload.pointerPatternsComplete
            }
          }
          const inputPointers = isRecord(payload.inputPointerPatternsByAlias)
            ? payload.inputPointerPatternsByAlias
            : {}
          const relationContexts = contexts.filter(
            (context) =>
              context.kind === 'relation' && context.stepId === nodeId && context.shape === 'flat',
          )
          for (const relationContext of relationContexts) {
            const alias = relationContext.sourceAlias
            const sourcePatterns =
              typeof alias === 'string' && isStringArray(inputPointers[alias])
                ? inputPointers[alias]
                : []
            const parent =
              typeof relationContext.parentPointerPattern === 'string'
                ? relationContext.parentPointerPattern
                : ''
            const parentShape = contexts.find(
              (context) =>
                context.kind === 'relation' && context.path === relationContext.parentPath,
            )?.shape
            const prefix = `${parent}${parentShape === 'array' ? '/*' : ''}`
            const existing = isStringArray(relationContext.pointerPatterns)
              ? relationContext.pointerPatterns
              : []
            relationContext.pointerPatterns = [
              ...new Set([...existing, ...sourcePatterns.map((pointer) => `${prefix}${pointer}`)]),
            ]
            relationContext.pointerPatternsComplete = payload.pointerPatternsComplete
          }
          const transformContext = contexts.find((context) => context.id === `transform:${nodeId}`)
          if (transformContext?.type === 'js') {
            transformContext.pointerPatterns = pointers
            transformContext.pointerPatternsComplete = payload.pointerPatternsComplete
            transformContext.effects = pointers.map((pointer) => ({
              pointer,
              kind: 'unknown',
              origin: 'unknown',
              lastChangedBy: nodeId,
            }))
          }
        }
        break
      case 'result.completed': {
        const resultFormat = payload.format
        if (
          !sampleCompleted ||
          resultCompleted ||
          (resultFormat !== 'logical-json' && resultFormat !== 'mongo-extended-json') ||
          payload.complete !== true ||
          payload.truncated !== false ||
          !Array.isArray(payload.documents) ||
          !payload.documents.every(isRecord) ||
          !Number.isInteger(payload.rowCount) ||
          payload.rowCount !== payload.documents.length
        ) {
          throw new PipelineClientError('protocol', 'Tapstate returned invalid preview documents.')
        }
        resultCompleted = true
        format = resultFormat
        documents = payload.documents
        rowCount = payload.rowCount
        break
      }
      case 'run.completed':
        if (
          !resultCompleted ||
          !Number.isInteger(payload.rowCount) ||
          payload.rowCount !== rowCount
        ) {
          throw new PipelineClientError(
            'protocol',
            'Tapstate completed a preview without a complete result.',
          )
        }
        terminal = true
        break
      case 'run.failed':
        if (resultCompleted) {
          throw new PipelineClientError(
            'protocol',
            'Tapstate failed a preview after returning a result.',
          )
        }
        terminal = true
        failure = {
          code: typeof payload.code === 'string' ? payload.code : 'unknown',
          reason:
            typeof payload.reason === 'string'
              ? payload.reason
              : 'The preview could not be completed.',
        }
        break
      default:
        throw new PipelineClientError(
          'protocol',
          'Tapstate returned an unknown Pipeline preview event.',
        )
    }
  }

  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) {
        buffer += decoder.decode()
        if (buffer.trim()) consumeLine(buffer)
        break
      }
      receivedBytes += chunk.value.byteLength
      if (receivedBytes > 40 * 1024 * 1024) {
        throw new PipelineClientError(
          'protocol',
          'The Pipeline preview stream exceeded its size limit.',
        )
      }
      buffer += decoder.decode(chunk.value, { stream: true })
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        consumeLine(buffer.slice(0, newline).replace(/\r$/, ''))
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
      }
      if (buffer.length > 10 * 1024 * 1024) {
        throw new PipelineClientError(
          'protocol',
          'A Pipeline preview event exceeded its size limit.',
        )
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    if (error instanceof PipelineClientError) throw error
    throw new PipelineClientError(
      'network',
      error instanceof Error ? error.message : 'The Pipeline preview stream ended unexpectedly.',
    )
  } finally {
    reader.releaseLock()
  }

  if (
    !terminal ||
    !runId ||
    !candidateHash ||
    !executionSpec ||
    !accepted ||
    !compileCompleted ||
    (!failure && (!sampleCompleted || !resultCompleted))
  ) {
    throw new PipelineClientError(
      'protocol',
      'The Pipeline preview ended without a valid terminal result.',
    )
  }
  return {
    runId,
    candidateHash,
    format,
    executionSpec,
    contexts,
    sample,
    documents,
    trace,
    sampleId,
    rowCount,
    failure,
  }
}

export async function publishPipelineDraft(
  id: string,
  revision: number,
  artifactHash?: string | null,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineDraftPublishResult> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/draft:publish`, fetcher, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revision, ...(artifactHash ? { artifactHash } : {}) }),
  })
  if (
    !isRecord(payload) ||
    payload.pipelineId !== id ||
    payload.revision !== revision ||
    typeof payload.artifactHash !== 'string' ||
    payload.published !== true
  ) {
    throw new PipelineClientError(
      'protocol',
      'Tapstate returned an invalid Pipeline draft publish.',
    )
  }
  return payload as unknown as PipelineDraftPublishResult
}

export async function runPipeline(id: string, fetcher: ApiFetcher = fetch): Promise<unknown> {
  return request(`/pipelines/${encodeURIComponent(id)}:start`, fetcher, { method: 'POST' })
}

export async function stopPipeline(
  id: string,
  purgeState: boolean,
  fetcher: ApiFetcher = fetch,
): Promise<unknown> {
  return request(`/pipelines/${encodeURIComponent(id)}:stop`, fetcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purgeState }),
  })
}

export async function getPipeline(id: string, fetcher: ApiFetcher = fetch): Promise<PipelineView> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}`, fetcher)
  if (!isPipelineView(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline graph.')
  }
  return payload
}

export async function listPipelines(fetcher: ApiFetcher = fetch): Promise<PipelineCatalogItem[]> {
  const payload = await request('/pipelines', fetcher)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isPipelineCatalogItem)
  ) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline list.')
  }
  return payload.items
}

export async function getPipelineStatus(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineStatus> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/status`, fetcher)
  if (!isPipelineStatus(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline status.')
  }
  return payload
}

export async function getPipelineMetrics(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineMetrics> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/metrics`, fetcher)
  if (!isPipelineMetrics(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned invalid Pipeline metrics.')
  }
  return payload
}

export async function getPipelineLogs(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineLogs> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/logs?limit=30`, fetcher)
  if (!isPipelineLogs(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned invalid Pipeline logs.')
  }
  return payload
}

export async function getPipelineLayout(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineLayout> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/layout`, fetcher)
  if (!isPipelineLayout(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline layout.')
  }
  return payload
}

export async function savePipelineLayout(
  id: string,
  layout: Pick<PipelineLayout, 'nodes' | 'viewport'>,
  fetcher: ApiFetcher = fetch,
): Promise<PipelineLayout> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/layout`, fetcher, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(layout),
  })
  if (!isPipelineLayout(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate did not confirm the saved Pipeline layout.')
  }
  return payload
}
