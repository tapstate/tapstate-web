import type { PipelineRuntimeState, PipelineView } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'

/**
 * Id under which the server registers its own managed store for views. It is listed with the
 * sources, but it is where views are kept rather than something to build from, so the
 * overview counts it as the state store and never as a data source.
 */
export const MANAGED_VIEW_STORE_SOURCE_ID = 'views'

/** The three setup steps, in the order a new workspace is guided through them. */
export const SETUP_STEP_ORDER = ['stateStore', 'sources', 'pipeline'] as const
export type SetupStepId = (typeof SETUP_STEP_ORDER)[number]

export type PipelineHealth = 'running' | 'idle' | 'error'

export interface OverviewSourceItem {
  id: string
  connector: string
}

export interface OverviewAttentionItem {
  kind: 'pipelineFailed'
  pipelineId: string
  code: string | null
}

export interface OverviewModel {
  stateStore: {
    ready: boolean
    /** Id of the source the store is registered as, when it is the server's managed store. */
    managedSourceId: string | null
  }
  sources: {
    count: number
    /** The first few sources, for the diagram; the rest are only counted. */
    preview: OverviewSourceItem[]
  }
  pipelines: Record<PipelineHealth, number> & { total: number }
  setup: {
    done: Record<SetupStepId, boolean>
    completed: number
    /** The first step not yet done, or null when setup is complete. */
    next: SetupStepId | null
  }
  attention: OverviewAttentionItem[]
}

/** How many sources the diagram names before it only counts the rest. */
export const SOURCE_PREVIEW_LIMIT = 3

/** Idle covers every state in which the pipeline is not moving data and has not failed. */
export function pipelineHealth(state: PipelineRuntimeState | undefined): PipelineHealth {
  if (state === 'RUNNING') return 'running'
  if (state === 'FAILED') return 'error'
  return 'idle'
}

/** Builds the overview from the source and pipeline lists the server already returns. */
export function buildOverview(sources: SourceView[], pipelines: PipelineView[]): OverviewModel {
  const managed = sources.find((source) => source.id === MANAGED_VIEW_STORE_SOURCE_ID) ?? null
  const dataSources = sources
    .filter((source) => source.id !== MANAGED_VIEW_STORE_SOURCE_ID)
    .map((source) => ({ id: source.id, connector: source.connector }))
    .sort((left, right) => left.id.localeCompare(right.id))

  const counts: Record<PipelineHealth, number> = { running: 0, idle: 0, error: 0 }
  const attention: OverviewAttentionItem[] = []
  for (const pipeline of [...pipelines].sort((left, right) => left.id.localeCompare(right.id))) {
    const health = pipelineHealth(pipeline.status?.state)
    counts[health] += 1
    if (health === 'error') {
      attention.push({
        kind: 'pipelineFailed',
        pipelineId: pipeline.id,
        code: pipeline.status?.failure?.code ?? null,
      })
    }
  }

  const done: Record<SetupStepId, boolean> = {
    stateStore: managed !== null,
    sources: dataSources.length > 0,
    pipeline: pipelines.length > 0,
  }

  return {
    stateStore: { ready: done.stateStore, managedSourceId: managed?.id ?? null },
    sources: { count: dataSources.length, preview: dataSources.slice(0, SOURCE_PREVIEW_LIMIT) },
    pipelines: { ...counts, total: pipelines.length },
    setup: {
      done,
      completed: SETUP_STEP_ORDER.filter((step) => done[step]).length,
      next: SETUP_STEP_ORDER.find((step) => !done[step]) ?? null,
    },
    attention,
  }
}
