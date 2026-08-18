export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type ApiFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface SourceTableView {
  type: string
  name: string | null
  pattern: string | null
  filter: string | null
  pk: string[] | null
  options: Record<string, JsonValue>
}

export interface SourceView {
  id: string
  metadata: Record<string, JsonValue> | null
  connector: string
  config: Record<string, JsonValue>
  configuredSecrets: string[]
  mode: string | null
  tables: SourceTableView[] | null
  options: Record<string, JsonValue>
  srs: Record<string, JsonValue> | null
  experimental: Record<string, JsonValue>
  contentHash: string
}

export interface SourceTableDraft {
  type: string
  name?: string | null
  pattern?: string | null
  filter?: string | null
  pk?: string[] | null
  options?: Record<string, JsonValue>
}

export interface SourceSrs {
  key?: string | null
  retention?: string | null
  schemaEvolution?: string | null
  queryable?: boolean | null
  enabled?: boolean | null
}

export interface SourceDraft {
  id: string
  connector: string
  config: Record<string, JsonValue>
  mode?: string
  metadata?: Record<string, JsonValue> | null
  tables?: SourceTableDraft[] | null
  options?: Record<string, JsonValue> | null
  srs?: SourceSrs | null
  experimental?: Record<string, JsonValue> | null
  clearSecrets?: string[]
}

export interface ConnectorSummary {
  id: string
  name: string
  group: string
  modes: string[]
  discovery: string
  sink: boolean
  pushOut: boolean
  origin: string
}

export interface ConnectorOption {
  value: string
  label: string
}

export interface ConnectorVisibility {
  controllingField: string
  equalsAnyOf: string[]
}

export type ConnectorFieldType = 'string' | 'number' | 'boolean' | 'array'

export interface ConnectorConfigField {
  name: string
  type: ConnectorFieldType
  label: string
  required: boolean
  defaultValue: string | null
  secret: boolean
  options: ConnectorOption[]
  visibleWhen: ConnectorVisibility | null
}

export interface ConnectorDetail extends ConnectorSummary {
  icon: string | null
  config: ConnectorConfigField[]
}

export type SourceClientErrorKind = 'network' | 'server' | 'protocol'

export class SourceClientError extends Error {
  readonly kind: SourceClientErrorKind
  readonly code: string | null
  readonly status: number | null
  readonly params: Record<string, unknown>

  constructor(
    kind: SourceClientErrorKind,
    message: string,
    code: string | null = null,
    status: number | null = null,
    params: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'SourceClientError'
    this.kind = kind
    this.code = code
    this.status = status
    this.params = params
  }
}

export interface SourceEnvelope {
  source: SourceView
  etag: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSourceView(value: unknown): value is SourceView {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.connector === 'string' &&
    isRecord(value.config) &&
    Array.isArray(value.configuredSecrets) &&
    typeof value.contentHash === 'string' &&
    isRecord(value.options) &&
    isRecord(value.experimental)
  )
}

function quotedHash(value: string | null): value is `"${string}"` {
  return value !== null && /^"[0-9a-f]{64}"$/.test(value)
}

async function requestJson(
  path: string,
  fetcher: ApiFetcher,
  init?: RequestInit,
): Promise<{ payload: unknown; response: Response }> {
  let response: Response

  try {
    response = await fetcher(`/api${path}`, init)
  } catch (error) {
    throw new SourceClientError(
      'network',
      error instanceof Error ? error.message : 'network request failed',
    )
  }

  let payload: unknown = null
  if (response.status !== 204) {
    try {
      payload = await response.json()
    } catch {
      if (response.ok)
        throw new SourceClientError(
          'protocol',
          'the server returned invalid JSON',
          null,
          response.status,
        )
    }
  }

  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params = isRecord(payload) && isRecord(payload.params) ? payload.params : {}
    throw new SourceClientError(
      'server',
      'the source request was refused',
      code,
      response.status,
      params,
    )
  }

  return { payload, response }
}

export async function listSources(fetcher: ApiFetcher = fetch): Promise<SourceView[]> {
  const { payload } = await requestJson('/sources', fetcher)
  if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(isSourceView))
    throw new SourceClientError('protocol', 'the source list response is malformed')
  return payload.items as SourceView[]
}

export async function listConnectors(fetcher: ApiFetcher = fetch): Promise<ConnectorSummary[]> {
  const { payload } = await requestJson('/connectors', fetcher)
  if (!isRecord(payload) || !Array.isArray(payload.connectors))
    throw new SourceClientError('protocol', 'the connector list response is malformed')
  return payload.connectors as ConnectorSummary[]
}

export async function getConnector(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<ConnectorDetail> {
  const { payload } = await requestJson(`/connectors/${encodeURIComponent(id)}`, fetcher)
  if (!isRecord(payload) || payload.id !== id || !Array.isArray(payload.config))
    throw new SourceClientError('protocol', 'the connector detail response is malformed')
  return payload as unknown as ConnectorDetail
}

export async function getSource(id: string, fetcher: ApiFetcher = fetch): Promise<SourceEnvelope> {
  const { payload, response } = await requestJson(`/sources/${encodeURIComponent(id)}`, fetcher)
  const etag = response.headers.get('ETag')
  if (!isSourceView(payload) || payload.id !== id || !quotedHash(etag))
    throw new SourceClientError('protocol', 'the source detail response is malformed')
  return { source: payload, etag }
}

function requireIfMatch(id: string, etag: string) {
  if (!quotedHash(etag))
    throw new SourceClientError(
      'protocol',
      'source mutations require a quoted content hash',
      'source.precondition-required',
      428,
      { id },
    )
}

function draftBody(draft: SourceDraft) {
  return {
    ...draft,
    options: draft.options ?? {},
    experimental: draft.experimental ?? {},
    clearSecrets: draft.clearSecrets ?? [],
  }
}

async function mutateSource(
  path: string,
  draft: SourceDraft,
  fetcher: ApiFetcher,
  init: RequestInit,
): Promise<SourceEnvelope> {
  const { payload, response } = await requestJson(path, fetcher, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: JSON.stringify(draftBody(draft)),
  })
  const etag = response.headers.get('ETag')
  if (!isSourceView(payload) || !quotedHash(etag))
    throw new SourceClientError('protocol', 'the source mutation response is malformed')
  return { source: payload, etag }
}

export async function createSource(
  draft: SourceDraft,
  fetcher: ApiFetcher = fetch,
): Promise<SourceEnvelope> {
  return mutateSource('/sources', draft, fetcher, { method: 'POST' })
}

export async function updateSource(
  id: string,
  draft: SourceDraft,
  etag: string,
  fetcher: ApiFetcher = fetch,
): Promise<SourceEnvelope> {
  requireIfMatch(id, etag)
  return mutateSource(`/sources/${encodeURIComponent(id)}`, draft, fetcher, {
    method: 'PUT',
    headers: { 'If-Match': etag },
  })
}

export async function deleteSource(
  id: string,
  etag: string,
  fetcher: ApiFetcher = fetch,
): Promise<void> {
  requireIfMatch(id, etag)
  await requestJson(`/sources/${encodeURIComponent(id)}`, fetcher, {
    method: 'DELETE',
    headers: { 'If-Match': etag },
  })
}
