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

export interface SourceDraft {
  id: string
  connector: string
  config: Record<string, JsonValue>
  mode?: string
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
  readonly params: Record<string, string>

  constructor(
    kind: SourceClientErrorKind,
    message: string,
    code: string | null = null,
    status: number | null = null,
    params: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'SourceClientError'
    this.kind = kind
    this.code = code
    this.status = status
    this.params = params
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function requestJson(
  path: string,
  fetcher: ApiFetcher,
  init?: RequestInit,
): Promise<unknown> {
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

  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null
    const params =
      isRecord(payload) && isRecord(payload.params)
        ? Object.fromEntries(
            Object.entries(payload.params).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {}
    throw new SourceClientError(
      'server',
      'the source request was refused',
      code,
      response.status,
      params,
    )
  }

  return payload
}

export async function listSources(fetcher: ApiFetcher = fetch): Promise<SourceView[]> {
  const payload = await requestJson('/sources', fetcher)
  if (!isRecord(payload) || !Array.isArray(payload.items))
    throw new SourceClientError('protocol', 'the source list response is malformed')
  return payload.items as SourceView[]
}

export async function listConnectors(fetcher: ApiFetcher = fetch): Promise<ConnectorSummary[]> {
  const payload = await requestJson('/connectors', fetcher)
  if (!isRecord(payload) || !Array.isArray(payload.connectors))
    throw new SourceClientError('protocol', 'the connector list response is malformed')
  return payload.connectors as ConnectorSummary[]
}

export async function getConnector(
  id: string,
  fetcher: ApiFetcher = fetch,
): Promise<ConnectorDetail> {
  const payload = await requestJson(`/connectors/${encodeURIComponent(id)}`, fetcher)
  if (!isRecord(payload) || payload.id !== id || !Array.isArray(payload.config))
    throw new SourceClientError('protocol', 'the connector detail response is malformed')
  return payload as unknown as ConnectorDetail
}

export async function createSource(
  draft: SourceDraft,
  fetcher: ApiFetcher = fetch,
): Promise<SourceView> {
  const payload = await requestJson('/sources', fetcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...draft,
      options: {},
      experimental: {},
      clearSecrets: [],
    }),
  })
  if (!isRecord(payload) || payload.id !== draft.id || typeof payload.contentHash !== 'string')
    throw new SourceClientError('protocol', 'the source creation response is malformed')
  return payload as unknown as SourceView
}
