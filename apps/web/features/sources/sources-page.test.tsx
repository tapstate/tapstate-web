import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import {
  SourceClientError,
  type ConnectorSummary,
  type SourceEnvelope,
  type SourceView,
} from '@/service/source-client'
import { useSourceFeedbackStore } from '@/stores/source-feedback-store'

const {
  discoverSourceSchema,
  getSource,
  getSourceSchema,
  listConnectors,
  listPipelineArtifacts,
  listSources,
  testConnection,
  registerCreated,
  registerEdited,
  registerDeleted,
  triggerCreated,
  triggerEdited,
  triggerDeleted,
} = vi.hoisted(() => {
  let onCreated: ((source: SourceView) => void) | undefined
  let onSaved: ((result: SourceEnvelope) => void) | undefined
  let onDeleted: (() => void) | undefined
  return {
    discoverSourceSchema: vi.fn(),
    getSource: vi.fn(),
    getSourceSchema: vi.fn(),
    listConnectors: vi.fn(),
    listPipelineArtifacts: vi.fn(),
    listSources: vi.fn(),
    testConnection: vi.fn(),
    registerCreated: (callback: (source: SourceView) => void) => {
      onCreated = callback
    },
    registerEdited: (callback: (result: SourceEnvelope) => void) => {
      onSaved = callback
    },
    registerDeleted: (callback: () => void) => {
      onDeleted = callback
    },
    triggerCreated: (source: SourceView) => onCreated?.(source),
    triggerEdited: (result: SourceEnvelope) => onSaved?.(result),
    triggerDeleted: () => onDeleted?.(),
  }
})

const { startSampleInstall, getSampleInstallStatus, loadSampleSources, removeSampleSources } =
  vi.hoisted(() => ({
    startSampleInstall: vi.fn(),
    getSampleInstallStatus: vi.fn(),
    loadSampleSources: vi.fn(),
    removeSampleSources: vi.fn(),
  }))

vi.mock('@/service/sample-source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/sample-source-client')>()),
  startSampleInstall,
  getSampleInstallStatus,
  loadSampleSources,
  removeSampleSources,
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  discoverSourceSchema,
  getSource,
  getSourceSchema,
  listConnectors,
  listSources,
  testConnection,
}))

vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  listPipelineArtifacts,
}))

vi.mock('./source-create-dialog', () => ({
  SourceCreateDialog: ({ onCreated }: { onCreated: (source: SourceView) => void }) => {
    registerCreated(onCreated)
    return null
  },
}))

vi.mock('./source-edit-dialog', () => ({
  SourceEditDialog: ({
    source,
    etag,
    onSaved,
  }: {
    source: SourceView
    etag: string
    onSaved: (result: SourceEnvelope) => void
  }) => {
    registerEdited(onSaved)
    return <div data-testid="source-edit-dialog">{`${source.id}:${etag}`}</div>
  },
}))

vi.mock('./source-delete-dialog', () => ({
  SourceDeleteDialog: ({
    open,
    source,
    onDeleted,
  }: {
    open: boolean
    source: SourceView
    onDeleted: () => void
  }) => {
    if (!open) return null
    registerDeleted(onDeleted)
    return <div data-testid="source-delete-dialog">{`Delete ${source.id}?`}</div>
  },
}))

import type { SampleInstallStatus } from '@/service/sample-source-client'

import { SourceDetailPage } from './pages/source-detail-page'
import { SourcesCatalogPage } from './pages/sources-catalog-page'
import { SourcesPage } from './sources-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const source: SourceView = {
  id: 'orders',
  metadata: null,
  connector: 'mysql',
  config: { host: 'mysql.local' },
  configuredSecrets: ['password'],
  mode: 'snapshot',
  tables: [
    {
      type: 'literal',
      name: 'orders',
      pattern: null,
      filter: null,
      pk: ['id'],
      options: null,
    },
  ],
  srs: null,
  contentHash: 'a'.repeat(64),
}

const mysqlConnector: ConnectorSummary = {
  id: 'mysql',
  name: 'MySQL',
  icon: 'icons/mysql.png',
  group: 'database',
  modes: ['snapshot'],
  discovery: 'catalog',
  sink: false,
  pushOut: false,
  origin: 'registered',
}

const schemaReport = {
  connectionId: 'orders',
  connectorId: 'mysql',
  discoveredAt: 1_754_800_000_000,
  tables: [
    {
      name: 'orders',
      fields: [
        { name: 'id', type: 'BIGINT' },
        { name: 'email', type: 'VARCHAR' },
      ],
      primaryKey: ['id'],
      indexes: [],
    },
  ],
}

const testReport = {
  connectionId: 'orders',
  connectorId: 'mysql',
  outcome: 'PASSED' as const,
  checks: [{ name: 'connection', status: 'PASSED' as const, message: 'reachable' }],
  testedAt: 1_754_800_000_000,
}

let root: Root | undefined
let container: HTMLDivElement | undefined

function buttonWithText(text: string) {
  return [...(container?.querySelectorAll('button') ?? [])].find(
    (button) => button.textContent?.trim() === text,
  )
}

function buttonWithLabel(text: string) {
  return [...(container?.querySelectorAll('button') ?? [])].find((button) =>
    button.getAttribute('aria-label')?.includes(text),
  )
}

function menuItemWithText(text: string) {
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) =>
    item.textContent?.trim().includes(text),
  )
}

function hasToastText(text: string) {
  return document.body.textContent?.includes(text) ?? false
}

function sourceActionMenuButton() {
  return [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) =>
    button.textContent?.toLowerCase().includes('more'),
  )
}

async function waitForPage(assertion: () => void | Promise<void>) {
  await act(async () => {
    await vi.waitFor(assertion)
  })
}

async function openSourceActions() {
  await waitForPage(() => expect(sourceActionMenuButton()).toBeDefined())
  await act(async () => sourceActionMenuButton()?.click())
  await waitForPage(() => expect(menuItemWithText('Test connection')).toBeDefined())
}

beforeEach(() => {
  window.localStorage.clear()
  useSourceFeedbackStore.setState({ successMessage: '' })
  startSampleInstall.mockReset()
  getSampleInstallStatus.mockReset()
  loadSampleSources.mockResolvedValue(null)
  listConnectors.mockResolvedValue([mysqlConnector])
  listPipelineArtifacts.mockResolvedValue([])
  listSources.mockResolvedValue([source])
  getSource.mockResolvedValue({ source, etag: `"${source.contentHash}"` })
  getSourceSchema.mockResolvedValue(schemaReport)
  discoverSourceSchema.mockResolvedValue(schemaReport)
  testConnection.mockResolvedValue(testReport)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('SourcesPage', () => {
  it('renders the registered connector icon in source lists', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })

    await waitForPage(() =>
      expect(container?.querySelector('.connector-icon__image')).not.toBeNull(),
    )
    expect(
      [...(container?.querySelectorAll('.connector-icon__image') ?? [])].map((image) =>
        image.getAttribute('src'),
      ),
    ).toEqual(['/connector-icons/mysql', '/connector-icons/mysql'])
  })

  it('keeps the selected source in the master-detail workbench without inventing observations', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => {
      expect(buttonWithText('orders')).toBeDefined()
    })

    await act(async () => buttonWithText('orders')?.click())
    await waitForPage(() => expect(container?.textContent).toContain('Discovered'))

    expect(container.textContent).toContain('Tables in orders')
    expect(container.textContent).toContain('1 configured secret')
    expect(container.textContent).not.toContain('Last 24h')
    expect(container.textContent).not.toContain('—')

    const tableRow = [...(container?.querySelectorAll('tbody tr') ?? [])].find((row) =>
      row.textContent?.includes('orders'),
    )
    expect(tableRow).toBeDefined()
    await act(async () => (tableRow as HTMLElement).click())

    expect(container.textContent).toContain('id')
    expect(container.textContent).toContain('BIGINT')
    expect(container.textContent).toContain('email')
    expect(container.textContent).toContain('VARCHAR')
    expect(container.textContent).not.toContain('preview')

    const tableDetailHeader = container.querySelector('main > div > div')
    expect(tableDetailHeader?.textContent).toContain('orders')
    expect(tableDetailHeader?.textContent).toContain('orders')
    expect(buttonWithLabel('Expand')).toBeUndefined()
    const columnsTab = buttonWithText('Columns')
    expect(columnsTab?.getAttribute('role')).toBe('tab')
    expect(columnsTab?.getAttribute('aria-selected')).toBe('true')
  })

  it('derives the table detail and tab selection directly from the route', async () => {
    const onNavigate = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage
            route={{ sourceId: 'orders', tableName: 'orders', tab: 'columns' }}
            onNavigate={onNavigate}
          />
        </QueryClientProvider>,
      )
    })

    await waitForPage(() => {
      expect(container?.textContent).toContain('BIGINT')
      expect(container?.textContent).toContain('VARCHAR')
    })

    await act(async () => buttonWithText('Lineage')?.click())

    expect(onNavigate).toHaveBeenCalledWith({
      sourceId: 'orders',
      tableName: 'orders',
      tab: 'lineage',
    })
  })

  it('tests a source from the list with the persisted config', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithLabel('Test connection orders')).toBeDefined())

    await act(async () => buttonWithLabel('Test connection orders')?.click())

    await waitForPage(() => expect(document.body.textContent).toContain('Connection test passed'))
    expect(testConnection).toHaveBeenCalledWith(
      { id: 'orders', connectorId: 'mysql', settings: source.config },
      expect.any(Function),
    )
  })

  it('tests the selected source from the detail header with the persisted config', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())
    await act(async () => buttonWithText('orders')?.click())
    await openSourceActions()

    await act(async () => menuItemWithText('Test connection')?.click())

    await waitForPage(() => expect(document.body.textContent).toContain('Connection test passed'))
    expect(testConnection).toHaveBeenCalledWith(
      { id: 'orders', connectorId: 'mysql', settings: source.config },
      expect.any(Function),
    )
  })

  it('opens deletion from the source detail and removes the source from the query cache only after confirmation', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())
    await act(async () => buttonWithText('orders')?.click())
    await openSourceActions()

    await act(async () => menuItemWithText('Delete source')?.click())
    await waitForPage(() => expect(container?.textContent).toContain('Delete orders?'))
    expect(container?.textContent).toContain('orders')

    await act(async () => triggerDeleted())
    await waitForPage(() => expect(container?.textContent).not.toContain('Delete orders?'))
    expect(container?.textContent).not.toContain('Tables in orders')
    expect(queryClient.getQueryData<SourceView[]>(['sources'])).toEqual([])
  })

  it('keeps the test action disabled while a source test is pending', async () => {
    let resolveTest: ((report: typeof testReport) => void) | undefined
    testConnection.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTest = resolve
        }),
    )
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithLabel('Test connection orders')).toBeDefined())

    await act(async () => buttonWithLabel('Test connection orders')?.click())
    await waitForPage(() => expect(buttonWithLabel('Test connection orders')?.disabled).toBe(true))

    await act(async () => resolveTest?.(testReport))
  })

  it('automatically discovers missing schema and retains manual refresh', async () => {
    // List and detail observers must both see missing metadata until discovery completes.
    getSourceSchema
      .mockReset()
      .mockRejectedValue(new SourceClientError('server', 'not discovered', null, 404))
    discoverSourceSchema.mockImplementation(async () => {
      getSourceSchema.mockResolvedValue(schemaReport)
      return schemaReport
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider closeLabel="Close">
            <SourcesPage />
          </ToastProvider>
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())
    await act(async () => buttonWithText('orders')?.click())
    await waitForPage(() => expect(container?.textContent).toContain('Discovered'))
    expect(discoverSourceSchema).toHaveBeenCalledTimes(1)
    await openSourceActions()
    await act(async () => menuItemWithText('Refresh schema')?.click())
    await waitForPage(() => expect(discoverSourceSchema).toHaveBeenCalledTimes(2))
    await waitForPage(() => expect(hasToastText('Schema refreshed for orders')).toBe(true))
    expect(discoverSourceSchema).toHaveBeenCalledWith(
      { id: 'orders', connectorId: 'mysql', settings: source.config },
      expect.any(Function),
    )

    const tableRow = [...(container?.querySelectorAll('tbody tr') ?? [])].find((row) =>
      row.textContent?.includes('orders'),
    )
    await act(async () => (tableRow as HTMLElement).click())
    expect(container.textContent).toContain('id')
    expect(container.textContent).toContain('BIGINT')
    expect(container.textContent).toContain('email')
    expect(container.textContent).toContain('VARCHAR')
  })

  it('shows a retry action when schema discovery fails', async () => {
    discoverSourceSchema.mockRejectedValueOnce(new SourceClientError('server', 'offline'))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())
    await act(async () => buttonWithText('orders')?.click())
    await openSourceActions()
    await act(async () => menuItemWithText('Refresh schema')?.click())

    await waitForPage(() => {
      expect(container?.textContent).toContain('The schema could not be loaded. Try again.')
      expect(buttonWithText('Retry')).toBeDefined()
    })

    await act(async () => buttonWithText('Retry')?.click())
    await waitForPage(() => expect(discoverSourceSchema).toHaveBeenCalledTimes(2))
    await waitForPage(() => expect(container?.textContent).toContain('Discovered'))
  })

  it('shows creation success as a transient message without adding a page block', async () => {
    let finishDiscovery!: (report: typeof schemaReport) => void
    discoverSourceSchema.mockReturnValueOnce(
      new Promise<typeof schemaReport>((resolve) => {
        finishDiscovery = resolve
      }),
    )
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider closeLabel="Close">
            <SourcesPage />
          </ToastProvider>
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())

    await act(async () =>
      triggerCreated({
        ...source,
        id: 'feyn',
      }),
    )

    await waitForPage(() => expect(hasToastText('Source feyn created')).toBe(true))
    expect(container.querySelector('[role="status"]')?.textContent ?? '').not.toContain(
      'Source feyn created',
    )
    const discovered = { ...schemaReport, connectionId: 'feyn' }
    expect(discoverSourceSchema).toHaveBeenCalledTimes(1)
    await act(async () => finishDiscovery(discovered))
    expect(queryClient.getQueryData(['source-schema', 'feyn'])).toEqual(discovered)
    expect(hasToastText('Source feyn created')).toBe(true)
  })

  it('keeps creation success when the catalog navigates to the source detail route', async () => {
    discoverSourceSchema.mockResolvedValueOnce({ ...schemaReport, connectionId: 'feyn' })
    getSource.mockResolvedValue({ source: { ...source, id: 'feyn' }, etag: '"feyn"' })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const rootRoute = createRootRoute({ component: Outlet })
    const authenticatedRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: '_authenticated',
      component: Outlet,
    })
    const catalogRoute = createRoute({
      getParentRoute: () => authenticatedRoute,
      path: 'sources/',
      component: SourcesCatalogPage,
      validateSearch: () => ({ create: false }),
    })
    const detailRoute = createRoute({
      getParentRoute: () => authenticatedRoute,
      path: 'sources/$sourceId/',
      component: SourceDetailPage,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        authenticatedRoute.addChildren([catalogRoute, detailRoute]),
      ]),
      history: createMemoryHistory({ initialEntries: ['/sources'] }),
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider closeLabel="Close">
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())

    await act(async () => triggerCreated({ ...source, id: 'feyn' }))

    await waitForPage(() => {
      expect(router.state.location.pathname).toBe('/sources/feyn')
      expect(hasToastText('Source feyn created')).toBe(true)
    })
  })

  it('loads the latest Source and its ETag before opening Edit', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())

    await act(async () => buttonWithText('orders')?.click())
    await act(async () => buttonWithText('Edit')?.click())

    await waitForPage(() => {
      expect(getSource).toHaveBeenCalledWith('orders', expect.any(Function))
      expect(container?.querySelector('[data-testid="source-edit-dialog"]')?.textContent).toBe(
        `orders:"${source.contentHash}"`,
      )
    })
  })

  it('keeps the detail view available and provides retry when Edit cannot load', async () => {
    getSource.mockRejectedValueOnce(new Error('offline'))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())

    await act(async () => buttonWithText('orders')?.click())
    await act(async () => buttonWithText('Edit')?.click())

    await waitForPage(() => {
      expect(container?.textContent).toContain('The Source could not be saved. Try again.')
      expect(buttonWithText('Retry')).toBeDefined()
      expect(container?.textContent).toContain('Tables in orders')
    })

    await act(async () => buttonWithText('Retry')?.click())

    await waitForPage(() => {
      expect(getSource).toHaveBeenCalledTimes(2)
      expect(container?.querySelector('[data-testid="source-edit-dialog"]')).not.toBeNull()
    })
  })

  it('writes a saved Source back to the selected detail and list caches', async () => {
    let finishDiscovery!: (report: typeof schemaReport) => void
    discoverSourceSchema.mockReturnValueOnce(
      new Promise<typeof schemaReport>((resolve) => {
        finishDiscovery = resolve
      }),
    )
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider closeLabel="Close">
            <SourcesPage />
          </ToastProvider>
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())

    await act(async () => buttonWithText('orders')?.click())
    await act(async () => buttonWithText('Edit')?.click())
    await waitForPage(() =>
      expect(container?.querySelector('[data-testid="source-edit-dialog"]')).not.toBeNull(),
    )

    const saved = {
      source: {
        ...source,
        config: { host: 'mysql.internal' },
        contentHash: 'b'.repeat(64),
      },
      etag: `"${'b'.repeat(64)}"`,
    }
    await act(async () => triggerEdited(saved))

    await waitForPage(() => {
      expect(container?.textContent).toContain('mysql.internal')
      expect(hasToastText('Source orders updated')).toBe(true)
      expect(queryClient.getQueryData(['source', 'orders'])).toEqual(saved)
    })
    const discovered = { ...schemaReport, discoveredAt: schemaReport.discoveredAt + 1000 }
    expect(discoverSourceSchema).toHaveBeenCalledTimes(1)
    await act(async () => finishDiscovery(discovered))
    expect(queryClient.getQueryData(['source-schema', 'orders'])).toEqual(discovered)
    expect(hasToastText('Source orders updated')).toBe(true)
  })

  it('tags sample sources and removes them as a set, naming a pipeline that still reads one', async () => {
    const sample = (id: string): SourceView => ({
      ...source,
      id,
      metadata: { labels: { sample: 'true' }, description: id },
    })
    listSources.mockResolvedValue([
      source,
      sample('sample_cards_crm'),
      sample('sample_core_banking'),
    ])
    removeSampleSources.mockResolvedValue({
      removed: ['sample_core_banking'],
      refused: { sourceId: 'sample_cards_crm', referrers: ['c360_pipeline'] },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('Remove sample sources')).toBeDefined())

    const rows = [...(container.querySelectorAll('tbody tr') ?? [])].map(
      (row) => row.textContent ?? '',
    )
    expect(rows.filter((row) => row.includes('Sample'))).toHaveLength(2)
    expect(rows.find((row) => row.includes('orders'))).not.toContain('Sample')

    await act(async () => buttonWithText('Remove sample sources')?.click())
    await waitForPage(() =>
      expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain(
        'Remove sample sources?',
      ),
    )
    expect(removeSampleSources).not.toHaveBeenCalled()
    const confirmRemove = [
      ...(document.body
        .querySelector('[role="alertdialog"]')
        ?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ].find((button) => button.textContent?.trim() === 'Remove sample sources')
    expect(confirmRemove).toBeDefined()
    await act(async () => confirmRemove?.click())
    await waitForPage(() =>
      expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
        'Sample source sample_cards_crm is still read by: c360_pipeline',
      ),
    )
    expect(removeSampleSources).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'orders' })]),
      expect.anything(),
    )
    expect(container.textContent).not.toContain('sample_core_banking')
  })

  it('offers no sample removal when there are no sample sources', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(container?.textContent).toContain('orders'))

    expect(buttonWithText('Remove sample sources')).toBeUndefined()
  })

  it('offers the missing sample sources on Data Sources once other sources exist', async () => {
    const samples = [
      {
        id: 'sample_core_banking',
        name: 'Core banking',
        description: '',
        connector: 'mysql',
        mode: 'cdc',
        config: {},
      },
    ]
    loadSampleSources.mockResolvedValue(samples)
    const queued: SampleInstallStatus = {
      id: 'sources-samples',
      finished: false,
      items: [{ id: 'sample_core_banking', stage: 'QUEUED', errorCode: null, errorDetail: null }],
    }
    let completeInstall!: (status: SampleInstallStatus) => void
    startSampleInstall.mockResolvedValue(queued)
    getSampleInstallStatus.mockReturnValue(
      new Promise<SampleInstallStatus>((resolve) => {
        completeInstall = resolve
      }),
    )
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <SourcesPage />
        </QueryClientProvider>,
      )
    })
    await waitForPage(() => expect(buttonWithText('Add sample sources')).toBeDefined())

    await act(async () => buttonWithText('Add sample sources')?.click())
    expect(startSampleInstall).not.toHaveBeenCalled()
    const checkbox = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input[type="checkbox"]',
    )!
    if (!checkbox.checked) await act(async () => checkbox.click())
    await act(async () => buttonWithText('Initialize 1 sample')?.click())
    await waitForPage(() =>
      expect(getSampleInstallStatus).toHaveBeenCalledWith(queued.id, expect.any(Function)),
    )
    expect(startSampleInstall).toHaveBeenCalledWith(['sample_core_banking'], expect.any(Function))
    expect(buttonWithText('Remove sample sources')).toBeUndefined()
    listSources.mockResolvedValue([
      source,
      { ...source, id: 'sample_core_banking', metadata: { labels: { sample: 'true' } } },
    ])
    await act(async () =>
      completeInstall({
        ...queued,
        finished: true,
        items: [{ ...queued.items[0], stage: 'READY' }],
      }),
    )
    await waitForPage(() => expect(buttonWithText('Remove sample sources')).toBeDefined())
    expect(startSampleInstall).toHaveBeenCalledTimes(1)
    await act(async () => buttonWithLabel('Close sample sources')?.click())
    await act(async () => buttonWithText('Add sample sources')?.click())
    expect(container?.textContent).toContain('Ready to use')
    expect(startSampleInstall).toHaveBeenCalledTimes(1)
  })
})
