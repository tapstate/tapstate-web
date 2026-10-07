import type { PipelineCatalogItem, PipelineCatalogState } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'
import type { ViewListResult } from '@/service/view-client'
import type { DeploymentProfile } from '@/utils/deployment-profile'

import { isSampleSource } from '@/service/sample-source-client'
import { isDataSource, stateStoreSource } from '@/service/state-store-source'

/** The three setup steps, in the order a new workspace is guided through them. */
export const SETUP_STEP_ORDER = ['stateStore', 'sources', 'pipeline'] as const
export type SetupStepId = (typeof SETUP_STEP_ORDER)[number]

export type PipelineHealth = 'running' | 'idle' | 'error'

export interface OverviewSourceItem {
  id: string
  connector: string
  sample: boolean
}

export type OverviewAttentionItem =
  | { kind: 'pipelineFailed'; pipelineId: string; code: string | null }
  | {
      kind: 'viewStale'
      viewId: string
      collection: string
      pipelineId: string
      pipelineHealth: PipelineHealth | null
      /** Epoch milliseconds of the last change applied, or null when none was. */
      lastAppliedAt: number | null
    }

/** Freshness counts from the server's view list; null while the server does not list views. */
export interface OverviewViewCounts {
  total: number
  fresh: number
  stale: number
}

export interface OverviewModel {
  stateStore: {
    ready: boolean
    /** Id of the source the store is registered as, when it is the server's managed store. */
    managedSourceId: string | null
    views: OverviewViewCounts | null
  }
  sources: {
    count: number
    /** The first few sources, for the diagram; the rest are only counted. */
    preview: OverviewSourceItem[]
    /** Every data source, sorted by id. */
    all: OverviewSourceItem[]
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
export function pipelineHealth(state: PipelineCatalogState | undefined): PipelineHealth {
  if (state === 'RUNNING' || state === 'STARTING' || state === 'RESUMING') return 'running'
  if (state === 'FAILED') return 'error'
  return 'idle'
}

/**
 * Builds the overview from the source and pipeline lists the server already returns, plus the
 * view list when the server offers one. Freshness is the server's; nothing here derives it.
 */
export function buildOverview(
  sources: SourceView[],
  pipelines: PipelineCatalogItem[],
  views: ViewListResult | null = null,
  profile: DeploymentProfile = 'on-prem',
): OverviewModel {
  const managed = stateStoreSource(sources, profile)
  const dataSources = sources
    .filter(isDataSource)
    .map((source) => ({
      id: source.id,
      connector: source.connector,
      sample: isSampleSource(source),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

  const counts: Record<PipelineHealth, number> = { running: 0, idle: 0, error: 0 }
  const attention: OverviewAttentionItem[] = []
  const healthById = new Map<string, PipelineHealth>()
  for (const pipeline of [...pipelines].sort((left, right) => left.id.localeCompare(right.id))) {
    const health = pipelineHealth(pipeline.status?.state)
    healthById.set(pipeline.id, health)
    counts[health] += 1
    if (health === 'error') {
      attention.push({
        kind: 'pipelineFailed',
        pipelineId: pipeline.id,
        code: pipeline.status?.failure?.code ?? null,
      })
    }
  }

  let viewCounts: OverviewViewCounts | null = null
  if (views?.available) {
    viewCounts = { total: views.views.length, fresh: 0, stale: 0 }
    const sorted = [...views.views].sort((left, right) =>
      left.location.collection.localeCompare(right.location.collection),
    )
    for (const view of sorted) {
      if (view.status.state === 'fresh') viewCounts.fresh += 1
      if (view.status.state !== 'stale') continue
      viewCounts.stale += 1
      attention.push({
        kind: 'viewStale',
        viewId: view.id,
        collection: view.location.collection,
        pipelineId: view.pipelineId,
        pipelineHealth: healthById.get(view.pipelineId) ?? null,
        lastAppliedAt: view.lastAppliedAt,
      })
    }
  }

  const done: Record<SetupStepId, boolean> = {
    stateStore: managed !== null,
    sources: dataSources.length > 0,
    pipeline: pipelines.length > 0,
  }

  return {
    stateStore: {
      ready: done.stateStore,
      managedSourceId: managed?.id ?? null,
      views: viewCounts,
    },
    sources: {
      count: dataSources.length,
      preview: dataSources.slice(0, SOURCE_PREVIEW_LIMIT),
      all: dataSources,
    },
    pipelines: { ...counts, total: pipelines.length },
    setup: {
      done,
      completed: SETUP_STEP_ORDER.filter((step) => done[step]).length,
      next: SETUP_STEP_ORDER.find((step) => !done[step]) ?? null,
    },
    attention,
  }
}
