import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n/index'

const {
  apiFetch,
  createPipelineDraft,
  deletePipelineDraft,
  getPipelineDraft,
  getPipelineStatus,
  getStartChecks,
  listPipelines,
  listPipelineArtifacts,
  listPipelineDrafts,
  listSources,
  listViews,
  navigate,
  runPipeline,
  stopPipeline,
} = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  createPipelineDraft: vi.fn(),
  deletePipelineDraft: vi.fn(),
  getPipelineDraft: vi.fn(),
  getPipelineStatus: vi.fn(),
  getStartChecks: vi.fn(),
  listPipelines: vi.fn(),
  listPipelineArtifacts: vi.fn(),
  listPipelineDrafts: vi.fn(),
  listSources: vi.fn(),
  listViews: vi.fn(),
  navigate: vi.fn(),
  runPipeline: vi.fn(),
  stopPipeline: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
  useSearch: () => ({}),
}))

vi.mock('@/service/source-client', () => ({ listSources }))
vi.mock('@/service/view-client', () => ({ listViews }))
vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  createPipelineDraft,
  deletePipelineDraft,
  getPipelineDraft,
  getPipelineStatus,
  getStartChecks,
  listPipelineDrafts,
  listPipelineArtifacts,
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

import type { StartCheckReport } from '@/service/pipelines/pipeline-client'

import fixture from '../start-checks/__fixtures__/client-fixture-v1.json'
import { PipelinesPage } from './pipelines-page'

const answerable: StartCheckReport = fixture.answerable
const leadFinding = 'target-not-empty/views/lead'
const driftFinding = 'derived-schema-drift/join_orders'

/** The error a start stopped by its start checks rejects with, as the Pipeline client builds it. */
function startRefusal(report: StartCheckReport) {
  return Object.assign(new Error('Starting new_import needs an answer to 2 questions.'), {
    kind: 'server',
    status: 409,
    code: 'lifecycle.start-needs-confirmation',
    params: { pipeline: 'new_import', count: 2 },
    startChecks: report,
    decisionsApplied: [],
  })
}

function startChecksDialog() {
  return document.querySelector<HTMLElement>('[data-testid="start-checks-dialog"]')
}

function dialogButton(text: string) {
  return [...(startChecksDialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

function answerRadio(finding: string, action: string) {
  return startChecksDialog()?.querySelector<HTMLElement>(
    `[data-check-item="${finding}"] [data-check-choice="${action}"] [role="radio"]`,
  )
}

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

beforeEach(async () => {
  await i18n.changeLanguage('en')
  listSources.mockResolvedValue([{ id: 'orders' }])
  listViews.mockResolvedValue({ available: false })
  listPipelineArtifacts.mockResolvedValue([])
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
  apiFetch.mockResolvedValue(new Response(null, { status: 204 }))
  createPipelineDraft.mockResolvedValue(undefined)
  navigate.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
})

describe('PipelinesPage', () => {
  it('lists stored Pipeline artifacts and makes each resource name the standalone editor entry', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))

    expect(container?.querySelector('h1')?.textContent).toBe('Pipelines')
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
        .querySelector<HTMLAnchorElement>('a[href="/pipelines/orders_to_warehouse"]')
        ?.getAttribute('href'),
    ).toBe('/pipelines/orders_to_warehouse')
    expect(document.querySelector('table')?.className).toContain('pipeline-list__table')
    expect(
      document
        .querySelector<HTMLSpanElement>('a[href="/pipelines/orders_to_warehouse"] span[title]')
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
      expect(apiFetch).toHaveBeenCalledWith('/api/pipelines/failed_import', {
        method: 'DELETE',
        headers: { 'If-Match': `"${'c'.repeat(64)}"`, 'If-Draft-Match': '"4"' },
      }),
    )
  })

  it('keeps a coded delete refusal in the padded dialog body and asks before stopping', async () => {
    apiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'artifact.pipeline-not-stopped',
          params: { actual: 'FAILED', desired: 'RUNNING' },
        }),
        { status: 409 },
      ),
    )
    await renderPage()
    const trigger = await vi.waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for failed_import"]',
      )
      expect(button).not.toBeNull()
      return button
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    const alert = await vi.waitFor(() => {
      const value = document.querySelector('[role="alert"]')
      expect(value?.textContent).toContain('FAILED')
      expect(value?.textContent).toContain('RUNNING')
      return value
    })
    expect(alert?.closest('[data-slot="dialog-body"]')).not.toBeNull()
    for (const [locale, detail] of [
      ['en', 'Stop it and wait for it to settle before deleting it.'],
      ['zh-CN', '请先停止，等待状态稳定后再删除。'],
      ['zh-TW', '請先停止，等待狀態穩定後再刪除。'],
    ] as const) {
      await act(async () => i18n.changeLanguage(locale))
      await vi.waitFor(() => expect(alert?.textContent).toContain(detail))
    }
    await act(async () => i18n.changeLanguage('en'))
    expect(stopPipeline).not.toHaveBeenCalled()
    await act(async () => elementWithText('button', 'Stop Pipeline')?.click())
    await vi.waitFor(() =>
      expect(stopPipeline).toHaveBeenCalledWith('failed_import', false, apiFetch),
    )
    expect(document.body.textContent).toContain('Delete failed_import?')
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('keeps deletion open when stopping removes the row from a status search', async () => {
    const row = {
      id: 'filtered',
      name: 'filtered',
      revision: 4,
      contentHash: 'c'.repeat(64),
      hasArtifact: true,
      status: { state: 'RUNNING' },
    }
    listPipelines.mockResolvedValue([row])
    apiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'artifact.pipeline-not-stopped',
          params: { actual: 'RUNNING', desired: 'RUNNING' },
        }),
        { status: 409 },
      ),
    )
    stopPipeline.mockImplementationOnce(async () => {
      listPipelines.mockResolvedValue([{ ...row, status: { state: 'STOPPED' } }])
    })
    await renderPage()
    const search = document.querySelector<HTMLInputElement>('input[placeholder]')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(search, 'RUNNING')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const trigger = await vi.waitFor(() => {
      const value = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for filtered"]',
      )
      expect(value).not.toBeNull()
      return value
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    await vi.waitFor(() => expect(elementWithText('button', 'Stop Pipeline')).toBeDefined())
    await act(async () => elementWithText('button', 'Stop Pipeline')?.click())
    await vi.waitFor(() => expect(document.body.textContent).toContain('Delete filtered?'))
    await vi.waitFor(() =>
      expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).toBeNull(),
    )
    expect(document.querySelector('tbody tr')).toBeNull()
  })

  it.each([
    {
      code: 'artifact.in-use',
      params: { referrers: ['downstream_orders'] },
      detail: 'still referenced by: downstream_orders',
    },
    {
      code: 'artifact.version-conflict',
      params: { id: 'failed_import' },
      detail: 'changed since it was loaded',
    },
  ])('shows the $code delete refusal in the dialog', async ({ code, params, detail }) => {
    apiFetch.mockResolvedValueOnce(new Response(JSON.stringify({ code, params }), { status: 409 }))
    await renderPage()
    const trigger = await vi.waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for failed_import"]',
      )
      expect(button).not.toBeNull()
      return button
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())

    const alert = await vi.waitFor(() => {
      const value = document.querySelector('[role="alert"]')
      expect(value?.textContent).toContain(detail)
      return value
    })
    expect(alert?.closest('[data-slot="dialog-body"]')).not.toBeNull()
    expect(elementWithText('button', 'Cancel')).toBeDefined()
  })

  it('explains an in-flight stop without asking to stop the Pipeline again', async () => {
    apiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'artifact.pipeline-not-stopped',
          params: { actual: 'RUNNING', desired: 'STOPPED' },
        }),
        { status: 409 },
      ),
    )
    await renderPage()
    const trigger = await vi.waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for failed_import"]',
      )
      expect(button).not.toBeNull()
      return button
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Stopping is already requested.',
      ),
    )
    expect(elementWithText('button', 'Stop Pipeline')).toBeUndefined()
    expect(stopPipeline).not.toHaveBeenCalled()
  })

  it('keeps incomplete cleanup diagnostics after the removed catalog row unmounts', async () => {
    apiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'artifact.reclaim-incomplete',
          params: { reason: 'unknown-commit', residue: ['draft:failed_import', 'state:unknown'] },
          message: 'The artifact removal stands; cleanup is uncertain.',
        }),
        { status: 500 },
      ),
    )
    listPipelines
      .mockResolvedValueOnce([
        {
          id: 'failed_import',
          name: 'failed_import',
          revision: 4,
          contentHash: 'c'.repeat(64),
          hasArtifact: true,
          status: { state: 'STOPPED' },
        },
      ])
      .mockResolvedValue([])
    await renderPage()
    const trigger = await vi.waitFor(() => {
      const value = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for failed_import"]',
      )
      expect(value).not.toBeNull()
      return value
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    await vi.waitFor(() => expect(document.querySelector('tbody tr')).toBeNull())
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('unknown-commit')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('draft:failed_import')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('state:unknown')
    expect(elementWithText('button', 'Delete Pipeline')).toBeUndefined()
    expect(elementWithText('button', 'Dismiss')).toBeDefined()
  })

  it('waits for authoritative STOPPED after returning from the explicit stop confirmation', async () => {
    const row = {
      id: 'failed_import',
      name: 'failed_import',
      revision: 4,
      contentHash: 'c'.repeat(64),
      hasArtifact: true,
      status: { state: 'FAILED' },
    }
    listPipelines.mockResolvedValue([row])
    apiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'artifact.pipeline-not-stopped',
          params: { actual: 'FAILED', desired: 'RUNNING' },
        }),
        { status: 409 },
      ),
    )
    stopPipeline.mockImplementationOnce(async () => {
      listPipelines.mockResolvedValue([{ ...row, status: { state: 'STOPPING' } }])
    })
    const queryClient = await renderPage()
    const trigger = await vi.waitFor(() => {
      const value = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for failed_import"]',
      )
      expect(value).not.toBeNull()
      return value
    })
    await act(async () => trigger?.click())
    await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
    await act(async () => elementWithText('button', 'Delete Pipeline')?.click())
    await act(async () => elementWithText('button', 'Stop Pipeline')?.click())
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Stopping is already requested.'),
    )
    expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).not.toBeNull()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    listPipelines.mockResolvedValue([{ ...row, status: { state: 'STOPPED' } }])
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    })
    await vi.waitFor(() =>
      expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).toBeNull(),
    )
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('polls an open STOPPING delete dialog with global refresh paused and stops polling on close', async () => {
    const row = {
      id: 'stopping_import',
      name: 'stopping_import',
      revision: 4,
      contentHash: 'c'.repeat(64),
      hasArtifact: true,
      status: { state: 'STOPPING' },
    }
    listPipelines.mockResolvedValue([row])
    getPipelineStatus.mockResolvedValue({ pipelineId: row.id, state: 'STOPPING' })
    await renderPage()
    const trigger = await vi.waitFor(() => {
      const value = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for stopping_import"]',
      )
      expect(value).not.toBeNull()
      return value
    })
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Pause automatic pipeline refresh"]')
        ?.click(),
    )
    await act(async () => trigger?.click())
    vi.useFakeTimers()
    try {
      await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
      expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).not.toBeNull()
      const calls = getPipelineStatus.mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000)
      })
      expect(getPipelineStatus).toHaveBeenCalledTimes(calls + 1)
      expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).not.toBeNull()
      await act(async () => elementWithText('button', 'Cancel')?.click())
      const closedCalls = getPipelineStatus.mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(getPipelineStatus).toHaveBeenCalledTimes(closedCalls)
      await act(async () => trigger?.click())
      await act(async () => elementWithText('[role="menuitem"]', 'Delete')?.click())
      listPipelines.mockResolvedValue([{ ...row, status: { state: 'STOPPED' } }])
      getPipelineStatus.mockResolvedValue({ pipelineId: row.id, state: 'STOPPED' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(elementWithText('button', 'Delete Pipeline')?.getAttribute('disabled')).toBeNull()
      const stoppedCalls = getPipelineStatus.mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(getPipelineStatus).toHaveBeenCalledTimes(stoppedCalls)
      expect(apiFetch).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
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

  it.each(['STOPPED', 'COMPLETED'] as const)(
    'keeps Start and offers an explicit clearing confirmation for a %s Pipeline',
    async (state) => {
      listPipelines.mockResolvedValue([
        {
          id: 'retained_import',
          name: 'retained_import',
          contentHash: 'f'.repeat(64),
          hasArtifact: true,
          status: { state },
        },
      ])
      await renderPage()
      await vi.waitFor(() => expect(container?.textContent).toContain('retained_import'))
      const trigger = document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for retained_import"]',
      )
      await act(async () => trigger?.click())
      expect(elementWithText('[role="menuitem"]', 'Start')).toBeDefined()
      expect(elementWithText('[role="menuitem"]', 'Clear all state')).toBeDefined()
      await act(async () => elementWithText('[role="menuitem"]', 'Clear all state')?.click())
      await vi.waitFor(() =>
        expect(document.body.textContent).toContain('Clear state for retained_import?'),
      )
      expect(stopPipeline).not.toHaveBeenCalled()
      expect(runPipeline).not.toHaveBeenCalled()
      expect(elementWithText('button', 'Stop and keep state')).toBeUndefined()
      await act(async () => elementWithText('button', 'Clear all state')?.click())
      await vi.waitFor(() =>
        expect(stopPipeline).toHaveBeenCalledWith('retained_import', true, expect.anything()),
      )
      expect(runPipeline).not.toHaveBeenCalled()
    },
  )

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
    expect(document.activeElement).toBe(
      document.querySelector(
        '[data-testid="pipeline-creation-dialog"] input[aria-label="Pipeline ID"]',
      ),
    )
    expect(window.location.pathname).toBe(initialPath)

    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Close create pipeline"]',
    )
    expect(closeButton).not.toBeNull()
    await act(async () => closeButton?.click())
    expect(document.querySelector('[data-testid="pipeline-creation-dialog"]')).toBeNull()
  })

  it('offers only supported builders and creates a pipeline with either selected mode', async () => {
    await renderPage()

    const openCreation = async () => {
      await act(async () => elementWithText('button', 'Create')?.click())
      await vi.waitFor(() =>
        expect(document.querySelector('[data-testid="pipeline-creation-dialog"]')).not.toBeNull(),
      )
      return document.querySelector<HTMLElement>('[data-testid="pipeline-creation-dialog"]')!
    }
    const setPipelineId = async (dialog: HTMLElement, value: string) => {
      const input = dialog.querySelector<HTMLInputElement>(
        'input[aria-describedby="pipeline-create-id-hint"]',
      )
      expect(input).not.toBeNull()
      await act(async () => {
        if (!input) return
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          input,
          value,
        )
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      return input
    }
    const submit = (dialog: HTMLElement) =>
      dialog.querySelector<HTMLButtonElement>('.pipeline-create-dialog__submit')

    const wizardDialog = await openCreation()
    const modeButtons = [
      ...wizardDialog.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'),
    ]
    expect(modeButtons).toHaveLength(2)
    expect(wizardDialog.textContent).not.toContain('DuckDB SQL')
    expect(wizardDialog.textContent).not.toContain('Build with AI')

    const dagOption = modeButtons.find((button) =>
      button.textContent?.includes('Build with DAG Designer'),
    )
    const wizardOption = modeButtons.find((button) =>
      button.textContent?.includes('Pipeline builder'),
    )
    expect(wizardOption?.getAttribute('aria-pressed')).toBe('true')
    await act(async () => dagOption?.click())
    expect(wizardOption?.getAttribute('aria-pressed')).toBe('false')
    expect(dagOption?.getAttribute('aria-pressed')).toBe('true')
    await act(async () => wizardOption?.click())
    expect(wizardOption?.getAttribute('aria-pressed')).toBe('true')
    expect(dagOption?.getAttribute('aria-pressed')).toBe('false')

    const invalidId = await setPipelineId(wizardDialog, 'invalid id')
    expect(invalidId?.getAttribute('aria-invalid')).toBe('true')
    expect(submit(wizardDialog)?.disabled).toBe(true)
    expect(createPipelineDraft).not.toHaveBeenCalled()

    await setPipelineId(wizardDialog, 'wizard_pipeline')
    expect(submit(wizardDialog)?.disabled).toBe(false)
    await act(async () => submit(wizardDialog)?.click())
    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(1))
    expect(createPipelineDraft.mock.calls[0]?.[0]).toBe('wizard_pipeline')
    expect(createPipelineDraft.mock.calls[0]?.[1]).toMatchObject({
      mode: 'wizard',
      graph: null,
      wizard: { root: { id: 'root' } },
    })
    expect(navigate).toHaveBeenCalledWith({
      to: '/pipelines/$pipelineId/edit',
      params: { pipelineId: 'wizard_pipeline' },
    })
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-creation-dialog"]')).toBeNull(),
    )

    const dagDialog = await openCreation()
    const dagModeOption = [
      ...dagDialog.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'),
    ].find((button) => button.textContent?.includes('Build with DAG Designer'))
    await act(async () => dagModeOption?.click())
    await act(async () => dagModeOption?.click())
    expect(dagModeOption?.getAttribute('aria-pressed')).toBe('true')
    await setPipelineId(dagDialog, 'dag_pipeline')
    await act(async () => submit(dagDialog)?.click())

    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(2))
    expect(createPipelineDraft.mock.calls[1]?.[0]).toBe('dag_pipeline')
    expect(createPipelineDraft.mock.calls[1]?.[1]).toMatchObject({
      mode: 'dag',
      graph: { nodes: [], edges: [] },
      wizard: null,
    })
    expect(navigate).toHaveBeenLastCalledWith({
      to: '/pipelines/$pipelineId/edit',
      params: { pipelineId: 'dag_pipeline' },
    })
  })

  it('omits the Explorer while keeping the Pipeline table as the read-only detail entry point', async () => {
    await renderPage()

    await vi.waitFor(() => expect(container?.textContent).toContain('orders_to_warehouse'))
    expect(container?.textContent).not.toContain('Explorer')
    expect(container?.querySelector('a[href="/pipelines/orders_to_warehouse"]')).not.toBeNull()
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
      expect(container?.textContent).toContain(
        'No pipelines yet. Create one to start moving data.',
      ),
    )
  })

  it.each([
    ['COMPLETE', 'Close', 'menu'],
    ['UNAVAILABLE', 'Escape', 'more'],
    ['UNAVAILABLE', 'Close', 'direct'],
  ])(
    'clears the pending list action after closing a refused %s start with %s',
    async (evaluation, dismissal, entry) => {
      runPipeline.mockRejectedValueOnce(
        startRefusal({
          ...answerable,
          outcome: 'BLOCKED',
          findings: [{ ...answerable.findings[0]!, behavior: 'BLOCK', evaluation, actions: [] }],
        }),
      )
      const queryClient = await renderPage()
      const trigger = () =>
        document.querySelector<HTMLButtonElement>(
          `[aria-label="${entry === 'direct' ? 'Start pipeline new_import' : entry === 'more' ? 'More actions for new_import' : 'Pipeline lifecycle actions for new_import'}"]`,
        )
      await vi.waitFor(() => expect(trigger()).not.toBeNull())
      await act(async () => trigger()?.click())
      if (entry !== 'direct') {
        await act(async () => elementWithText('[role="menuitem"]', 'Start')?.click())
      }
      await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
      vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => new Promise(() => {}))
      expect(dialogButton('Close')).toBeDefined()
      if (entry === 'direct') {
        await act(async () => trigger()?.click())
        expect(runPipeline).toHaveBeenCalledOnce()
      }
      await act(async () => {
        if (dismissal === 'Close') dialogButton('Close')?.click()
        else
          startChecksDialog()?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
          )
      })
      await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
      await vi.waitFor(() => expect(trigger()?.disabled).toBe(false))
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(
          entry === 'direct'
            ? trigger()
            : document.querySelector('[aria-label="More actions for new_import"]'),
        ),
      )
      expect(runPipeline).toHaveBeenCalledOnce()
    },
  )

  it('asks start checks in the shared dialog and re-sends the answers with the report hash', async () => {
    const warning = answerable.findings.find(({ behavior }) => behavior === 'WARN')!
    runPipeline.mockRejectedValueOnce(startRefusal(answerable)).mockResolvedValueOnce({
      pipelineId: 'new_import',
      startChecks: { ...answerable, outcome: 'READY', findings: [warning] },
      decisionsApplied: [
        {
          finding: leadFinding,
          action: 'clear',
          kind: 'CHANGE_DEFINITION',
          changes: [{ element: 'lead', field: 'on_full_load', from: 'append', to: 'clear' }],
          contentHash: 'e'.repeat(64),
        },
        { finding: driftFinding, action: 'accept', kind: 'RUN_OPERATION', changes: [] },
      ],
      staleDecisions: [],
    })
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

    await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
    expect(startChecksDialog()?.getAttribute('role')).toBe('alertdialog')
    expect(runPipeline).toHaveBeenCalledTimes(1)
    expect(runPipeline).toHaveBeenLastCalledWith('new_import', apiFetch)
    expect(startChecksDialog()?.textContent).toContain(answerable.findings[0]!.message)
    expect(dialogButton('Start')?.disabled).toBe(true)

    await act(async () => answerRadio(leadFinding, 'clear')?.click())
    expect(
      startChecksDialog()?.querySelector(
        `[data-check-item="${leadFinding}"] [data-check-choice="clear"] [data-check-choice-preview]`,
      )?.textContent,
    ).toContain('lead: on_full_load append → clear')
    expect(dialogButton('Start')?.disabled).toBe(true)
    await act(async () => answerRadio(driftFinding, 'accept')?.click())
    expect(dialogButton('Start')?.disabled).toBe(false)
    await act(async () => dialogButton('Start')?.click())

    await vi.waitFor(() => expect(runPipeline).toHaveBeenCalledTimes(2))
    expect(runPipeline).toHaveBeenLastCalledWith('new_import', apiFetch, {
      decisions: [
        { finding: leadFinding, action: 'clear' },
        { finding: driftFinding, action: 'accept' },
      ],
      ifMatch: `"${answerable.contentHash}"`,
    })
    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())

    const notice = document.querySelector<HTMLElement>('[data-testid="pipeline-start-notice"]')
    expect(notice?.getAttribute('role')).toBe('status')
    expect(notice?.textContent).toContain('new_import started with warnings')
    expect(notice?.textContent).toContain(warning.message)
    expect(notice?.textContent).toContain('lead: on_full_load append → clear')
    expect(container?.querySelector('td [data-testid="pipeline-start-notice"]')).toBeNull()

    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))
    expect(document.querySelector('[data-testid="pipeline-start-notice"]')).not.toBeNull()
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Dismiss start notice for new_import"]')
        ?.click(),
    )
    expect(document.querySelector('[data-testid="pipeline-start-notice"]')).toBeNull()
  })

  it('re-reads the start checks after a version conflict and lists the answers no longer asked', async () => {
    const fresh: StartCheckReport = {
      ...answerable,
      contentHash: 'd'.repeat(64),
      findings: answerable.findings.filter(({ key }) => key !== driftFinding),
    }
    runPipeline
      .mockRejectedValueOnce(startRefusal(answerable))
      .mockRejectedValueOnce(
        Object.assign(new Error('Pipeline new_import changed.'), {
          status: 412,
          code: 'pipeline.version-conflict',
          params: { id: 'new_import' },
          startChecks: null,
          decisionsApplied: [],
        }),
      )
      .mockResolvedValueOnce({ pipelineId: 'new_import' })
    getStartChecks.mockResolvedValueOnce(fresh)
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
    await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
    await act(async () => answerRadio(leadFinding, 'keep')?.click())
    await act(async () => answerRadio(driftFinding, 'accept')?.click())
    await act(async () => dialogButton('Start')?.click())

    await vi.waitFor(() =>
      expect(getStartChecks).toHaveBeenCalledWith('new_import', 'start', apiFetch),
    )
    await vi.waitFor(() =>
      expect(
        startChecksDialog()?.querySelector('[data-start-checks-changed]')?.textContent,
      ).toContain('new_import changed while you were confirming.'),
    )
    expect(startChecksDialog()?.querySelector('[data-start-checks-stale]')?.textContent).toContain(
      `${driftFinding} → accept`,
    )
    expect(startChecksDialog()?.querySelector(`[data-check-item="${driftFinding}"]`)).toBeNull()
    expect(answerRadio(leadFinding, 'keep')?.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('[role="alert"].pipeline-mutation-feedback')).toBeNull()

    await act(async () => dialogButton('Start')?.click())
    await vi.waitFor(() => expect(runPipeline).toHaveBeenCalledTimes(3))
    expect(runPipeline).toHaveBeenLastCalledWith('new_import', apiFetch, {
      decisions: [{ finding: leadFinding, action: 'keep' }],
      ifMatch: `"${fresh.contentHash}"`,
    })
    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
  })

  it('cancels a start from the start-check dialog without reporting a failure', async () => {
    runPipeline.mockRejectedValueOnce(startRefusal(answerable))
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
    await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
    await act(async () => dialogButton('Cancel')?.click())

    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
    expect(runPipeline).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.pipeline-mutation-feedback')).toBeNull()
    expect(
      document.querySelector<HTMLButtonElement>(
        '[aria-label="Pipeline lifecycle actions for new_import"]',
      )?.disabled,
    ).toBe(false)
  })
})
