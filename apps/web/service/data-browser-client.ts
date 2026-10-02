import type { ApiFetcher } from './source-client'

export interface ViewCollection {
  name: string
  kind?: string
  fields?: string[]
  description?: string
}

export interface ViewCollectionStats {
  numOfRows: number | null
  storageSize: number | null
  avgObjSize: number | null
}

export interface ViewPreview {
  rows: Array<Record<string, unknown>>
  approximateTotal: number | null
  moreAvailable: boolean
}

export class DataBrowserClientError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
  ) {
    super(message)
    this.name = 'DataBrowserClientError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function requestJson(path: string, fetcher: ApiFetcher, init?: RequestInit) {
  let response: Response
  try {
    response = await fetcher(`/api${path}`, init)
  } catch (error) {
    throw new DataBrowserClientError(
      null,
      error instanceof Error ? error.message : 'The data browser request failed.',
    )
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'The data browser request was refused.'
    throw new DataBrowserClientError(response.status, message)
  }
  return payload
}

function isViewCollection(value: unknown): value is ViewCollection {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    (value.kind === undefined || typeof value.kind === 'string') &&
    (value.fields === undefined ||
      (Array.isArray(value.fields) && value.fields.every((field) => typeof field === 'string'))) &&
    (value.description === undefined || typeof value.description === 'string')
  )
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

export async function listViewCollections(fetcher: ApiFetcher = fetch): Promise<ViewCollection[]> {
  const payload = await requestJson('/sources/views/collections', fetcher)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.collections) ||
    !payload.collections.every(isViewCollection)
  ) {
    throw new DataBrowserClientError(null, 'The collection list response is malformed.')
  }
  return payload.collections.filter((collection) => collection.kind === 'view')
}

export async function getViewCollectionStats(
  collection: string,
  fetcher: ApiFetcher = fetch,
): Promise<ViewCollectionStats> {
  const payload = await requestJson(
    `/sources/views/collections/${encodeURIComponent(collection)}/stats`,
    fetcher,
  )
  if (
    !isRecord(payload) ||
    !nullableNumber(payload.numOfRows) ||
    !nullableNumber(payload.storageSize) ||
    !nullableNumber(payload.avgObjSize)
  ) {
    throw new DataBrowserClientError(null, 'The collection stats response is malformed.')
  }
  return {
    numOfRows: payload.numOfRows,
    storageSize: payload.storageSize,
    avgObjSize: payload.avgObjSize,
  }
}

export async function previewViewCollection(
  collection: string,
  fetcher: ApiFetcher = fetch,
): Promise<ViewPreview> {
  const payload = await requestJson(
    `/sources/views/collections/${encodeURIComponent(collection)}:find`,
    fetcher,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 25 }),
    },
  )
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.rows) ||
    !payload.rows.every(isRecord) ||
    !nullableNumber(payload.approximateTotal) ||
    typeof payload.moreAvailable !== 'boolean'
  ) {
    throw new DataBrowserClientError(null, 'The collection preview response is malformed.')
  }
  return {
    rows: payload.rows,
    approximateTotal: payload.approximateTotal,
    moreAvailable: payload.moreAvailable,
  }
}
