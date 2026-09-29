import { describe, expect, it } from 'vitest'

import type { PipelineRuntimeState, PipelineView } from '@/service/pipelines/pipeline-client'
import type { ViewSummary } from '@/service/view-client'

import { MANAGED_VIEW_STORE_SOURCE_ID, type SourceView } from '@/service/source-client'

import { buildOverview, pipelineHealth } from './overview-model'

function source(id: string, connector = 'postgres'): SourceView {
  return {
    id,
    metadata: null,
    connector,
    config: {},
    configuredSecrets: [],
    mode: null,
    tables: null,
    srs: null,
    contentHash: `hash-${id}`,
  }
}

function pipeline(id: string, state?: PipelineRuntimeState, code?: string): PipelineView {
  return {
    id,
    dag: { nodes: [], edges: [] },
    contentHash: `hash-${id}`,
    status: state
      ? {
          pipelineId: id,
          state,
          failure: code ? { code, params: {} } : null,
        }
      : null,
  }
}

describe('buildOverview', () => {
  it('guides a new workspace from the first step', () => {
    const overview = buildOverview([], [])

    expect(overview.setup).toEqual({
      done: { stateStore: false, sources: false, pipeline: false },
      completed: 0,
      next: 'stateStore',
    })
    expect(overview.sources.count).toBe(0)
    expect(overview.pipelines.total).toBe(0)
  })

  it('counts the managed view store as the state store and never as a data source', () => {
    const overview = buildOverview([source(MANAGED_VIEW_STORE_SOURCE_ID, 'mongodb')], [])

    expect(overview.stateStore).toEqual({
      ready: true,
      managedSourceId: MANAGED_VIEW_STORE_SOURCE_ID,
      views: null,
    })
    expect(overview.sources.count).toBe(0)
    expect(overview.setup.next).toBe('sources')
  })

  it('names the first sources in order and counts the rest', () => {
    const overview = buildOverview(
      [
        source('orders'),
        source(MANAGED_VIEW_STORE_SOURCE_ID),
        source('crm', 'oracle'),
        source('cards'),
        source('billing'),
      ],
      [],
    )

    expect(overview.sources.count).toBe(4)
    expect(overview.sources.preview).toEqual([
      { id: 'billing', connector: 'postgres' },
      { id: 'cards', connector: 'postgres' },
      { id: 'crm', connector: 'oracle' },
    ])
  })

  it('counts pipelines by health and lists failures as needing attention', () => {
    const overview = buildOverview(
      [source(MANAGED_VIEW_STORE_SOURCE_ID), source('orders')],
      [
        pipeline('b_sync', 'RUNNING'),
        pipeline('a_sync', 'FAILED', 'runtime.connector-failed'),
        pipeline('c_sync', 'STOPPED'),
        pipeline('d_sync'),
      ],
    )

    expect(overview.pipelines).toEqual({ running: 1, idle: 2, error: 1, total: 4 })
    expect(overview.attention).toEqual([
      { kind: 'pipelineFailed', pipelineId: 'a_sync', code: 'runtime.connector-failed' },
    ])
    expect(overview.setup).toMatchObject({ completed: 3, next: null })
  })
})

describe('buildOverview with the view list', () => {
  const view = (
    collection: string,
    pipelineId: string,
    status: ViewSummary['status'],
  ): ViewSummary => ({
    id: `views/${collection}`,
    kind: 'view',
    location: { storeId: 'views', database: null, collection },
    pipelineId,
    status,
    documents: null,
    sizeBytes: null,
    lastAppliedAt: 1000,
  })

  it('counts fresh and stale views and lists stale ones after failed pipelines', () => {
    const overview = buildOverview(
      [source(MANAGED_VIEW_STORE_SOURCE_ID), source('orders')],
      [pipeline('a_sync', 'FAILED'), pipeline('b_sync', 'STOPPED'), pipeline('c_sync', 'RUNNING')],
      {
        available: true,
        views: [
          view('orders_360', 'c_sync', { state: 'fresh', behindSeconds: 3 }),
          view('loans', 'b_sync', { state: 'stale', staleSeconds: 720 }),
          view('cards', 'c_sync', { state: 'loading', percent: 10 }),
        ],
      },
    )

    expect(overview.stateStore.views).toEqual({ total: 3, fresh: 1, stale: 1 })
    expect(overview.attention).toEqual([
      { kind: 'pipelineFailed', pipelineId: 'a_sync', code: null },
      {
        kind: 'viewStale',
        viewId: 'views/loans',
        collection: 'loans',
        pipelineId: 'b_sync',
        pipelineHealth: 'idle',
        lastAppliedAt: 1000,
      },
    ])
  })

  it('reports no view counts when the server does not list views', () => {
    const overview = buildOverview([], [], { available: false })

    expect(overview.stateStore.views).toBeNull()
  })
})

describe('pipelineHealth', () => {
  it.each([
    ['RUNNING', 'running'],
    ['FAILED', 'error'],
    ['NEW', 'idle'],
    ['PAUSED', 'idle'],
    ['STOPPED', 'idle'],
    ['COMPLETED', 'idle'],
    [undefined, 'idle'],
  ] as const)('maps %s to %s', (state, health) => {
    expect(pipelineHealth(state)).toBe(health)
  })
})
