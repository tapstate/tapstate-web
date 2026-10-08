import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiFetch,
  deletePipelineDraft,
  getPipelineDraft,
  listPipelines,
  listPipelineDrafts,
  listSources,
  runPipeline,
  stopPipeline,
} = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  deletePipelineDraft: vi.fn(),
  getPipelineDraft: vi.fn(),
  listPipelines: vi.fn(),
  listPipelineDrafts: vi.fn(),
  listSources: vi.fn(),
  runPipeline: vi.fn(),
  stopPipeline: vi.fn(),
}))

vi.mock('@/service/source-client', () => ({ listSources }))
vi.mock('@/service/pipelines/pipeline-client', () => ({
  deletePipelineDraft,
  getPipelineDraft,
  listPipelineDrafts,
  listPipelines,
  runPipeline,
  stopPipeline,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
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

  return queryClient
}

beforeEach(() => {
  listSources.mockResolvedValue([{ id: 'orders' }])
  listPipelines.mockResolvedValue([
    {
      id: 'orders_to_warehouse',
      name: 'orders_to_warehouse',
      mode: 'dag',
      revision: 1,
      contentHash: 'a'.repeat(64),
      hasArtifact: true,
      status: { state: 'RUNNING' },
    },
    {
      id: 'customer_360',
      name: 'customer_360',
      mode: 'wizard',
      revision: 2,
      contentHash: 'b'.repeat(64),
      hasArtifact: true,
      status: { state: 'PAUSED' },
    },
    {
      id: 'failed_import',
      name: 'failed_import',
      revision: 4,
      contentHash: 'c'.repeat(64),
      hasArtifact: true,
      status: { state: 'FAILED' },
    },
    {
      id: 'new_import',
      name: 'new_import',
      revision: 1,
      contentHash: 'd'.repeat(64),
      hasArtifact: true,
      status: { state: 'NEW' },
    },
    {
      id: 'offline_import',
      name: 'offline_import',
      revision: 1,
      contentHash: 'e'.repeat(64),
      hasArtifact: true,
      status: { state: 'UNAVAILABLE' },
    },
  ])
  listPipelineDrafts.mockResolvedValue([])
  runPipeline.mockResolvedValue({})
  stopPipeline.mockResolvedValue({})
  getPipelineDraft.mockResolvedValue({ etag: '"3"' })
  deletePipelineDraft.mockResolvedValue(undefined)
  apiFetch.mockResolvedValue({ ok: true })
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
    expect(listPipelineDrafts).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).toBeNull()

    expect(elementWithText('button', 'Create')).toBeDefined()
    expect(
      document
        .querySelector<HTMLAnchorElement>('a[href="/pipelines/orders_to_warehouse/edit"]')
        ?.getAttribute('href'),
    ).toBe('/pipelines/orders_to_warehouse/edit')
    expect(document.querySelector('table')?.className).toContain('pipeline-list__table')
    expect(
      document
        .querySelector<HTMLSpanElement>('a[href="/pipelines/orders_to_warehouse/edit"] span[title]')
        ?.getAttribute('title'),
    ).toBe('orders_to_warehouse')
    expect([...document.querySelectorAll('th')].map((header) => header.textContent)).not.toContain(
      'Actions',
    )
    expect(elementWithText('a', 'Edit')).toBeUndefined()
  })

  it('lists draft-only catalog rows as resumable drafts without lifecycle controls', async () => {
    listPipelines.mockResolvedValueOnce([
      {
        id: 'unfinished_wizard',
        name: 'unfinished_wizard',
        mode: 'wizard',
        revision: 3,
        contentHash: null,
        hasArtifact: false,
        status: { state: 'NEW' },
      },
    ])

    await renderPage()

    const link = await vi.waitFor(() => {
      const candidate = document.querySelector<HTMLAnchorElement>(
        'a[href="/pipelines/unfinished_wizard/edit"]',
      )
      expect(candidate).not.toBeNull()
      return candidate
    })
    const row = link?.closest('tr')
    expect(row?.textContent).toContain('Draft')
    expect(row?.textContent).toContain('r3')
    expect(row?.textContent).not.toContain('Edit')
    expect(row?.querySelectorAll('a[href="/pipelines/unfinished_wizard/edit"]')).toHaveLength(2)
    expect(row?.querySelector('.pipeline-list__lifecycle-menu')).not.toBeNull()
    expect(row?.querySelector('.pipeline-list__actions-hover')).not.toBeNull()
    expect(row?.querySelector('[aria-label="More actions for unfinished_wizard"]')).not.toBeNull()
    expect(row?.querySelector('[aria-label="Start unfinished_wizard"]')).toBeNull()
    expect(row?.querySelector('[aria-label="Stop unfinished_wizard"]')).toBeNull()

    await act(async () => {
      row
        ?.querySelector<HTMLButtonElement>('[aria-label="More actions for unfinished_wizard"]')
        ?.click()
    })
    expect(elementWithText('[role="menuitem"]', 'Edit unfinished_wizard')).toBeDefined()
    expect(elementWithText('[role="menuitem"]', 'Copy pipeline ID')).toBeDefined()
    expect(elementWithText('[role="menuitem"]', 'Delete')).toBeDefined()

    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    await vi.waitFor(() =>
      expect(getPipelineDraft).toHaveBeenCalledWith('unfinished_wizard', apiFetch),
    )
    expect(deletePipelineDraft).toHaveBeenCalledWith('unfinished_wizard', '"3"', apiFetch)
  })

  it('filters the merged catalog and exposes auto-refresh state on the refresh control', async () => {
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    const search = document.querySelector<HTMLInputElement>(
      'input[placeholder="Search pipelines..."]',
    )
    expect(search).not.toBeNull()
    await act(async () => {
      if (!search) return
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        search,
        'customer',
      )
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
    expect(document.querySelector('tbody')?.textContent).toContain('customer_360')

    const refresh = document.querySelector<HTMLButtonElement>(
      '[aria-label="Refresh pipeline list"]',
    )
    expect(refresh?.dataset.autoRefresh).toBe('on')
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Pause automatic pipeline refresh"]')
        ?.click(),
    )
    expect(refresh?.dataset.autoRefresh).toBe('off')
    await act(async () => refresh?.click())
    await vi.waitFor(() => expect(listPipelines).toHaveBeenCalledTimes(2))
  })

  it('shows transitional and unavailable runtime catalog states', async () => {
    listPipelines.mockResolvedValueOnce([
      {
        id: 'orders_to_warehouse',
        name: 'orders_to_warehouse',
        hasArtifact: true,
        contentHash: 'a'.repeat(64),
        status: { state: 'STARTING' },
      },
      {
        id: 'customer_360',
        name: 'customer_360',
        hasArtifact: true,
        contentHash: 'b'.repeat(64),
        status: { state: 'UNAVAILABLE' },
      },
    ])

    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('Starting'))
    expect(container?.textContent).toContain('Unavailable')
    expect(listPipelines).toHaveBeenCalledTimes(1)
  })

  it('keeps lifecycle controls in a compact menu, starts startable Pipelines, and refreshes projections', async () => {
    const queryClient = await renderPage()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await vi.waitFor(() => expect(container?.textContent).toContain('failed_import'))

    const lifecycleTrigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Pipeline lifecycle actions for failed_import"]',
    )
    expect(lifecycleTrigger).not.toBeNull()
    expect(lifecycleTrigger?.className).toContain('pipeline-list__lifecycle-trigger')
    expect(document.querySelector('[aria-label="Start failed_import"]')).toBeNull()
    expect(document.querySelector('[aria-label="Start offline_import"]')).toBeNull()

    await act(async () => lifecycleTrigger?.click())
    expect(elementWithText('[role="menuitem"]', 'Stop')).toBeDefined()
    expect(elementWithText('[role="menuitem"]', 'Copy pipeline ID')).toBeDefined()
    expect(elementWithText('[role="menuitem"]', 'Delete')).toBeDefined()

    await act(async () => document.body.click())
    const startTrigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Pipeline lifecycle actions for new_import"]',
    )
    await act(async () => startTrigger?.click())
    expect(elementWithText('[role="menuitem"]', 'Start')).toBeDefined()
    await act(async () => elementWithText('[role="menuitem"]', 'Start')?.click())

    await vi.waitFor(() =>
      expect(runPipeline).toHaveBeenCalledWith('new_import', expect.anything()),
    )
    await vi.waitFor(() => expect(listPipelines).toHaveBeenCalledTimes(2))
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['pipelines'] })
  })

  it('refreshes a stale lifecycle state and surfaces the server transition reason', async () => {
    runPipeline.mockRejectedValueOnce({
      code: 'lifecycle.illegal-transition',
      params: { from: 'RUNNING', verb: 'start' },
      message: 'Cannot start a pipeline in state RUNNING.',
    })
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('new_import'))

    const lifecycleTrigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Pipeline lifecycle actions for new_import"]',
    )
    await act(async () => lifecycleTrigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Start')?.click())

    await vi.waitFor(() =>
      expect(container?.textContent).toContain('Cannot start a pipeline in state RUNNING.'),
    )
    await vi.waitFor(() => expect(listPipelines).toHaveBeenCalledTimes(2))
    expect(container?.querySelector('td [role="alert"]')).toBeNull()
  })

  it('confirms deletion and sends the current Pipeline content hash as If-Match', async () => {
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('failed_import'))

    const lifecycleTrigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Pipeline lifecycle actions for failed_import"]',
    )
    await act(async () => lifecycleTrigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())

    await vi.waitFor(() => expect(document.body.textContent).toContain('Delete failed_import?'))
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())

    await vi.waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/artifacts/failed_import', {
        method: 'DELETE',
        headers: { 'If-Match': `"${'c'.repeat(64)}"` },
      }),
    )
  })

  it('confirms stop before interrupting a running Pipeline', async () => {
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    const lifecycleTrigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Pipeline lifecycle actions for orders_to_warehouse"]',
    )
    expect(lifecycleTrigger).not.toBeNull()
    await act(async () => lifecycleTrigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Stop')?.click())

    await vi.waitFor(() => expect(document.body.textContent).toContain('Stop orders_to_warehouse?'))
    expect(stopPipeline).not.toHaveBeenCalled()

    expect(elementWithText('button', 'Stop and keep state')).toBeDefined()
    expect(elementWithText('button', 'Stop and clear state')).toBeDefined()
    await act(async () => elementWithText('button', 'Stop and keep state')?.click())
    await vi.waitFor(() =>
      expect(stopPipeline).toHaveBeenCalledWith('orders_to_warehouse', false, expect.anything()),
    )
  })

  it('sends an explicit clear-state choice and closes confirmation before showing a failure', async () => {
    stopPipeline.mockRejectedValueOnce(
      Object.assign(
        new Error('Stopping pipeline p3 did not say whether to clear what it has accumulated.'),
        { code: 'lifecycle.purge-state-not-stated' },
      ),
    )
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Pipeline lifecycle actions for orders_to_warehouse"]',
        )
        ?.click(),
    )
    await act(async () => elementWithText('[role="menuitem"]', 'Stop')?.click())
    await vi.waitFor(() => expect(document.body.textContent).toContain('Stop orders_to_warehouse?'))
    await act(async () => elementWithText('button', 'Stop and clear state')?.click())

    await vi.waitFor(() =>
      expect(stopPipeline).toHaveBeenCalledWith('orders_to_warehouse', true, expect.anything()),
    )
    await vi.waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Stopping pipeline p3 did not say whether to clear',
      )
    })
  })

  it('shows lifecycle request failures in a fixed feedback surface', async () => {
    runPipeline.mockRejectedValueOnce(new Error('offline'))
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('new_import'))

    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Pipeline lifecycle actions for new_import"]',
        )
        ?.click(),
    )
    await act(async () => elementWithText('[role="menuitem"]', 'Start')?.click())

    await vi.waitFor(() =>
      expect(container?.textContent).toContain('Pipeline could not be started.'),
    )
    const alert = container?.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.className).toContain('pipeline-mutation-feedback')
    expect(alert?.className).toContain('fixed')
    expect(container?.querySelector('td [role="alert"]')).toBeNull()
    expect(container?.querySelector('.pipeline-list__lifecycle-error')).toBeNull()
  })

  it('opens creation in a controlled full-screen dialog without changing the list route', async () => {
    await renderPage()
    const initialPath = window.location.pathname

    const createButton = elementWithText('button', 'Create')
    expect(createButton).toBeDefined()

    await act(async () => createButton?.click())

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="pipeline-creation-dialog"]')).not.toBeNull()
    })
    expect(document.body.textContent).toContain('Create a pipeline')
    expect(window.location.pathname).toBe(initialPath)

    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Close create pipeline"]',
    )
    expect(closeButton).not.toBeNull()
    await act(async () => closeButton?.click())
    expect(document.querySelector('[data-testid="pipeline-creation-dialog"]')).toBeNull()
  })

  it('omits the Explorer while keeping the Pipeline table as the editor entry point', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))
    expect(container?.textContent).not.toContain('Explorer')
    expect(container?.querySelector('a[href="/pipelines/orders_to_warehouse/edit"]')).not.toBeNull()
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
