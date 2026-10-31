import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'
import type { StorageSnapshot } from '@/service/storage-client'

const mockState = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  listSources: vi.fn(),
  getSource: vi.fn(),
  testConnection: vi.fn(),
  refresh: vi.fn(async () => {}),
  snapshot: undefined as StorageSnapshot | undefined,
  currentSession: 0,
  profile: 'on-prem' as 'on-prem' | 'cloud',
}))
vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources: mockState.listSources,
  getSource: mockState.getSource,
  testConnection: mockState.testConnection,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
      selector({ apiFetch: mockState.apiFetch }),
    { getState: () => ({ sessionRevision: mockState.currentSession }) },
  ),
}))
vi.mock('@/utils/deployment-profile', () => ({ getDeploymentProfile: () => mockState.profile }))

vi.mock('@/features/storage/storage-context', () => ({
  useStorage: () => ({ snapshot: mockState.snapshot, refresh: mockState.refresh, session: 0 }),
}))

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
  mockState.apiFetch.mockReset()
  mockState.apiFetch.mockResolvedValue(Response.json({ version: 'test' }))
  mockState.listSources.mockReset()
  mockState.getSource.mockReset()
  mockState.testConnection.mockReset()
  mockState.refresh.mockClear()
  mockState.snapshot = undefined
  mockState.currentSession = 0
  mockState.profile = 'on-prem'
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('StateStorePage', () => {
  function ready(allowedActions = ['connection.test']) {
    mockState.snapshot = {
      mode: 'OP',
      clusterId: 'cluster',
      operationId: 'setup',
      setupGeneration: 1,
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 1,
      setupPhase: 'COMPLETE',
      businessPhase: 'READY',
      health: { CONFIG: 'AVAILABLE', CACHE: 'AVAILABLE', MASTER: 'UNKNOWN' },
      allowedActions,
      restartRequired: false,
    }
    const managed = source(
      'views',
      { uri: 'mongodb://<redacted>@host/views' },
      { metadata: { labels: { store: 'true' } } },
    )
    mockState.listSources.mockResolvedValue([managed])
    return managed
  }
  it.each(['on-prem', 'cloud'] as const)(
    'hides Transfer while preserving storage settings and recovery in %s',
    async (profile) => {
      mockState.profile = profile
      ready([
        'connection.test',
        'configuration.export',
        'configuration.import.preflight',
        'configuration.import.commit',
        'configuration.import.status',
        'storage.recovery.plan',
        'storage.recovery.status',
      ])
      mockState.snapshot!.mode = profile === 'cloud' ? 'CLOUD' : 'OP'
      await render()
      expect(container.textContent).not.toContain('Transfer configuration')
      expect(container.querySelector('input[type="file"]')).toBeNull()
      expect(container.textContent).toContain('Recover runtime storage and pipelines')
      expect(container.textContent).toContain('Refresh status')
      const recovery = container.querySelector('summary')!
      await act(async () => recovery.click())
      expect(recovery.parentElement?.getAttribute('open')).not.toBeNull()
      expect(
        mockState.apiFetch.mock.calls.some(([url]) => String(url).includes('/configuration/')),
      ).toBe(false)
    },
  )
  it('checks the freshly loaded default Source only on explicit refresh', async () => {
    const managed = ready()
    const fresh = { ...managed, config: { uri: 'mongodb://<redacted>@current/views' } }
    mockState.getSource.mockResolvedValue({ source: fresh, etag: '"current"' })
    let complete!: (value: unknown) => void
    mockState.testConnection.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    await render()
    expect(mockState.testConnection).not.toHaveBeenCalled()
    const button = [...container.querySelectorAll('button')].find(
      (x) => x.textContent === 'Refresh status',
    )!
    await act(async () => button.click())
    expect(mockState.testConnection).toHaveBeenCalledWith(
      { id: 'views', connectorId: 'mongodb', settings: fresh.config },
      mockState.apiFetch,
    )
    expect(button.disabled).toBe(true)
    expect(container.textContent).toContain('Checking…')
    await act(async () => complete({ outcome: 'PASSED' }))
    expect(mockState.refresh).toHaveBeenCalledOnce()
    expect(button.disabled).toBe(false)
  })
  it('does not run a connection write for a read-only status refresh', async () => {
    ready([])
    await render()
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((x) => x.textContent === 'Refresh status')!
        .click(),
    )
    expect(mockState.getSource).not.toHaveBeenCalled()
    expect(mockState.testConnection).not.toHaveBeenCalled()
    expect(mockState.refresh).toHaveBeenCalledOnce()
  })
  it('does not test or refresh a replacement session after a late Source read', async () => {
    const managed = ready()
    let complete!: (value: unknown) => void
    mockState.getSource.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    await render()
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((x) => x.textContent === 'Refresh status')!
        .click(),
    )
    mockState.currentSession = 1
    await act(async () => complete({ source: managed, etag: '"current"' }))
    expect(mockState.testConnection).not.toHaveBeenCalled()
    expect(mockState.refresh).not.toHaveBeenCalled()
  })
  it('allows a new scope to refresh while the old scope request is still pending', async () => {
    const managed = ready()
    let oldRead!: (value: unknown) => void
    mockState.getSource
      .mockReturnValueOnce(
        new Promise((resolve) => {
          oldRead = resolve
        }),
      )
      .mockResolvedValue({ source: managed, etag: '"current"' })
    mockState.testConnection.mockResolvedValue({ outcome: 'PASSED' })
    await render()
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((x) => x.textContent === 'Refresh status')!
        .click(),
    )
    mockState.snapshot = { ...mockState.snapshot!, authGeneration: 2 }
    await render()
    const button = [...container.querySelectorAll('button')].find(
      (x) => x.textContent === 'Refresh status',
    )!
    expect(button).toBeTruthy()
    expect(button.disabled).toBe(false)
    await act(async () => button.click())
    expect(mockState.testConnection).toHaveBeenCalledOnce()
    expect(mockState.refresh).toHaveBeenCalledOnce()
    await act(async () => oldRead({ source: managed, etag: '"old"' }))
    expect(mockState.testConnection).toHaveBeenCalledOnce()
    expect(mockState.refresh).toHaveBeenCalledOnce()
  })
  it('refreshes the snapshot after a failed check without rendering unsafe diagnostics', async () => {
    const managed = ready()
    mockState.getSource.mockResolvedValue({ source: managed, etag: '"current"' })
    mockState.testConnection.mockRejectedValue(new Error('credential-sentinel'))
    await render()
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((x) => x.textContent === 'Refresh status')!
        .click(),
    )
    expect(mockState.refresh).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
    expect(container.textContent).not.toContain('credential-sentinel')
  })
  it('does not restore an old successful card when the new check cannot reach the server', async () => {
    ready()
    mockState.snapshot = {
      ...mockState.snapshot!,
      applicationDataVerification: {
        status: 'PASSED',
        checkedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 600_000).toISOString(),
      },
    }
    mockState.getSource.mockRejectedValue(new Error('network unavailable'))
    await render()
    expect(container.textContent).toContain('Last check passed')
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((x) => x.textContent === 'Refresh status')!
        .click(),
    )
    expect(mockState.refresh).toHaveBeenCalledOnce()
    expect(mockState.testConnection).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Last check passed')
    expect(container.textContent).toContain('Not verified')
  })
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
      source(
        'views',
        {
          database: 'tapstate_acc',
          uri: 'mongodb://admin:secret@internal:27017/tapstate',
        },
        { metadata: { labels: { store: 'true' } } },
      ),
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
    ).toEqual(['State store', 'About'])
    expect([...container.querySelectorAll('dt')].map((label) => label.textContent)).toEqual([
      'Type',
      'Database',
      'Access',
    ])
    expect(
      [...container.querySelectorAll('button')]
        .filter((button) => !button.classList.contains('settings-sections__item'))
        .map((button) => button.textContent),
    ).toEqual(['Refresh status'])
    expect(container.querySelectorAll('.settings-sections__item')).toHaveLength(2)
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
    mockState.listSources.mockResolvedValue([
      source('views', {}, { metadata: { labels: { store: 'true' } } }),
    ])

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
    expect(
      [...container.querySelectorAll('button')]
        .filter((button) => !button.classList.contains('settings-sections__item'))
        .map((button) => button.textContent),
    ).toEqual(['Refresh status'])
    expect(container.querySelectorAll('.settings-sections__item')).toHaveLength(2)
    expect(container.textContent).not.toContain('Members')
    expect(container.textContent).not.toContain('API keys')
    expect(container.textContent).not.toContain('Add store')
    expect(container.textContent).not.toContain('Checks')
    expect(container.textContent).not.toContain('Usage')
    expect(container.textContent).not.toContain('Delete')
  })

  it('renders about section with version, copyright, and legal links', async () => {
    mockState.listSources.mockResolvedValue([])
    mockState.apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.6.0' }),
    })

    await render()

    const aboutTab = [
      ...container.querySelectorAll<HTMLButtonElement>('.settings-sections__item'),
    ].find((item) => item.textContent === 'About')
    expect(aboutTab).toBeDefined()
    await act(async () => {
      aboutTab?.click()
    })

    expect(container.querySelector('.settings-about__copyright')?.textContent).toContain(
      'TAPDATA HONG KONG LIMITED',
    )
    const links = [...container.querySelectorAll('.settings-about__legal-links a')]
    expect(links).toHaveLength(2)
    expect(links[0].textContent).toBe('Privacy Policy')
    expect(links[0].getAttribute('href')).toBe('https://tapstate.com/legal/privacy')
    expect(links[1].textContent).toBe('Terms of Service')
    expect(links[1].getAttribute('href')).toBe('https://tapstate.com/legal/eula')
  })
})
