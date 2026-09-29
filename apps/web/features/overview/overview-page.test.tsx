import '@/i18n/index'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'

const { apiFetch, listPipelines, listSources, listViews } = vi.hoisted(() => ({
  listViews: vi.fn(),
  apiFetch: vi.fn(),
  listPipelines: vi.fn(),
  listSources: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources,
}))
vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  listPipelines,
}))
vi.mock('@/service/view-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/view-client')>()),
  listViews,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

import { OverviewPage, type SourceFormSlot } from './overview-page'

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

function pipeline(id: string, state: 'RUNNING' | 'FAILED' | 'STOPPED'): PipelineView {
  return {
    id,
    dag: { nodes: [], edges: [] },
    contentHash: `hash-${id}`,
    status: {
      pipelineId: id,
      state,
      failure: state === 'FAILED' ? { code: 'runtime.failed', params: {} } : null,
    },
  }
}

let container: HTMLDivElement
let root: Root

async function render(sourceForm?: SourceFormSlot) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <OverviewPage sourceForm={sourceForm} />
      </QueryClientProvider>,
    )
  })
}

function buttonNamed(name: string, scope: ParentNode = document.body) {
  return [...scope.querySelectorAll('button')].find((button) => button.textContent === name)
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  listSources.mockReset()
  listPipelines.mockReset()
  listViews.mockReset().mockResolvedValue({ available: false })
  // jsdom here has no storage; a small in-memory one stands in for the browser's.
  const entries = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    },
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('OverviewPage', () => {
  it('shows a loading state until both lists arrive', async () => {
    listSources.mockReturnValue(new Promise(() => undefined))
    listPipelines.mockResolvedValue([])

    await render()

    expect(container.textContent).toContain('Loading the overview')
  })

  it('offers a retry when a list cannot be loaded', async () => {
    listSources.mockRejectedValue(new Error('down'))
    listPipelines.mockResolvedValue([])

    await render()
    await settle()

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'The overview could not be loaded',
    )
    expect(container.textContent).toContain('Retry')
  })

  it('points a new workspace at its first open step', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb')])
    listPipelines.mockResolvedValue([])

    await render()
    await settle()

    expect(container.textContent).toContain('Setup 1 of 3')
    expect(container.querySelector('[aria-current="step"]')?.getAttribute('aria-label')).toBe(
      'Sources',
    )
    expect(container.textContent).toContain('Step 2 of 3')
    expect(container.textContent).toContain('Add the databases you build from')
    expect(container.textContent).toContain('No sources yet.')
    expect(container.textContent).toContain('No pipeline yet.')
  })

  it('moves on when the user puts the pipeline step off, without marking it done', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb'), source('orders')])
    listPipelines.mockResolvedValue([])

    await render()
    await settle()
    const later = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes("Skip, I'll do it later"),
    )
    await act(async () => later?.click())

    expect(container.querySelector('[aria-current="step"]')).toBeNull()
    expect(container.textContent).toContain('Setup 2 of 3')
  })

  it('shows counts, failures and no setup guidance once setup is complete', async () => {
    listSources.mockResolvedValue([
      source('views', 'mongodb'),
      source('orders'),
      source('crm', 'oracle'),
    ])
    listPipelines.mockResolvedValue([pipeline('a_sync', 'RUNNING'), pipeline('b_sync', 'FAILED')])

    await render()
    await settle()

    expect(container.querySelector('.overview-page__chip')).toBeNull()
    expect(container.textContent).toContain('2 sources')
    expect(container.textContent).toContain('2 pipelines')
    const failed = container.querySelector('.overview-attention__item')
    expect(failed?.textContent).toContain('Failed pipeline')
    expect(failed?.textContent).toContain('b_sync')
    expect(container.textContent).toContain('Tapstate state store')
    expect(container.querySelector('.overview-block__step')).toBeNull()
  })

  it('adds sources in a dialog on Overview and lists each one as it lands', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb')])
    listPipelines.mockResolvedValue([])
    const sourceForm: SourceFormSlot = ({ open, onOpenChange, onCreated }) =>
      open ? (
        <button
          type="button"
          onClick={() => {
            onCreated(source('orders'))
            onOpenChange(false)
          }}
        >
          Save source
        </button>
      ) : null

    await render(sourceForm)
    await settle()
    await act(async () => buttonNamed('Add data sources', container)?.click())
    await settle()

    expect(document.body.textContent).toContain('Connect your own database')
    await act(async () => buttonNamed('Connect a database')?.click())
    await settle()
    expect(document.body.textContent).not.toContain('Connect your own database')

    await act(async () => buttonNamed('Save source')?.click())
    await settle()

    expect(document.body.textContent).toContain('Your source (1)')
    expect(document.body.textContent).toContain('orders')
    expect(container.textContent).toContain('1 source')
  })

  it('shows the setup complete note once per browser', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb'), source('orders')])
    listPipelines.mockResolvedValue([pipeline('a_sync', 'RUNNING')])

    await render()
    await settle()
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Setup complete.')

    act(() => root.unmount())
    root = createRoot(container)
    await render()
    await settle()
    expect(container.textContent).not.toContain('Setup complete.')
  })

  it('lists a stale view under Needs attention and counts views in the store block', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb'), source('orders')])
    listPipelines.mockResolvedValue([pipeline('b_sync', 'STOPPED')])
    listViews.mockResolvedValue({
      available: true,
      views: [
        {
          id: 'views/loans',
          kind: 'replica',
          location: { storeId: 'views', database: null, collection: 'loans' },
          pipelineId: 'b_sync',
          status: { state: 'stale', staleSeconds: 720 },
          documents: 10,
          sizeBytes: null,
          lastAppliedAt: Date.now() - 12 * 60000,
        },
      ],
    })

    await render()
    await settle()

    const row = container.querySelector('.overview-attention__item')
    expect(row?.textContent).toContain('Stale view')
    expect(row?.textContent).toContain('loans')
    expect(row?.textContent).toContain(
      'last change applied 12 min ago; its pipeline b_sync is stopped',
    )
    expect(row?.querySelector('a')?.getAttribute('href')).toBe('/views/$viewId')
    expect(container.textContent).toContain('1 view')
  })
})
