import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getPipeline,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  savePipelineLayout,
} = vi.hoisted(() => ({
  getPipeline: vi.fn(),
  getPipelineLayout: vi.fn(),
  getPipelineLogs: vi.fn(),
  getPipelineMetrics: vi.fn(),
  getPipelineStatus: vi.fn(),
  savePipelineLayout: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: React.ComponentProps<'a'> & { params?: { pipelineId?: string }; to: string }) => (
    <a {...props} href={to.replace('$pipelineId', params?.pipelineId ?? '')}>
      {children}
    </a>
  ),
}))

vi.mock('@/service/pipeline-client', () => ({
  getPipeline,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  savePipelineLayout,
  PipelineClientError: class PipelineClientError extends Error {},
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

vi.mock('./pipeline-canvas', () => ({
  PipelineCanvas: ({
    onSelectionChange,
  }: {
    onSelectionChange: (selection: {
      id: string
      label: string
      detail: string | null
      nodeType: string
    }) => void
  }) => (
    <button
      type="button"
      data-testid="pipeline-canvas"
      onClick={() =>
        onSelectionChange({
          id: 'transform:normalize',
          label: 'normalize',
          detail: 'map',
          nodeType: 'transform',
        })
      }
    >
      Canvas
    </button>
  ),
}))

import { PipelineEditorPage, PipelineWorkspacePage } from './pipeline-editor-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function elementWithText(selector: string, text: string) {
  return [...(document.querySelectorAll<HTMLElement>(selector) ?? [])].find((element) =>
    element.textContent?.includes(text),
  )
}

async function renderPage(section: 'orchestrate' | 'api' | 'logs' | 'monitoring' = 'orchestrate') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        {section === 'orchestrate' ? (
          <PipelineEditorPage pipelineId="orders_to_warehouse" />
        ) : (
          <PipelineWorkspacePage pipelineId="orders_to_warehouse" section={section} />
        )}
      </QueryClientProvider>,
    )
  })
}

beforeEach(() => {
  getPipeline.mockResolvedValue({
    id: 'orders_to_warehouse',
    contentHash: 'a'.repeat(64),
    dag: {
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: 'mysql' },
        { id: 'serve:orders_api', type: 'serve', label: 'orders_api', detail: null },
      ],
      edges: [
        {
          id: 'source:orders->serve:orders_api',
          source: 'source:orders',
          target: 'serve:orders_api',
          label: null,
        },
      ],
    },
  })
  getPipelineLayout.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    nodes: {},
    viewport: null,
  })
  getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })
  getPipelineMetrics.mockResolvedValue({ pipelineId: 'orders_to_warehouse', metrics: {} })
  getPipelineLogs.mockResolvedValue({ pipelineId: 'orders_to_warehouse', lines: [] })
  savePipelineLayout.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    nodes: {},
    viewport: null,
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelineEditorPage', () => {
  it('keeps the canvas in the Build route and exposes separate workspace navigation', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    expect(getPipelineStatus).not.toHaveBeenCalled()
    expect(elementWithText('a', 'Build')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit',
    )
    expect(elementWithText('a', 'Monitoring')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit/monitoring',
    )
    expect(elementWithText('a', 'Logs')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit/logs',
    )
  })

  it('keeps navigation as a floating canvas panel that can collapse and expand', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    const navigation = document.querySelector<HTMLElement>('[data-testid="workspace-navigation"]')
    expect(navigation?.dataset.collapsed).toBe('false')

    await act(async () =>
      document.querySelector<HTMLElement>('[aria-label="Collapse workspace navigation"]')?.click(),
    )
    await vi.waitFor(() => expect(navigation?.dataset.collapsed).toBe('true'))

    await act(async () =>
      document.querySelector<HTMLElement>('[aria-label="Expand workspace navigation"]')?.click(),
    )
    await vi.waitFor(() => expect(navigation?.dataset.collapsed).toBe('false'))
  })

  it('loads status and metrics after navigating to Monitoring', async () => {
    await renderPage('monitoring')

    await vi.waitFor(() => expect(container?.textContent).toContain('Running'))
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineMetrics).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineLogs).not.toHaveBeenCalled()
  })

  it('loads logs only after navigating to Logs', async () => {
    await renderPage('logs')

    await vi.waitFor(() => expect(container?.textContent).toContain('No log lines'))
    expect(getPipelineLogs).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineStatus).not.toHaveBeenCalled()
    expect(getPipelineMetrics).not.toHaveBeenCalled()
  })

  it('shows serve nodes as unpublished API access rather than fabricating an endpoint', async () => {
    await renderPage('api')

    await vi.waitFor(() =>
      expect(container?.textContent).toContain('API publication is not configured'),
    )
    expect(container?.textContent).toContain('orders_api')
    expect(container?.textContent).not.toContain('/api/pipelines/orders_to_warehouse')
  })

  it('returns to node configuration when a node is selected on the canvas', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )

    await vi.waitFor(() => expect(container?.textContent).toContain('Configuration'))
    expect(container?.textContent).toContain('normalize')
    expect(container?.textContent).toContain('map')
  })
})
