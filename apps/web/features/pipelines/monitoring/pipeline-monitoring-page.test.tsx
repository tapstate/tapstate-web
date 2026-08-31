import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPipelineMetrics, getPipelineStatus } = vi.hoisted(() => ({
  getPipelineMetrics: vi.fn(),
  getPipelineStatus: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  getPipelineMetrics,
  getPipelineStatus,
  PipelineClientError: class PipelineClientError extends Error {
    status: number | null = null
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

import { PipelineMonitoringPage } from './pipeline-monitoring-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

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
        <PipelineMonitoringPage pipelineId="orders_to_warehouse" />
      </QueryClientProvider>,
    )
  })
}

beforeEach(() => {
  getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })
  getPipelineMetrics.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    metrics: { recordsProcessed: 187, errorRate: 2, latencyMs: 14 },
    perTableOffset: { players: '42' },
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
  it('renders the current metrics snapshot as a readable comparison chart', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Running'))
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineMetrics).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(document.querySelector('[data-testid="pipeline-metric-chart"]')).not.toBeNull()
    expect(container?.textContent).toContain('recordsProcessed')
    expect(container?.textContent).toContain('187')
    expect(container?.textContent).toContain('players')
    expect(container?.textContent).toContain('42')
  })

  it('supports an explicit refresh and pausing automatic observation updates', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Running'))
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Refresh monitoring"]')?.click(),
    )
    await vi.waitFor(() => expect(getPipelineMetrics).toHaveBeenCalledTimes(2))

    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Pause automatic monitoring refresh"]')
        ?.click(),
    )
    expect(container?.textContent).toContain('Updates paused')
    expect(
      document.querySelector('[aria-label="Resume automatic monitoring refresh"]'),
    ).not.toBeNull()
  })

  it('distinguishes empty metrics from a failed observation request', async () => {
    getPipelineMetrics.mockResolvedValueOnce({ pipelineId: 'orders_to_warehouse', metrics: {} })
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('No metrics available'))

    await act(async () => root?.unmount())
    container?.remove()
    root = undefined
    container = undefined

    getPipelineMetrics.mockRejectedValueOnce(new Error('offline'))
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain("We couldn't load monitoring"))
  })
})
