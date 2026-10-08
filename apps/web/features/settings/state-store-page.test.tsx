import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'

const { apiFetch, listSources } = vi.hoisted(() => ({ apiFetch: vi.fn(), listSources: vi.fn() }))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))

import { StateStorePage } from './state-store-page'

function source(id: string, config: SourceView['config'] = {}): SourceView {
  return {
    id,
    metadata: null,
    connector: 'mongodb',
    config,
    configuredSecrets: [],
    mode: null,
    tables: null,
    srs: null,
    contentHash: `hash-${id}`,
  }
}

let container: HTMLDivElement
let root: Root

async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <StateStorePage />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  listSources.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('StateStorePage', () => {
  it('shows a loading state', async () => {
    listSources.mockReturnValue(new Promise(() => undefined))

    await render()

    expect(container.textContent).toContain('Loading state stores')
  })

  it('offers a retry when sources cannot be loaded', async () => {
    listSources.mockRejectedValue(new Error('down'))

    await render()

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded')
  })

  it('says so when the server has no state store', async () => {
    listSources.mockResolvedValue([source('orders')])

    await render()

    expect(container.textContent).toContain(
      'No state store yet. Pipelines cannot start until one is set.',
    )
    expect(container.querySelector('li')).toBeNull()
  })

  it('lists the managed store as the default, without its connection details or a way to delete it', async () => {
    listSources.mockResolvedValue([
      source('views', { uri: 'mongodb://admin:secret@internal:27017/tapstate' }),
      source('orders'),
    ])

    await render()

    const rows = container.querySelectorAll('li')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Tapstate state store')
    expect(rows[0].textContent).toContain('Default')
    expect(container.textContent).not.toContain('secret')
    expect(container.textContent).not.toContain('internal:27017')
    const remove = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Delete',
    )
    expect(remove?.disabled).toBe(true)
    const add = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Add store',
    )
    expect(add?.disabled).toBe(true)
  })
})
