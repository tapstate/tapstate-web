import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPipelineLogs } = vi.hoisted(() => ({
  getPipelineLogs: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({ getPipelineLogs }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

import { PipelineLogsPage } from './pipeline-logs-page'

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
        <PipelineLogsPage pipelineId="orders_to_warehouse" />
      </QueryClientProvider>,
    )
  })
}

beforeEach(() => {
  getPipelineLogs.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    lines: [
      { timestampMillis: 1_724_500_800_123, level: 'INFO', message: 'Pipeline started' },
      { timestampMillis: 1_724_500_801_123, level: 'WARN', message: 'Slow downstream sink' },
      { timestampMillis: 1_724_500_802_123, level: 'ERROR', message: 'Sink rejected record' },
    ],
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelineLogsPage', () => {
  it('orients the operator with a page heading and an honest log-tail description', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))

    expect(container?.querySelector('h1')?.textContent).toBe('Pipeline logs')
    expect(container?.textContent).toContain(
      'Inspect the latest runtime log lines captured for this Pipeline.',
    )
    expect(container?.querySelector('.pipeline-logs__workbench')).not.toBeNull()
  })

  it('loads the bounded log tail and filters the already-returned lines locally', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))
    expect(getPipelineLogs).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(container?.textContent).toContain('Slow downstream sink')

    await act(async () =>
      document.querySelector<HTMLButtonElement>('[data-log-level="WARN"]')?.click(),
    )
    expect(container?.textContent).not.toContain('Pipeline started')
    expect(container?.textContent).toContain('Slow downstream sink')
    expect(container?.textContent).not.toContain('Sink rejected record')

    const search = document.querySelector<HTMLInputElement>('[data-testid="pipeline-log-search"]')
    await act(async () => {
      if (!search) return
      search.value = 'sink'
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(container?.textContent).toContain('Slow downstream sink')
  })

  it('supports explicit refresh and pausing automatic updates without clearing the visible tail', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Refresh logs"]')?.click(),
    )
    await vi.waitFor(() => expect(getPipelineLogs).toHaveBeenCalledTimes(2))

    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Pause automatic log refresh"]')
        ?.click(),
    )
    expect(container?.textContent).toContain('Updates paused')
    expect(container?.textContent).toContain('Pipeline started')
    expect(document.querySelector('[aria-label="Resume automatic log refresh"]')).not.toBeNull()
  })

  it('opens a selected log line in a detail pane with its full timestamp and message', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))

    const line = document.querySelector<HTMLButtonElement>(
      '[aria-label="Inspect log line: Pipeline started"]',
    )
    expect(line).not.toBeNull()

    act(() => line?.click())

    expect(line?.getAttribute('aria-pressed')).toBe('true')
    expect(container?.querySelector('.pipeline-logs__content--with-detail')).not.toBeNull()
    expect(container?.textContent).toContain('Log details')
    expect(container?.textContent).toContain('Pipeline started')

    const timestamp = document.querySelector('.pipeline-log-detail time')
    expect(timestamp?.getAttribute('dateTime')).toBe(new Date(1_724_500_800_123).toISOString())
    expect(timestamp?.textContent).toBe(
      new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(1_724_500_800_123),
    )

    act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Close log details"]')?.click(),
    )
    expect(document.querySelector('[aria-label="Close log details"]')).toBeNull()
  })

  it('closes the log detail pane when Escape is pressed', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Inspect log line: Pipeline started"]')
        ?.click(),
    )
    expect(document.querySelector('[aria-label="Close log details"]')).not.toBeNull()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(document.querySelector('[aria-label="Close log details"]')).toBeNull()
  })

  it('shows the newest line first and lets the timestamp header reverse the order', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline started'))

    const firstMessage = () =>
      document.querySelector<HTMLElement>('.pipeline-logs__row-button .pipeline-logs__message')
        ?.textContent

    expect(firstMessage()).toBe('Sink rejected record')

    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Sort logs oldest first"]')?.click(),
    )

    expect(firstMessage()).toBe('Pipeline started')
    expect(document.querySelector('[aria-label="Sort logs newest first"]')).not.toBeNull()
  })

  it('renders distinct empty and request-error states', async () => {
    getPipelineLogs.mockResolvedValueOnce({ pipelineId: 'orders_to_warehouse', lines: [] })
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('No log lines'))

    await act(async () => root?.unmount())
    container?.remove()
    root = undefined
    container = undefined

    getPipelineLogs.mockRejectedValueOnce(new Error('offline'))
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain("We couldn't load logs"))
  })
})
