import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'

const mockState = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  listSources: vi.fn(),
  profile: 'on-prem' as 'on-prem' | 'cloud',
}))
vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources: mockState.listSources,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: mockState.apiFetch }),
}))
vi.mock('@/utils/deployment-profile', () => ({ getDeploymentProfile: () => mockState.profile }))

import { StateStorePage } from './state-store-page'

function source(
  id: string,
  config: SourceView['config'] = {},
  overrides: Partial<Pick<SourceView, 'connector' | 'metadata'>> = {},
): SourceView {
  return {
    id,
    metadata: overrides.metadata ?? null,
    connector: overrides.connector ?? 'mongodb',
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
  mockState.listSources.mockReset()
  mockState.profile = 'on-prem'
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('StateStorePage', () => {
  it('shows a loading state', async () => {
    mockState.listSources.mockReturnValue(new Promise(() => undefined))

    await render()

    expect(container.textContent).toContain('Loading state stores')
  })

  it('offers a retry when sources cannot be loaded', async () => {
    mockState.listSources.mockRejectedValue(new Error('down'))

    await render()

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded')
  })

  it('says so when the server has no state store', async () => {
    mockState.listSources.mockResolvedValue([source('orders')])

    await render()

    expect(container.textContent).toContain(
      'No state store yet. Pipelines cannot start until one is set.',
    )
    expect(container.querySelector('li')).toBeNull()
  })

  it('shows the managed store details without incomplete controls or placeholder sections', async () => {
    mockState.listSources.mockResolvedValue([
      source('views', {
        database: 'tapstate_acc',
        uri: 'mongodb://admin:secret@internal:27017/tapstate',
      }),
      source('orders'),
    ])

    await render()

    const rows = container.querySelectorAll('li')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Tapstate state store')
    expect(rows[0].textContent).toContain('Default')
    expect(rows[0].textContent).toContain('tapstate_acc')
    expect(container.textContent).not.toContain('secret')
    expect(container.textContent).not.toContain('internal:27017')
    expect(
      [...container.querySelectorAll('.settings-sections__item')].map((item) => item.textContent),
    ).toEqual(['State store'])
    expect([...container.querySelectorAll('dt')].map((label) => label.textContent)).toEqual([
      'Type',
      'Database',
      'Access',
    ])
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.textContent).not.toContain('Members')
    expect(container.textContent).not.toContain('API keys')
    expect(container.textContent).not.toContain('Add store')
    expect(container.textContent).not.toContain('One store in this release')
    expect(container.textContent).not.toContain('Checks')
    expect(container.textContent).not.toContain('Usage')
    expect(container.textContent).not.toContain('Delete')
    expect(container.textContent).not.toContain('Not reported by this server yet')
  })

  it('omits the database row when the server does not report it', async () => {
    mockState.listSources.mockResolvedValue([source('views')])

    await render()

    expect([...container.querySelectorAll('dt')].map((label) => label.textContent)).toEqual([
      'Type',
      'Access',
    ])
    expect(container.textContent).not.toContain('Not reported by this server yet')
  })

  it('shows the configured Atlas store without incomplete controls in the cloud profile', async () => {
    mockState.profile = 'cloud'
    mockState.listSources.mockResolvedValue([
      source(
        'atlas-store',
        { database: 'tapstate_cloud' },
        { connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      ),
      source('views', { database: 'unmarked' }),
    ])

    await render()

    expect(container.querySelector('li')?.textContent).toContain('Atlas state store')
    expect(container.querySelector('li')?.textContent).toContain('tapstate_cloud')
    expect(container.textContent).not.toContain('Tapstate state store')
    expect(container.textContent).not.toContain('unmarked')
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.textContent).not.toContain('Members')
    expect(container.textContent).not.toContain('API keys')
    expect(container.textContent).not.toContain('Add store')
    expect(container.textContent).not.toContain('Checks')
    expect(container.textContent).not.toContain('Usage')
    expect(container.textContent).not.toContain('Delete')
  })
})
