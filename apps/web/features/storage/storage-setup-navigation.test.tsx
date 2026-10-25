import '@/i18n'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StorageSnapshot } from '@/service/storage-client'

import { useAuthStore } from '@/stores/auth-store'

import { ConfigurationTransfer } from './configuration-transfer'
import { StorageBoundary } from './storage-gate'

const route = vi.hoisted(() => ({ pathname: '/overview' }))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: route }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
let root: Root
let container: HTMLDivElement
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>
const state = (overrides: Partial<StorageSnapshot> = {}): StorageSnapshot => ({
  mode: 'OP',
  clusterId: 'cluster',
  operationId: 'setup',
  setupGeneration: 1,
  bindingVersion: 1,
  authGeneration: 1,
  stateVersion: 10,
  setupPhase: 'COMPLETE',
  businessPhase: 'READY',
  health: { CONFIG: 'AVAILABLE', CACHE: 'AVAILABLE', MASTER: 'UNKNOWN' },
  allowedActions: ['storage.status'],
  restartRequired: false,
  ...overrides,
})
const entry = (management = false, value = 'LOGIN') =>
  Response.json({ mode: 'OP', management, entry: value })
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}
async function render(children: ReactNode = <div data-testid="business">Business page</div>) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <StorageBoundary>{children}</StorageBoundary>
      </QueryClientProvider>,
    )
  })
  await settle()
}
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(
    (value) => value.textContent === text,
  )
  expect(button, text).toBeTruthy()
  await act(async () => button!.click())
  await settle()
}
async function input(element: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fetcher = vi.fn<typeof fetch>(async (input) =>
    String(input) === '/auth/storage-entry' ? entry() : Response.json(state()),
  )
  vi.stubGlobal('fetch', fetcher)
  useAuthStore.setState({
    profile: 'on-prem',
    isAuthenticated: true,
    token: 'test-token',
    sessionRevision: 0,
    apiFetch: fetcher,
  })
  route.pathname = '/overview'
})
afterEach(() => {
  act(() => root.unmount())
  client.clear()
  container.remove()
  vi.unstubAllGlobals()
})

describe('whole-site storage boundary', () => {
  it('refreshes cached configuration projections when original import status proves committed', async () => {
    client.setQueryData(['sources'], ['old-source'])
    function Catalog() {
      const query = useQuery({
        queryKey: ['sources'],
        staleTime: 30000,
        queryFn: async () => ['old-source', 'imported-source'],
      })
      return <p>{query.data?.join(',')}</p>
    }
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : String(url) === '/api/configuration/import/status'
          ? Response.json({
              importId: 'original',
              phase: 'COMMITTED',
              ticket: null,
              receipt: { id: 'original', resourceHashes: {}, usernames: [], layoutIds: [] },
            })
          : Response.json(state({ allowedActions: ['configuration.import.status'] })),
    )
    await render(
      <>
        <Catalog />
        <ConfigurationTransfer />
      </>,
    )
    expect(container.textContent).not.toContain('imported-source')
    await act(async () => container.querySelector('summary')!.click())
    const id = [...container.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Operation ID'))!
      .querySelector('input')!
    await input(id, 'original')
    await click('Check original result')
    expect(container.textContent).toContain('imported-source')
  })
  it.each(['/', '/overview', '/settings', '/pipelines/p1/edit', '/login', '/installation'])(
    'blocks business at %s while cleanup is unresolved',
    async (path) => {
      route.pathname = path
      fetcher.mockImplementation(async (url) =>
        String(url) === '/auth/storage-entry'
          ? entry()
          : Response.json(state({ businessPhase: 'CLEANUP_REQUIRED' })),
      )
      await render()
      expect(container.textContent).toContain('Cleanup needs verification')
      expect(container.querySelector('[data-testid="business"]')).toBeNull()
      expect(
        fetcher.mock.calls.every(([url]) =>
          ['/auth/storage-entry', '/api/storage/status'].includes(String(url)),
        ),
      ).toBe(true)
    },
  )
  it('opens business only after the server admits it', async () => {
    await render()
    expect(container.textContent).toContain('Business page')
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')).toHaveLength(1)
  })
  it('keeps a dependency failure on-page without any write or automatic retry', async () => {
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : Response.json(
            { code: 'control.storage-unavailable', message: 'mongodb://hidden:secret@host' },
            { status: 503 },
          ),
    )
    await render()
    await settle()
    expect(container.textContent).toContain('Storage is temporarily unavailable')
    expect(container.textContent).not.toContain('hidden')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
  })
  it('discards a late success from the previous session', async () => {
    let resolve!: (response: Response) => void
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : new Promise((done) => {
            resolve = done
          }),
    )
    await render()
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : Response.json(state({ businessPhase: 'UNAVAILABLE' })),
    )
    await act(async () => useAuthStore.setState({ sessionRevision: 1 }))
    await settle()
    await act(async () => resolve(Response.json(state())))
    await settle()
    expect(container.textContent).toContain('Storage unavailable')
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
  })
  it('never turns public first-install entry into a credential form', async () => {
    useAuthStore.setState({ isAuthenticated: false, token: null })
    fetcher.mockResolvedValue(entry(false, 'SETUP_REQUIRED'))
    await render()
    expect(container.textContent).toContain('management address')
    expect(container.querySelector('input')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('keeps management capability in memory and sends it only after explicit entry', async () => {
    useAuthStore.setState({ isAuthenticated: false, token: null })
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry(true, 'SETUP_REQUIRED')
        : Response.json(
            state({
              setupPhase: 'LOCAL_SETUP',
              businessPhase: 'NOT_CONFIGURED',
              bindingVersion: 0,
              authGeneration: 0,
              allowedActions: ['storage.test', 'storage.setup.commit'],
            }),
          ),
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await render()
    expect(fetcher).toHaveBeenCalledTimes(1)
    await input(container.querySelector('input')!, 'owner-secret')
    await click('Continue')
    const call = fetcher.mock.calls.find(([url]) => url === '/api/storage/status')!
    expect(new Headers(call[1]?.headers).get('X-Tapstate-Setup-Capability')).toBe('owner-secret')
    expect(container.textContent).toContain('Set up cluster storage')
    expect(container.textContent).not.toContain('owner-secret')
    expect(window.location.href).not.toContain('owner-secret')
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
  it('updates health degradation after a fresh query even at the same configuration version', async () => {
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : Response.json(state({ businessPhase: 'AUTH_READY' })),
    )
    await render()
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : Response.json(
            state({
              businessPhase: 'UNAVAILABLE',
              health: { CONFIG: 'AVAILABLE', CACHE: 'UNAVAILABLE', MASTER: 'UNKNOWN' },
            }),
          ),
    )
    await click('Refresh status')
    expect(container.textContent).toContain('Storage unavailable')
  })
})
