import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'

const { listSources } = vi.hoisted(() => ({ listSources: vi.fn() }))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources,
}))

vi.mock('./source-create-dialog', () => ({
  SourceCreateDialog: () => null,
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

beforeEach(() => {
  listSources.mockResolvedValue([source])
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
    await vi.waitFor(() => {
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
})
