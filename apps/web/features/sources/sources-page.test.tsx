import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SourceEnvelope, SourceView } from '@/service/source-client'

const { getSource, listSources, registerCreated, registerEdited, triggerCreated, triggerEdited } =
  vi.hoisted(() => {
    let onCreated: ((source: SourceView) => void) | undefined
    let onSaved: ((result: SourceEnvelope) => void) | undefined
    return {
      getSource: vi.fn(),
      listSources: vi.fn(),
      registerCreated: (callback: (source: SourceView) => void) => {
        onCreated = callback
      },
      registerEdited: (callback: (result: SourceEnvelope) => void) => {
        onSaved = callback
      },
      triggerCreated: (source: SourceView) => onCreated?.(source),
      triggerEdited: (result: SourceEnvelope) => onSaved?.(result),
    }
  })

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getSource,
  listSources,
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

let root: Root | undefined
let container: HTMLDivElement | undefined

function buttonWithText(text: string) {
  return [...(container?.querySelectorAll('button') ?? [])].find(
    (button) => button.textContent?.trim() === text,
  )
}

async function waitForPage(assertion: () => void | Promise<void>) {
  await act(async () => {
    await vi.waitFor(assertion)
  })
}

beforeEach(() => {
  listSources.mockResolvedValue([source])
  getSource.mockResolvedValue({ source, etag: `"${source.contentHash}"` })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('SourcesPage', () => {
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

    expect(container.textContent).toContain('Tables in orders')
    expect(container.textContent).toContain('1 configured secrets')
    expect(container.textContent).not.toContain('Last 24h')
    expect(container.textContent).not.toContain('—')

    const tableRow = [...(container?.querySelectorAll('tbody tr') ?? [])].find((row) =>
      row.textContent?.includes('orders'),
    )
    expect(tableRow).toBeDefined()
    await act(async () => (tableRow as HTMLElement).click())

    expect(container.textContent).toContain('Data observation unavailable')
    expect(container.textContent).not.toContain('preview')
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
