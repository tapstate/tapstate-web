import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SourceClientError,
  type ConnectorSummary,
  type SourceEnvelope,
  type SourceView,
} from '@/service/source-client'

const {
  discoverSourceSchema,
  getSource,
  getSourceSchema,
  listConnectors,
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

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  discoverSourceSchema,
  getSource,
  getSourceSchema,
  listConnectors,
  listSources,
  testConnection,
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

async function waitForPage(assertion: () => void | Promise<void>) {
  await act(async () => {
    await vi.waitFor(assertion)
  })
}

beforeEach(() => {
  listConnectors.mockResolvedValue([mysqlConnector])
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
    expect(container.textContent).toContain('1 configured secrets')
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
    const columnsTab = buttonWithText('Columns')
    expect(columnsTab?.className).toContain('border-b-2')
    expect(columnsTab?.className).toContain('border-x-0')
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
    await waitForPage(() => expect(buttonWithText('Test connection')).toBeDefined())

    await act(async () => buttonWithText('Test connection')?.click())

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
    await waitForPage(() => expect(buttonWithText('Delete source')).toBeDefined())

    await act(async () => buttonWithText('Delete source')?.click())
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

  it('refreshes schema and shows the discovered fields in table detail', async () => {
    getSourceSchema.mockRejectedValueOnce(
      new SourceClientError('server', 'not discovered', null, 404),
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
    await waitForPage(() => expect(buttonWithText('orders')).toBeDefined())
    await act(async () => buttonWithText('orders')?.click())
    await waitForPage(() =>
      expect(container?.textContent).toContain('Schema has not been discovered yet.'),
    )

    await act(async () => buttonWithText('Refresh schema')?.click())
    await waitForPage(() => expect(container?.textContent).toContain('Discovered'))
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
    await waitForPage(() => expect(buttonWithText('Refresh schema')).toBeDefined())
    await act(async () => buttonWithText('Refresh schema')?.click())

    await waitForPage(() => {
      expect(container?.textContent).toContain('The schema could not be loaded. Try again.')
      expect(buttonWithText('Retry')).toBeDefined()
    })
  })

  it('shows creation success as a transient message without adding a page block', async () => {
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

    await act(async () =>
      triggerCreated({
        ...source,
        id: 'feyn',
      }),
    )

    const successToast = container.querySelector('[role="status"]')
    expect(successToast?.textContent).toBe('Source feyn created')
    expect(successToast?.className).toContain('fixed')
    expect(successToast?.className).not.toContain('border-b')
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
      expect(container?.querySelector('[role="status"]')?.textContent).toBe('Source orders updated')
      expect(queryClient.getQueryData(['source', 'orders'])).toEqual(saved)
    })
  })
})
