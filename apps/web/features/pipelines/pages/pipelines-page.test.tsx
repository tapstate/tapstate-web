import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { listPipelines, listSources } = vi.hoisted(() => ({
  listPipelines: vi.fn(),
  listSources: vi.fn(),
}))

vi.mock('@/service/source-client', () => ({ listSources }))
vi.mock('@/service/pipelines/pipeline-client', () => ({ listPipelines }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

vi.mock('../components/canvas/pipeline-canvas', () => ({
  PipelineCanvas: ({ pipeline }: { pipeline: { id: string } | null }) => (
    <div data-testid="pipeline-canvas">{pipeline?.id ?? 'empty'}</div>
  ),
}))

vi.mock('./wizard-builder', () => ({
  WizardBuilder: () => <div data-testid="wizard-builder">Wizard builder</div>,
}))

import { PipelinesPage } from './pipelines-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function elementWithText(selector: string, text: string) {
  return [...(document.querySelectorAll<HTMLElement>(selector) ?? [])].find((element) =>
    element.textContent?.includes(text),
  )
}

async function renderPage() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <PipelinesPage />
      </QueryClientProvider>,
    )
  })
}

async function openCreationMenu() {
  await act(async () => elementWithText('button', 'Create')?.click())
}

beforeEach(() => {
  listSources.mockResolvedValue([{ id: 'orders' }])
  listPipelines.mockResolvedValue([
    {
      id: 'orders_to_warehouse',
      dag: { nodes: [], edges: [] },
      contentHash: 'a'.repeat(64),
      status: { pipelineId: 'orders_to_warehouse', state: 'RUNNING' },
    },
    {
      id: 'customer_360',
      dag: { nodes: [], edges: [] },
      contentHash: 'b'.repeat(64),
      status: { pipelineId: 'customer_360', state: 'PAUSED' },
    },
  ])
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelinesPage', () => {
  it('lists stored Pipeline artifacts and makes each resource name the standalone editor entry', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    expect(container?.textContent).toContain('All Pipelines')
    expect(container?.textContent).toContain('customer_360')
    expect(container?.textContent).toContain('Running')
    expect(container?.textContent).toContain('Paused')
    expect(container?.textContent).not.toContain('User Data Sync')
    expect(container?.textContent).not.toContain('2 hours ago')
    expect(listPipelines).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).toBeNull()

    await openCreationMenu()
    expect(elementWithText('[role="menuitem"]', 'Build with DAG Designer')).toBeDefined()
    expect(elementWithText('a', 'Build with DAG Designer')).toBeUndefined()
    expect(
      document
        .querySelector<HTMLAnchorElement>('a[href="/pipelines/orders_to_warehouse/edit"]')
        ?.getAttribute('href'),
    ).toBe('/pipelines/orders_to_warehouse/edit')
    expect([...document.querySelectorAll('th')].map((header) => header.textContent)).not.toContain(
      'Actions',
    )
    expect(elementWithText('a', 'Edit')).toBeUndefined()
  })

  it('shows an unavailable state when a Pipeline has no runtime observation', async () => {
    listPipelines.mockResolvedValueOnce([
      {
        id: 'orders_to_warehouse',
        dag: { nodes: [], edges: [] },
        contentHash: 'a'.repeat(64),
        status: null,
      },
      {
        id: 'customer_360',
        dag: { nodes: [], edges: [] },
        contentHash: 'b'.repeat(64),
        status: { pipelineId: 'customer_360', state: 'PAUSED' },
      },
    ])

    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Unavailable'))
    expect(container?.textContent).toContain('Paused')
    expect(listPipelines).toHaveBeenCalledTimes(1)
  })

  it('keeps the existing wizard creation path available beside the DAG editor', async () => {
    await renderPage()

    await openCreationMenu()
    await act(async () => elementWithText('[role="menuitem"]', 'Build with Wizard')?.click())

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="wizard-builder"]')).not.toBeNull(),
    )
  })

  it('keeps a selected Pipeline in the Explorer instead of presenting a local draft as its editor', async () => {
    await renderPage()

    await vi.waitFor(() => expect(elementWithText('button', 'orders_to_warehouse')).toBeDefined())
    await act(async () => elementWithText('button', 'orders_to_warehouse')?.click())
    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    expect(document.querySelector('[data-testid="pipeline-canvas"]')).toBeNull()
  })

  it('shows a retryable error when the stored Pipeline list cannot load', async () => {
    listPipelines.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    await renderPage()

    await vi.waitFor(() =>
      expect(container?.textContent).toContain("We couldn't load stored pipelines."),
    )
    await act(async () => elementWithText('button', 'Retry')?.click())

    await vi.waitFor(() => expect(listPipelines).toHaveBeenCalledTimes(2))
    await vi.waitFor(() =>
      expect(container?.textContent).toContain('No pipelines have been stored in this workspace.'),
    )
  })
})
