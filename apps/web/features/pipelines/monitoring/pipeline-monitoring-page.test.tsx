import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getPipelineMetrics,
  getPipelineStatus,
  getPipelineSnapshot,
  getPipelineExplain,
  getPipelineMetricsHistory,
} = vi.hoisted(() => ({
  getPipelineMetrics: vi.fn(),
  getPipelineStatus: vi.fn(),
  getPipelineSnapshot: vi.fn(),
  getPipelineExplain: vi.fn(),
  getPipelineMetricsHistory: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  getPipelineMetrics,
  getPipelineStatus,
  PipelineClientError: class PipelineClientError extends Error {
    status: number | null = null
  },
}))

vi.mock('@/service/pipelines/pipeline-observability-client', () => ({
  getPipelineSnapshot,
  getPipelineExplain,
  getPipelineMetricsHistory,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

import { PipelineMonitoringPage } from './pipeline-monitoring-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const ID = 'order_360'

let root: Root | undefined
let container: HTMLDivElement | undefined

async function renderPage() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <PipelineMonitoringPage pipelineId={ID} />
      </QueryClientProvider>,
    )
  })
}

function explain(overrides: Record<string, unknown> = {}) {
  return {
    pipelineId: ID,
    state: 'RUNNING',
    kind: 'NO_MATCH',
    message: 'No diagnostic rule matched.',
    freshness: 'FRESH',
    observedAgeMillis: 7_000,
    evidence: [],
    cannotSay: [],
    next: null,
    ...overrides,
  }
}

function snapshot(orderLineStage: 'READING' | 'LANDED') {
  return {
    pipelineId: ID,
    snapshot: {},
    initialLoad: {
      readMode: 'snapshot_and_cdc',
      tables: {
        bmsql_customer: { stage: 'LANDED', rowsRead: 10_000, rowsTotalEstimate: 10_000 },
        bmsql_order_line: { stage: orderLineStage, rowsRead: 50_344, rowsTotalEstimate: 100_280 },
      },
    },
  }
}

const nestMetrics = {
  pipelineId: ID,
  metrics: {
    'records.in': 62_277,
    'records.out': 13_880,
    'bytes.in': 11_756_229,
    'bytes.out': 12_970_833,
    'lag.order_360__nest': 178,
    'frontierStalledMillis.bmsql_order_line': 1_112_596,
    'frontierStalledMillis.bmsql_customer': 0,
    'frontierGap.bmsql_customer': 0,
    'nestStateEntries.nest.ab.run.cd': 3_802,
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

function rowNames() {
  return [...(container?.querySelectorAll('tbody th[scope="row"]') ?? [])].map(
    (cell) => cell.textContent,
  )
}

beforeEach(() => {
  getPipelineStatus.mockResolvedValue({ pipelineId: ID, state: 'RUNNING' })
  getPipelineMetrics.mockResolvedValue(nestMetrics)
  getPipelineSnapshot.mockResolvedValue(snapshot('READING'))
  getPipelineExplain.mockResolvedValue(explain())
  getPipelineMetricsHistory.mockResolvedValue({
    pipelineId: ID,
    from: '2026-10-30T09:32:52Z',
    to: '2026-10-31T09:32:52Z',
    effectiveResolution: 'PT30M',
    status: 'OK',
    consistency: 'EVENTUAL',
    segments: [],
    gaps: [],
    unavailable: [],
    nextCursor: null,
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelineMonitoringPage', () => {
  it('leads with an initial load in progress and lists the loading table first', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Initial load in progress'))
    const banner = container?.querySelector('.pipeline-monitoring__health')
    expect(banner?.getAttribute('data-tone')).toBe('info')
    expect(banner?.textContent).toContain('bmsql_order_line')
    expect(banner?.textContent).toContain('50,344')
    expect(rowNames()[0]).toBe('bmsql_order_line')
    expect(container?.textContent).not.toContain('not advancing for')
  })

  it('shows a stall the server diagnosed once every table has loaded', async () => {
    getPipelineSnapshot.mockResolvedValue(snapshot('LANDED'))
    getPipelineExplain.mockResolvedValue(
      explain({
        kind: 'FRONTIER_STALLED',
        message: 'A chain has stopped advancing: bmsql_order_line.',
        evidence: [
          { source: 'metrics', field: 'frontierStalledMillis.bmsql_order_line', value: 1_112_596 },
        ],
        next: { action: 'CHECK_TARGET', message: 'Check that the target is accepting writes.' },
      }),
    )
    await renderPage()

    await vi.waitFor(() =>
      expect(container?.textContent).toContain('bmsql_order_line not advancing for 18 min 32 sec'),
    )
    expect(
      container?.querySelector('.pipeline-monitoring__health')?.getAttribute('data-tone'),
    ).toBe('warning')
    expect(container?.textContent).toContain('Check that the target is accepting writes.')
  })

  it('names nest stages by step and level, and keeps hashes out of the visible labels', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Advanced · transform state'))
    await act(async () =>
      [...(container?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent?.includes('Advanced · transform state'))
        ?.click(),
    )
    await vi.waitFor(() => expect(container?.textContent).toContain('order_doc · lines'))
    expect(rowNames()).not.toContain('nest.ab.run.cd')
  })

  it('omits the transform section for a pipeline with no nest or join state', async () => {
    getPipelineMetrics.mockResolvedValue({
      pipelineId: ID,
      metrics: { 'lag.orders': 4, 'frontierGap.orders': 0, 'records.in': 10 },
    })
    getPipelineSnapshot.mockResolvedValue({ pipelineId: ID, snapshot: {} })
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Sync healthy'))
    expect(container?.textContent).not.toContain('Advanced · transform state')
  })

  it('pages a copy of many tables 25 at a time', async () => {
    const metrics: Record<string, number> = {}
    for (let index = 0; index < 30; index += 1) {
      const table = `table_${String(index).padStart(2, '0')}`
      metrics[`lag.${table}`] = index
      metrics[`frontierGap.${table}`] = 0
    }
    getPipelineMetrics.mockResolvedValue({ pipelineId: ID, metrics })
    getPipelineSnapshot.mockResolvedValue({ pipelineId: ID, snapshot: {} })
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Tables (30)'))
    expect(rowNames()).toHaveLength(25)
  })

  it('shows failures since start as a key figure', async () => {
    getPipelineMetrics.mockResolvedValue({
      ...nestMetrics,
      metrics: { ...nestMetrics.metrics, 'errors.engine.job-failed': 1 },
    })
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Failures since start'))
    expect(container?.textContent).toContain('engine.job-failed')
  })

  it('asks the lag history for the outputs lag is reported under, not the source tables', async () => {
    await renderPage()

    await vi.waitFor(() => expect(getPipelineMetricsHistory).toHaveBeenCalled())
    expect(getPipelineMetricsHistory.mock.calls[0]?.[1]).toMatchObject({
      tables: ['order_360__nest'],
    })
  })

  it('supports explicit refresh without polling monitoring snapshots', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Initial load in progress'))
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Refresh monitoring"]')?.click(),
    )
    await vi.waitFor(() => expect(getPipelineMetrics).toHaveBeenCalledTimes(2))
    expect(getPipelineSnapshot).toHaveBeenCalledTimes(2)
    expect(getPipelineExplain).toHaveBeenCalledTimes(2)

    vi.useFakeTimers()
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })
      expect(getPipelineStatus).toHaveBeenCalledTimes(2)
      expect(getPipelineMetrics).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps a failed observation request distinct from empty metrics', async () => {
    getPipelineMetrics.mockRejectedValueOnce(new Error('offline'))
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain("We couldn't load monitoring"))
  })
})
