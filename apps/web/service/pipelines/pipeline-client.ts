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
  artifact: PipelineJsonObject
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
  state: PipelineRuntimeState
  failure?: PipelineStatusFailure | null
}

export interface PipelineMetrics {
  pipelineId: string
  metrics: Record<string, number>
  perTableOffset?: Record<string, string>
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
    ['NEW', 'RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED', 'FAILED'].includes(
      value.state as string,
    ) &&
    (value.failure === undefined ||
      value.failure === null ||
      isPipelineStatusFailure(value.failure))
  )
}

function isNumberMap(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'number')
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function isPipelineMetrics(value: unknown): value is PipelineMetrics {
  return (
    isRecord(value) &&
    typeof value.pipelineId === 'string' &&
    isNumberMap(value.metrics) &&
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

export async function listPipelineDrafts(fetcher: ApiFetcher = fetch): Promise<PipelineDraft[]> {
  const payload = await request('/pipelines/drafts', fetcher)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isPipelineDraft)
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
): Promise<{ draft: PipelineDraft; etag: string }> {
  if (mutation.pipelineId !== id) {
    throw new PipelineClientError('protocol', 'Pipeline draft id does not match the route.', 400)
  }
  return requestDraftMutation(`/pipelines/${encodeURIComponent(id)}/draft`, mutation, fetcher, {
    method: 'POST',
  })
}

export async function updatePipelineDraft(
  id: string,
  mutation: PipelineDraftMutation,
  etag: string,
  fetcher: ApiFetcher = fetch,
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
): Promise<PipelineDraftPreview> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}/draft:preview`, fetcher, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revision }),
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

export async function stopPipeline(id: string, fetcher: ApiFetcher = fetch): Promise<unknown> {
  return request(`/pipelines/${encodeURIComponent(id)}:stop`, fetcher, { method: 'POST' })
}

export async function getPipeline(id: string, fetcher: ApiFetcher = fetch): Promise<PipelineView> {
  const payload = await request(`/pipelines/${encodeURIComponent(id)}`, fetcher)
  if (!isPipelineView(payload)) {
    throw new PipelineClientError('protocol', 'Tapstate returned an invalid Pipeline graph.')
  }
  return payload
}

export async function listPipelines(fetcher: ApiFetcher = fetch): Promise<PipelineView[]> {
  const payload = await request('/pipelines', fetcher)
  if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(isPipelineView)) {
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
