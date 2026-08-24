import type { ApiFetcher } from './source-client'

export type PipelineDagNodeType = 'source' | 'transform' | 'view' | 'serve' | 'target'

export interface PipelineDagNode {
  id: string
  type: PipelineDagNodeType
  label: string
  detail: string | null
}

export interface PipelineDagEdge {
  id: string
  source: string
  target: string
  alias: string | null
}

export interface PipelineDag {
  nodes: PipelineDagNode[]
  edges: PipelineDagEdge[]
}

export interface PipelineView {
  id: string
  dag: PipelineDag
  contentHash: string
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
  ) {
    super(message)
    this.name = 'PipelineClientError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    (value.detail === null || typeof value.detail === 'string')
  )
}

function isDagEdge(value: unknown): value is PipelineDagEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    (value.alias === null || typeof value.alias === 'string')
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
    typeof value.contentHash === 'string'
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
    throw new PipelineClientError(
      'server',
      'Tapstate refused the Pipeline request.',
      response.status,
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
