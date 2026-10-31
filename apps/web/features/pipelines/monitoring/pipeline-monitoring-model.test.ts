import { describe, expect, it } from 'vitest'

import type {
  PipelineMetrics,
  PipelineStatus,
  PipelineView,
} from '@/service/pipelines/pipeline-client'
import type {
  PipelineExplain,
  PipelineSnapshot,
} from '@/service/pipelines/pipeline-observability-client'

import { formatDuration, formatMetricValue } from './pipeline-monitoring-format'
import {
  deriveHealth,
  deriveKeyFigures,
  deriveNestStages,
  deriveTableOrigins,
  deriveTables,
  groupMetrics,
  lagOutputs,
} from './pipeline-monitoring-model'

const running: PipelineStatus = { pipelineId: 'p', state: 'RUNNING' }

function explain(overrides: Partial<PipelineExplain>): PipelineExplain {
  return {
    pipelineId: 'p',
    state: 'RUNNING',
    kind: 'NO_MATCH',
    message: 'No diagnostic rule matched.',
    freshness: 'FRESH',
    evidence: [],
    cannotSay: [],
    next: null,
    ...overrides,
  }
}

function loading(stage: 'READING' | 'LANDED'): PipelineSnapshot {
  return {
    pipelineId: 'p',
    snapshot: {
      bmsql_order_line: { rowsDone: 50_344, rowsTotal: 100_280 },
      bmsql_customer: { rowsDone: 10_000, rowsTotal: 10_000 },
    },
    initialLoad: {
      readMode: 'snapshot_and_cdc',
      tables: {
        bmsql_order_line: { stage, rowsRead: 50_344, rowsTotalEstimate: 100_280 },
        bmsql_customer: { stage: 'LANDED', rowsRead: 10_000, rowsTotalEstimate: 10_000 },
      },
    },
  }
}

const nestMetrics: PipelineMetrics = {
  pipelineId: 'p',
  metrics: {
    'records.in': 62_277,
    'records.out': 13_880,
    'bytes.in': 11_756_229,
    'bytes.out': 12_970_833,
    'lag.p__nest': 178,
    'frontierStalledMillis.bmsql_order_line': 1_112_596,
    'frontierGap.bmsql_customer': 0,
    'nestStateEntries.nest.ab.run.cd': 3_802,
    'nestStateBackfillMillis.nest.ab.run.cd': 1_585_390,
    'nestStateEntries.nest.ef.run.cd': 4_065,
    'errors.engine.job-failed': 1,
  },
  facts: [
    {
      name: 'tapstate.pipeline.nest.namespace.info',
      type: 'gauge',
      unit: '1',
      points: [
        {
          attributes: {
            'tapstate.nest.namespace': 'nest.ab.run.cd',
            'tapstate.nest.step': 'order_doc',
            'tapstate.nest.path': '["lines"]',
            'tapstate.nest.map': 'state',
          },
          observedAt: '2026-10-31T09:32:58Z',
          value: 1,
        },
      ],
    },
  ],
}

describe('deriveHealth', () => {
  it('reports a table still in its initial load as loading, naming the largest remaining load', () => {
    const health = deriveHealth(running, explain({}), loading('READING'))

    expect(health.kind).toBe('loading')
    expect(health.tone).toBe('info')
    expect(health.loading).toEqual({
      table: 'bmsql_order_line',
      rowsRead: 50_344,
      rowsTotal: 100_280,
    })
    expect(health.landedTables).toBe(1)
    expect(health.totalTables).toBe(2)
  })

  it('reports a stall the server diagnosed with the tables it named', () => {
    const health = deriveHealth(
      running,
      explain({
        kind: 'FRONTIER_STALLED',
        message: 'A chain has stopped advancing: bmsql_order_line.',
        evidence: [
          { source: 'metrics', field: 'frontierStalledMillis.bmsql_order_line', value: 120_000 },
        ],
        next: { action: 'CHECK_TARGET', message: 'Check that the target is accepting writes.' },
      }),
      loading('LANDED'),
    )

    expect(health.kind).toBe('stalled')
    expect(health.tone).toBe('warning')
    expect(health.stalledTables).toEqual([{ table: 'bmsql_order_line', stalledMs: 120_000 }])
    expect(health.next).toBe('Check that the target is accepting writes.')
  })

  it('puts a failure before any load in progress', () => {
    const health = deriveHealth(
      { ...running, state: 'FAILED', failure: { code: 'engine.job-failed', params: {} } },
      explain({ kind: 'CODED_FAILURE' }),
      loading('READING'),
    )

    expect(health).toMatchObject({
      kind: 'failed',
      tone: 'error',
      failureCode: 'engine.job-failed',
    })
  })

  it('calls a running pipeline with nothing to report sync healthy, not verified', () => {
    expect(deriveHealth(running, explain({}), loading('LANDED'))).toMatchObject({
      kind: 'healthy',
      tone: 'neutral',
    })
  })
})

describe('deriveTables', () => {
  it('puts the loading table first and keeps the nest output separate from the source tables', () => {
    const { rows, outputs } = deriveTables(nestMetrics, loading('READING'))

    expect(rows.map((row) => row.table)).toEqual(['bmsql_order_line', 'bmsql_customer'])
    expect(rows[0]).toMatchObject({ phase: 'loading', rowsRead: 50_344, rowsTotal: 100_280 })
    expect(rows[1]).toMatchObject({ phase: 'streaming', gap: 0 })
    expect(outputs).toEqual([{ output: 'p__nest', newestChangeSeconds: 178 }])
  })

  it('gives a copy table its own newest-change reading when its output carries its name', () => {
    const { rows, outputs } = deriveTables(
      { pipelineId: 'p', metrics: { 'lag.orders': 4, 'frontierGap.orders': 0 } },
      undefined,
    )

    expect(rows).toEqual([expect.objectContaining({ table: 'orders', newestChangeSeconds: 4 })])
    expect(outputs).toEqual([])
  })
})

function definition(overrides: Partial<PipelineView>): PipelineView {
  return { id: 'p', dag: { nodes: [], edges: [] }, contentHash: 'h', ...overrides }
}

function sourceNode(source: string, table: string) {
  return { id: `source:${source}:${table}`, type: 'source' as const, label: table, detail: source }
}

describe('deriveTableOrigins', () => {
  it('names each nest input by its document path through the step aliases, nested embeds included', () => {
    const origins = deriveTableOrigins(
      definition({
        dag: {
          nodes: [
            sourceNode('core', 'bmsql_oorder'),
            sourceNode('core', 'bmsql_customer'),
            sourceNode('core', 'bmsql_order_line'),
            sourceNode('core', 'bmsql_item'),
          ],
          edges: [],
        },
        transforms: [
          {
            id: 'p__nest',
            type: 'nest',
            from: {
              root: 'core.bmsql_oorder',
              cust: 'core.bmsql_customer',
              lines: 'core.bmsql_order_line',
              item: 'core.bmsql_item',
            },
            root: {
              from: 'root',
              embed: [
                { from: 'cust', as: 'OBJECT', path: 'customer' },
                {
                  from: 'lines',
                  as: 'ARRAY',
                  path: 'lines',
                  embed: [{ from: 'item', as: 'OBJECT', path: 'item' }],
                },
              ],
            },
          },
        ],
      }),
    )

    expect(Object.fromEntries(origins.roles)).toEqual({
      bmsql_oorder: [{ kind: 'root' }],
      bmsql_customer: [{ kind: 'embed', path: 'customer' }],
      bmsql_order_line: [{ kind: 'embed', path: 'lines[]' }],
      bmsql_item: [{ kind: 'embed', path: 'lines[].item' }],
    })
    expect(origins.multiSource).toBe(false)
  })

  it('gives a copy no roles and reports a second source', () => {
    const origins = deriveTableOrigins(
      definition({
        dag: { nodes: [sourceNode('mysql', 'orders'), sourceNode('pg', 'orders')], edges: [] },
      }),
    )

    expect(origins.roles.size).toBe(0)
    expect(origins.sources.get('orders')).toEqual(['mysql', 'pg'])
    expect(origins.multiSource).toBe(true)
  })
})

describe('deriveKeyFigures', () => {
  it('takes the newest change across outputs rather than the quietest output', () => {
    const figures = deriveKeyFigures(
      { pipelineId: 'p', metrics: { 'lag.orders': 4, 'lag.regions': 10_920, 'errors.a': 1 } },
      undefined,
    )

    expect(figures.newestChangeSeconds).toBe(4)
    expect(figures.failures).toBe(1)
    expect(figures.failureCodes).toEqual(['a'])
  })
})

describe('deriveNestStages', () => {
  it('names a namespace by its step and level when the info reading is published, and keeps the rest', () => {
    const stages = deriveNestStages(nestMetrics)

    expect(stages).toHaveLength(2)
    expect(stages[0]).toMatchObject({
      namespace: 'nest.ab.run.cd',
      step: 'order_doc',
      path: ['lines'],
      map: 'state',
      entries: 3_802,
      backfillMillis: 1_585_390,
    })
    expect(stages[1]).toMatchObject({ namespace: 'nest.ef.run.cd', step: null, entries: 4_065 })
  })
})

describe('metric grouping and units', () => {
  it('groups every flat metric and gives each its unit', () => {
    const groups = groupMetrics(nestMetrics)

    expect(groups.map((group) => group.id)).toEqual([
      'throughput',
      'lag',
      'frontier',
      'nest',
      'errors',
    ])
    expect(groups.flatMap((group) => group.metrics)).toHaveLength(
      Object.keys(nestMetrics.metrics).length,
    )
    expect(groups.find((group) => group.id === 'lag')?.metrics[0]?.unit).toBe('seconds')
  })

  it('asks the lag history for outputs, not source tables', () => {
    expect(lagOutputs(nestMetrics)).toEqual(['p__nest'])
  })

  it('formats durations in the two largest units', () => {
    expect(formatDuration(1_585_390, 'en')).toBe('26 min 25 sec')
    expect(formatMetricValue(178, 'seconds', 'en')).toBe('2 min 58 sec')
    expect(formatDuration(850, 'en')).toBe('850 ms')
  })
})
