import '@/i18n/index'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PipelineCatalogItem } from '@/service/pipelines/pipeline-client'
import type { SampleInstallStatus } from '@/service/sample-source-client'
import type { SourceView } from '@/service/source-client'

const {
  startSampleInstall,
  apiFetch,
  createPipelineDraft,
  getSourceSchema,
  getSampleInstallStatus,
  listConnectors,
  listPipelines,
  listSources,
  listViews,
  loadSampleSources,
  navigate,
} = vi.hoisted(() => ({
  startSampleInstall: vi.fn(),
  createPipelineDraft: vi.fn(),
  getSourceSchema: vi.fn(),
  getSampleInstallStatus: vi.fn(),
  loadSampleSources: vi.fn(),
  listViews: vi.fn(),
  apiFetch: vi.fn(),
  listConnectors: vi.fn(),
  listPipelines: vi.fn(),
  listSources: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getSourceSchema,
  listConnectors,
  listSources,
}))
vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  createPipelineDraft,
  listPipelines,
}))
vi.mock('@/service/sample-source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/sample-source-client')>()),
  startSampleInstall,
  getSampleInstallStatus,
  loadSampleSources,
}))
vi.mock('@/service/view-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/view-client')>()),
  listViews,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))
vi.mock('@/features/pipelines/components/create/pipeline-creation-dialog', () => ({
  PipelineCreationDialog: ({ defaultMode }: { defaultMode?: string }) => (
    <div data-testid="pipeline-creation-dialog" data-default-mode={defaultMode} />
  ),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
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

function pipeline(id: string, state: 'RUNNING' | 'FAILED' | 'STOPPED'): PipelineCatalogItem {
  return {
    id,
    name: id,
    hasArtifact: true,
    status: {
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
  return [...scope.querySelectorAll('button')].find(
    (button) => button.textContent === name || button.getAttribute('aria-label') === name,
  )
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
  listConnectors.mockReset().mockResolvedValue([])
  listViews.mockReset().mockResolvedValue({ available: false })
  loadSampleSources.mockReset().mockResolvedValue(null)
  startSampleInstall.mockReset()
  getSampleInstallStatus.mockReset()
  createPipelineDraft.mockReset().mockResolvedValue({})
  getSourceSchema.mockReset()
  navigate.mockReset().mockResolvedValue(undefined)
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
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
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

  it('renders the source-to-pipeline topology and setup dock from live records', async () => {
    listSources.mockResolvedValue([
      source('views', 'mongodb'),
      source('core_banking', 'mysql'),
      source('cards', 'postgres'),
    ])
    listPipelines.mockResolvedValue([])

    await render()
    await settle()

    expect(container.textContent).toContain(
      'Data flows from your sources, through pipelines, into the state store.',
    )
    expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(3)
    expect(container.querySelectorAll('path.overview-flow-motion')).toHaveLength(6)
    expect(container.querySelectorAll('circle.overview-flow-motion')).toHaveLength(3)
    expect(container.querySelector('path.overview-flow-motion')?.getAttribute('style')).toContain(
      'pipeline-stage-flow 1.8s linear infinite',
    )
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
      'Build Pipeline',
    )
    expect(container.textContent).toContain('No pipeline yet.')
  })

  it('switches the copied laser paths with the selected source and reports running state', async () => {
    listSources.mockResolvedValue([
      source('views', 'mongodb'),
      source('core_banking', 'mysql'),
      source('cards', 'postgres'),
    ])
    listPipelines.mockResolvedValue([pipeline('bank_sync', 'RUNNING')])

    await render()
    await settle()
    const sourceButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="PostgreSQL"]',
    )
    await act(async () => sourceButton?.click())

    expect(
      container.querySelector('button[aria-label="PostgreSQL"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(container.querySelectorAll('path.overview-flow-motion')).toHaveLength(6)
    expect(
      container
        .querySelector('path.overview-flow-motion[stroke="url(#selectedSourceBeam)"]')
        ?.getAttribute('d'),
    ).toBe('M0 116H34C48 116 62 122 72 133L79 141C89 152 103 165 118 165H178')
    expect(container.textContent).toContain('1 pipeline streaming')
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
    expect(container.textContent).toContain('2 connected sources')
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

    expect(document.body.textContent).toContain('Or connect a source')
    await act(async () => buttonNamed('Connect a source')?.click())
    await settle()
    expect(document.body.textContent).not.toContain('Or connect a source')

    await act(async () => buttonNamed('Save source')?.click())
    await settle()

    expect(container.textContent).toContain('1 connected source')
  })

  it('shows the next-pipeline action when setup is complete', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb'), source('orders')])
    listPipelines.mockResolvedValue([pipeline('a_sync', 'RUNNING')])

    await render()
    await settle()
    expect(buttonNamed('New Pipeline', container)).toBeTruthy()
  })

  it('opens pipeline creation in wizard mode from the guided build action', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb'), source('orders')])
    listPipelines.mockResolvedValue([])

    await render()
    await settle()
    await act(async () => buttonNamed('Build Pipeline', container)?.click())

    expect(
      container
        .querySelector('[data-testid="pipeline-creation-dialog"]')
        ?.getAttribute('data-default-mode'),
    ).toBe('wizard')
  })

  it('offers the Order 360 demo before creating a guided cloud draft', async () => {
    vi.stubEnv('MODE', 'cloud')
    vi.stubGlobal('crypto', { randomUUID: () => '12345678-0000-0000-0000-000000000000' })
    listSources.mockResolvedValue([
      { ...source('atlas-store', 'mongodb-atlas'), metadata: { labels: { store: 'true' } } },
      {
        ...source('sample_core_banking', 'mysql'),
        metadata: { labels: { sample: 'true' } },
      },
    ])
    listPipelines.mockResolvedValue([])
    loadSampleSources.mockResolvedValue([
      {
        id: 'sample_core_banking',
        name: 'MySQL order sample',
        description: 'Orders',
        connector: 'mysql',
        available: true,
        guidedDemo: true,
      },
    ])
    getSourceSchema.mockResolvedValue({
      connectionId: 'sample_core_banking',
      connectorId: 'mysql',
      discoveredAt: 1,
      tables: [
        {
          name: 'bmsql_customer',
          primaryKey: ['c_w_id', 'c_d_id', 'c_id'],
          fields: ['c_w_id', 'c_d_id', 'c_id'].map((name) => ({ name, type: null })),
          indexes: [],
        },
        {
          name: 'bmsql_oorder',
          primaryKey: ['o_w_id', 'o_d_id', 'o_id'],
          fields: ['o_w_id', 'o_d_id', 'o_id', 'o_c_id'].map((name) => ({ name, type: null })),
          indexes: [],
        },
        {
          name: 'bmsql_order_line',
          primaryKey: ['ol_w_id', 'ol_d_id', 'ol_o_id'],
          fields: ['ol_w_id', 'ol_d_id', 'ol_o_id'].map((name) => ({ name, type: null })),
          indexes: [],
        },
      ],
    })

    await render()
    await settle()
    await act(async () => buttonNamed('Build Pipeline', container)?.click())
    await settle()
    await act(async () => buttonNamed('Try Order 360 demo')?.click())
    await settle()

    expect(createPipelineDraft).toHaveBeenCalledWith(
      'order_360_12345678',
      expect.objectContaining({
        mode: 'wizard',
        wizard: expect.objectContaining({
          root: expect.objectContaining({ table: 'bmsql_oorder' }),
          related: expect.arrayContaining([
            expect.objectContaining({ table: 'bmsql_customer' }),
            expect.objectContaining({ table: 'bmsql_order_line' }),
          ]),
          output: expect.objectContaining({
            kind: 'atlas',
            config: expect.objectContaining({
              sourceId: 'atlas-store',
              table: 'order_360_views',
              onboardingGuide: 'order-360-sample',
            }),
          }),
        }),
      }),
      apiFetch,
    )
    expect(navigate).toHaveBeenCalledWith({
      to: '/pipelines/$pipelineId/edit',
      params: { pipelineId: 'order_360_12345678' },
    })
    expect(container.querySelector('[data-testid="pipeline-creation-dialog"]')).toBeNull()
  })

  it('uses ordinary creation for a cloud database without installed samples', async () => {
    vi.stubEnv('MODE', 'cloud')
    listSources.mockResolvedValue([
      { ...source('atlas-store', 'mongodb-atlas'), metadata: { labels: { store: 'true' } } },
      source('orders', 'mysql'),
    ])
    listPipelines.mockResolvedValue([])
    await render()
    await settle()
    await act(async () => buttonNamed('Build Pipeline', container)?.click())
    expect(container.querySelector('[data-testid="pipeline-creation-dialog"]')).not.toBeNull()
    expect(createPipelineDraft).not.toHaveBeenCalled()
  })

  it('uses ordinary creation for New Pipeline even after samples are installed', async () => {
    vi.stubEnv('MODE', 'cloud')
    listSources.mockResolvedValue([
      { ...source('atlas-store', 'mongodb-atlas'), metadata: { labels: { store: 'true' } } },
      { ...source('sample_core_banking', 'mysql'), metadata: { labels: { sample: 'true' } } },
    ])
    listPipelines.mockResolvedValue([pipeline('existing', 'RUNNING')])
    await render()
    await settle()
    await act(async () => buttonNamed('New Pipeline', container)?.click())
    expect(container.querySelector('[data-testid="pipeline-creation-dialog"]')).not.toBeNull()
    expect(createPipelineDraft).not.toHaveBeenCalled()
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

  it('offers the sample sources when the deployment has them, and tags them once added', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb')])
    listPipelines.mockResolvedValue([])
    loadSampleSources.mockResolvedValue([
      {
        id: 'sample_core_banking',
        name: 'Core banking',
        description: '',
        connector: 'mysql',
        mode: 'cdc',
        config: {},
      },
      {
        id: 'sample_cards_crm',
        name: 'Cards & CRM',
        description: '',
        connector: 'postgres',
        mode: 'cdc',
        config: {},
      },
    ])
    const added = (id: string, connector: string) => ({
      ...source(id, connector),
      metadata: { labels: { sample: 'true' }, description: id },
    })
    const queued: SampleInstallStatus = {
      id: 'overview-samples',
      finished: false,
      items: ['sample_core_banking', 'sample_cards_crm'].map((id) => ({
        id,
        stage: 'QUEUED',
        errorCode: null,
        errorDetail: null,
      })),
    }
    let completeInstall!: (status: SampleInstallStatus) => void
    startSampleInstall.mockResolvedValue(queued)
    getSampleInstallStatus.mockReturnValue(
      new Promise<SampleInstallStatus>((resolve) => {
        completeInstall = resolve
      }),
    )

    await render()
    await settle()
    await act(async () => buttonNamed('Try sample', container)?.click())
    await settle()
    expect(document.body.textContent).toContain('Choose data to explore')
    expect(startSampleInstall).not.toHaveBeenCalled()
    for (const input of document.querySelectorAll<HTMLInputElement>(
      '[role="dialog"] input[type="checkbox"]',
    )) {
      if (!input.checked) await act(async () => input.click())
    }
    await act(async () => buttonNamed('Initialize 2 samples', container)?.click())
    await settle()
    expect(startSampleInstall).toHaveBeenCalledWith(
      ['sample_core_banking', 'sample_cards_crm'],
      apiFetch,
    )
    expect(getSampleInstallStatus).toHaveBeenCalledWith(queued.id, apiFetch)
    expect(container.textContent).not.toContain('2 connected sources')

    listSources.mockResolvedValue([
      source('views', 'mongodb'),
      added('sample_core_banking', 'mysql'),
      added('sample_cards_crm', 'postgres'),
    ])
    await act(async () =>
      completeInstall({
        ...queued,
        finished: true,
        items: queued.items.map((item) => ({ ...item, stage: 'READY' })),
      }),
    )
    await settle()
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('2 connected sources'))
    })
    expect(buttonNamed('Try sample', container)).toBeUndefined()
  })

  it('hides the sample offer when the deployment has none', async () => {
    listSources.mockResolvedValue([source('views', 'mongodb')])
    listPipelines.mockResolvedValue([])

    await render()
    await settle()
    await act(async () => buttonNamed('Add data sources', container)?.click())
    await settle()

    expect(document.body.textContent).toContain('Or connect a source')
    expect(document.body.textContent).not.toContain('Sample bank sources')
  })
})
