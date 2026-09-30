import {
  createSource,
  deleteSource,
  getSource,
  SourceClientError,
  type ApiFetcher,
  type JsonValue,
  type SourceView,
} from './source-client'

/**
 * The sample bank sources a deployment offers, read from a settings file served next to the web
 * app. A deployment that offers none serves no file, and the sample option stays hidden.
 *
 * The file carries a read-only account for the sample databases. It reaches the browser once, to
 * create the sources through the normal API; the page never displays it.
 */
export const SAMPLE_SOURCES_PATH = '/assets/sample-sources.json'

/** Label that marks a source as one of the samples, so it can be tagged and removed as a set. */
export const SAMPLE_LABEL = 'sample'

export interface SampleSourceSetting {
  id: string
  name: string
  description: string
  connector: string
  mode: string
  config: Record<string, JsonValue>
}

export function isSampleSource(source: SourceView): boolean {
  const labels = source.metadata?.labels
  return (
    typeof labels === 'object' &&
    labels !== null &&
    !Array.isArray(labels) &&
    labels[SAMPLE_LABEL] === 'true'
  )
}

/** The configured samples, or null when this deployment offers none. */
export async function loadSampleSources(
  fetcher: ApiFetcher = fetch,
): Promise<SampleSourceSetting[] | null> {
  let response: Response
  try {
    response = await fetcher(SAMPLE_SOURCES_PATH, { headers: { Accept: 'application/json' } })
  } catch {
    return null
  }
  if (!response.ok) return null
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return null
  }
  if (!isRecord(payload) || !Array.isArray(payload.sources)) return null
  const sources = payload.sources.filter(isSampleSetting)
  return sources.length > 0 ? sources : null
}

export interface SampleAddResult {
  added: SourceView[]
  /** Samples already present, left as they are. */
  existing: string[]
}

/** Creates every sample not yet present. Stops at the first refusal and reports it. */
export async function addSampleSources(
  samples: SampleSourceSetting[],
  present: SourceView[],
  fetcher: ApiFetcher = fetch,
): Promise<SampleAddResult> {
  const presentIds = new Set(present.map((source) => source.id))
  const added: SourceView[] = []
  const existing: string[] = []
  for (const sample of samples) {
    if (presentIds.has(sample.id)) {
      existing.push(sample.id)
      continue
    }
    const created = await createSource(
      {
        id: sample.id,
        connector: sample.connector,
        mode: sample.mode,
        config: sample.config,
        metadata: { labels: { [SAMPLE_LABEL]: 'true' }, description: sample.name },
      },
      fetcher,
    )
    added.push(created.source)
  }
  return { added, existing }
}

export type SampleRemoveResult =
  | { removed: string[]; refused: null }
  | { removed: string[]; refused: { sourceId: string; referrers: string[] } }

/**
 * Deletes the sample sources, never any other. The server refuses a source a pipeline still
 * reads; that refusal is returned with the pipelines named, and the remaining samples are kept.
 */
export async function removeSampleSources(
  sources: SourceView[],
  fetcher: ApiFetcher = fetch,
): Promise<SampleRemoveResult> {
  const removed: string[] = []
  for (const source of sources.filter(isSampleSource)) {
    const { etag } = await getSource(source.id, fetcher)
    try {
      await deleteSource(source.id, etag, fetcher)
    } catch (error) {
      if (error instanceof SourceClientError && error.code === 'source.in-use') {
        const referrers = Array.isArray(error.params.referrers)
          ? error.params.referrers.map(String)
          : []
        return { removed, refused: { sourceId: source.id, referrers } }
      }
      throw error
    }
    removed.push(source.id)
  }
  return { removed, refused: null }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSampleSetting(value: unknown): value is SampleSourceSetting {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.connector === 'string' &&
    typeof value.mode === 'string' &&
    isRecord(value.config)
  )
}
