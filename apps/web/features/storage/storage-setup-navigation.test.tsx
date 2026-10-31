import '@/i18n'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StorageSnapshot } from '@/service/storage-client'

import { createAuthStore, useAuthStore } from '@/stores/auth-store'

import { ConfigurationTransfer } from './configuration-transfer'
import { StorageBoundary } from './storage-gate'

const features = vi.hoisted(() => ({ configurationTransfer: false }))
vi.mock('@/utils/release-features', () => ({ releaseFeatures: features }))
const route = vi.hoisted(() => ({ pathname: '/overview', href: '/overview' }))
const cloudNavigation = vi.hoisted(() => ({ redirect: vi.fn() }))
const installationNavigation = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock('@/utils/installation-navigation', async (original) => ({
  ...(await original<typeof import('@/utils/installation-navigation')>()),
  replaceWithInstallationLogin: installationNavigation.redirect,
}))
vi.mock('@/utils/cloud-console', () => ({
  cloudConsoleUrl: 'https://dev.cloud.tapstate.com/',
  replaceWithCloudConsole: cloudNavigation.redirect,
}))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: route }),
  Link: ({
    children,
    to,
    search,
  }: {
    children: ReactNode
    to: string
    search?: { redirect?: string }
  }) => (
    <a href={search?.redirect ? `${to}?redirect=${encodeURIComponent(search.redirect)}` : to}>
      {children}
    </a>
  ),
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
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(10)
    else await new Promise((resolve) => setTimeout(resolve, 10))
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
  features.configurationTransfer = false
  cloudNavigation.redirect.mockClear()
  installationNavigation.redirect.mockClear()
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
  route.href = '/overview'
})
afterEach(() => {
  act(() => root.unmount())
  client.clear()
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('whole-site storage boundary', () => {
  it.each(['OP', 'CLOUD'] as const)(
    'hides Transfer throughout %s setup, initialization and recovery',
    async (mode) => {
      useAuthStore.setState({ profile: mode === 'CLOUD' ? 'cloud' : 'on-prem' })
      let snapshot = state({ mode })
      fetcher.mockImplementation(async (url) =>
        String(url) === '/auth/storage-entry'
          ? Response.json({ mode, management: false, entry: 'LOGIN' })
          : Response.json(snapshot),
      )
      for (const businessPhase of [
        'NOT_CONFIGURED',
        'PREPARING',
        'AWAITING_REBUILD_CONFIRMATION',
      ] as const) {
        snapshot = state({
          mode,
          stateVersion: snapshot.stateVersion + 1,
          setupPhase: 'STORAGE_BOUND',
          businessPhase,
          allowedActions: [
            'storage.setup.commit',
            'configuration.export',
            'configuration.import.preflight',
            'configuration.import.commit',
            'configuration.import.status',
            ...(businessPhase === 'AWAITING_REBUILD_CONFIRMATION' ? ['storage.recovery.plan'] : []),
          ],
        })
        if (businessPhase === 'NOT_CONFIGURED') await render()
        else await click('Refresh status')
        expect(container.textContent).not.toContain('Transfer configuration')
        expect(container.querySelector('input[type="file"]')).toBeNull()
        expect(container.querySelector('h1')).toBeTruthy()
        if (businessPhase === 'AWAITING_REBUILD_CONFIRMATION')
          expect(container.textContent).toContain('Recover runtime storage and pipelines')
      }
      expect(fetcher.mock.calls.some(([url]) => String(url).includes('/configuration/'))).toBe(
        false,
      )
    },
  )
  it('preserves an OP deep link for sign-in', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    route.pathname = '/pipelines/orders/edit'
    route.href = '/pipelines/orders/edit?tab=logs'
    await render()
    const link = container.querySelector('a[href^="/login"]')
    expect(link?.getAttribute('href')).toBe(
      '/login?redirect=%2Fpipelines%2Forders%2Fedit%3Ftab%3Dlogs',
    )
  })
  it('automatically leaves the installation listener after the first administrator is complete', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    fetcher.mockImplementation(async () =>
      Response.json({
        mode: 'OP',
        management: true,
        entry: 'LOGIN',
        automaticAuthorization: true,
        normalLoginUrl: 'http://127.0.0.1:50690/login',
      }),
    )
    await render()
    expect(installationNavigation.redirect).toHaveBeenCalledWith('http://127.0.0.1:50690/login')
    expect(fetcher.mock.calls.every(([url]) => String(url) === '/auth/storage-entry')).toBe(true)
  })

  it('opens storage setup directly when the dedicated OP listener supplies local installation authority', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? Response.json({
            mode: 'OP',
            management: true,
            entry: 'SETUP_REQUIRED',
            automaticAuthorization: true,
          })
        : Response.json(
            state({
              setupPhase: 'LOCAL_SETUP',
              bindingVersion: 0,
              authGeneration: 0,
              businessPhase: 'NOT_CONFIGURED',
              allowedActions: ['storage.test', 'storage.setup.commit'],
            }),
          ),
    )
    await render()
    expect(container.textContent).toContain('Set up cluster storage')
    expect(container.textContent).not.toContain('Continue as the installation administrator')
    expect(container.textContent).not.toContain('Installation credential')
  })

  it('labels the protected Cloud read while waiting for authoritative storage state', async () => {
    useAuthStore.setState({ profile: 'cloud' })
    let finish!: (response: Response) => void
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? Response.json({ mode: 'CLOUD', management: false, entry: 'LOGIN' })
        : new Promise<Response>((resolve) => {
            finish = resolve
          }),
    )
    await render()
    expect(container.textContent).toContain('Loading your Cluster')
    expect(container.textContent).not.toContain('Checking storage')
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
    await act(async () => finish(Response.json(state({ mode: 'CLOUD' }))))
    await settle()
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
  })
  async function startPendingCloudSetup(contextResponse?: Promise<Response>) {
    useAuthStore.setState({ profile: 'cloud' })
    const setup = {
      snapshot: state({
        mode: 'CLOUD',
        bindingVersion: 0,
        authGeneration: 0,
        setupPhase: 'CONFIG_PREPARED',
        businessPhase: 'NOT_CONFIGURED',
        health: { CONFIG: 'AVAILABLE', CACHE: 'UNKNOWN', MASTER: 'UNKNOWN' },
        allowedActions: ['storage.test', 'storage.setup.commit'],
      }),
      entry: 'SETUP_REQUIRED',
      statusFailure: false,
      testFailure: false,
      complete: (_response: Response): void => {
        throw new Error('No submission')
      },
    }
    fetcher.mockImplementation(async (url, init) => {
      if (String(url) === '/api/cluster/context')
        return (
          contextResponse ??
          Response.json({
            organizationId: 'org',
            clusterId: 'cluster',
            organizationName: 'Organization',
            clusterName: 'Cluster',
            region: 'region',
            clusterState: 'DEGRADED',
          })
        )
      if (String(url) === '/auth/storage-entry')
        return Response.json({ mode: 'CLOUD', management: false, entry: setup.entry })
      if (String(url) === '/api/storage/status')
        return setup.statusFailure
          ? Response.json({ code: 'control.storage-unavailable' }, { status: 503 })
          : Response.json(setup.snapshot)
      if (String(url) === '/api/storage/test') {
        if (setup.testFailure)
          return Response.json({ code: 'control.storage-test-failed' }, { status: 400 })
        const body = JSON.parse(String(init?.body))
        return Response.json({
          layer: body.layer,
          testStamp: 'proof-' + body.layer,
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          checks: [],
        })
      }
      if (String(url) === '/api/storage/setup/commit')
        return new Promise((resolve) => {
          setup.complete = resolve
        })
      throw new Error('Unexpected request ' + String(url))
    })
    await render()
    await input(
      container.querySelector<HTMLInputElement>('input[type="password"]')!,
      'mongodb+srv://user:secret@cluster/admin',
    )
    for (const button of [...container.querySelectorAll('button')].filter(
      (x) => x.textContent === 'Test connection',
    ))
      await act(async () => button.click())
    await click('Save storage settings')
    return setup
  }

  it.each([true, false])(
    'retains passed checks while Cloud context is pending without submitting before validation (valid=%s)',
    async (valid) => {
      let resolveContext!: (response: Response) => void
      await startPendingCloudSetup(
        new Promise((resolve) => {
          resolveContext = resolve
        }),
      )
      for (const name of ['Durable cache', 'Application data']) {
        expect(healthCard(name).textContent).toContain('Connection checks passed')
        expect(healthCard(name).querySelector('time')).not.toBeNull()
      }
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(0)
      await act(async () =>
        resolveContext(
          valid
            ? Response.json({
                organizationId: 'org',
                clusterId: 'cluster',
                organizationName: 'Organization',
                clusterName: 'Cluster',
                region: 'region',
                clusterState: 'DEGRADED',
              })
            : Response.json({}, { status: 503 }),
        ),
      )
      await settle()
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(valid ? 1 : 0)
      if (!valid)
        expect(healthCard('Durable cache').textContent).not.toContain('Connection checks passed')
    },
  )

  function initializing(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
    return state({
      mode: 'CLOUD',
      setupPhase: 'STORAGE_BOUND',
      businessPhase: 'PREPARING',
      health: { CONFIG: 'AVAILABLE', CACHE: 'UNKNOWN', MASTER: 'UNKNOWN' },
      allowedActions: ['storage.status', 'storage.setup.commit'],
      initializationProgress: {
        operationId: 'setup',
        generation: 1,
        attemptId: 'attempt-one',
        state: 'RUNNING',
        observedAt: new Date().toISOString(),
        elapsedMillis: 6000,
        restored: false,
        milestones: [
          { id: 'SAVE_SETTINGS', state: 'COMPLETE', elapsedMillis: 2000, errorCode: null },
          { id: 'PREPARE_STORAGE', state: 'RUNNING', elapsedMillis: 4000, errorCode: null },
          { id: 'START_RUNTIME', state: 'PENDING', elapsedMillis: null, errorCode: null },
          { id: 'PUBLISH_READY', state: 'PENDING', elapsedMillis: null, errorCode: null },
        ],
        connectionChecks: ['CONFIG', 'CACHE', 'MASTER'].map((layer) => ({
          layer: layer as 'CONFIG' | 'CACHE' | 'MASTER',
          checkedAt: '2026-10-27T00:00:00Z',
        })),
      },
      ...overrides,
    })
  }

  it('does not call a later outage a restart after Save was definitively refused', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    let disconnected = false
    fetcher.mockImplementation(async (url, init) => {
      if (disconnected) throw new TypeError('unrelated outage')
      if (String(url) === '/auth/storage-entry')
        return Response.json({
          mode: 'OP',
          management: true,
          entry: 'SETUP_REQUIRED',
          automaticAuthorization: true,
        })
      if (String(url) === '/api/storage/test')
        return Response.json({
          layer: JSON.parse(String(init?.body)).layer,
          testStamp: 'proof',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          checks: [],
        })
      if (String(url) === '/api/storage/setup/commit')
        return Response.json({ code: 'control.storage-test-failed' }, { status: 400 })
      return Response.json(
        state({
          setupPhase: 'LOCAL_SETUP',
          businessPhase: 'NOT_CONFIGURED',
          bindingVersion: 0,
          authGeneration: 0,
          allowedActions: ['storage.test', 'storage.setup.commit'],
        }),
      )
    })
    await render()
    await input(container.querySelector('input')!, 'mongodb://localhost/')
    await click('Test connection')
    await click('Save storage settings')
    disconnected = true
    await click('Refresh status')
    expect(container.textContent).not.toContain(
      'Restarting the service. Reconnecting automatically',
    )
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('keeps OP restart milestones spinning and retries reads without showing a transient disconnect', async () => {
    vi.useFakeTimers()
    useAuthStore.setState({ isAuthenticated: false })
    let disconnected = false
    fetcher.mockImplementation(async () => {
      if (disconnected) throw new TypeError('connection closed during restart')
      return Response.json({
        mode: 'OP',
        management: true,
        entry: 'UNAVAILABLE',
        initializationProgress: initializing().initializationProgress,
      })
    })
    await render()
    disconnected = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })
    await settle()
    expect(container.textContent).toContain('Restarting the service. Reconnecting automatically')
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.textContent).not.toContain('The server response could not be confirmed')
    expect(container.querySelector('.animate-spin')).not.toBeNull()
    const before = fetcher.mock.calls.length
    disconnected = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })
    await settle()
    expect(fetcher.mock.calls.length).toBeGreaterThan(before)
    expect(container.textContent).not.toContain(
      'Restarting the service. Reconnecting automatically',
    )
    expect(fetcher.mock.calls.every(([url]) => String(url) === '/auth/storage-entry')).toBe(true)
  })

  it('restores OP restart milestones without an installation secret or protected status read', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    const progress = initializing().initializationProgress!
    fetcher.mockImplementation(async () =>
      Response.json({
        mode: 'OP',
        management: true,
        entry: 'UNAVAILABLE',
        initializationProgress: progress,
      }),
    )
    await render()
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.textContent).toContain('Restart and register data connectors')
    expect(container.textContent).not.toContain('Return to Cloud')
    expect(fetcher.mock.calls.every(([url]) => String(url) === '/auth/storage-entry')).toBe(true)
    expect(container.querySelector('input')).toBeNull()
  })

  it('restores server milestones after closing the pending page without submitting again', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
      'Prepare runtime storage',
    )
    await act(async () => root.unmount())
    client.clear()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    root = createRoot(container)
    await render()
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.textContent).toContain('0:06')
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(container.querySelector('button[type="submit"]')).toBeNull()
    expect(healthCard('Durable cache').textContent).toContain('Connection checks passed')
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    setup.snapshot = state({ mode: 'CLOUD', stateVersion: 12 })
    await act(async () => vi.advanceTimersByTimeAsync(3100))
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
    await settle()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(cloudNavigation.redirect).not.toHaveBeenCalled()
  })

  it('keeps polling after reopening while the first save has not published its binding', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    const progress = initializing().initializationProgress!
    progress.milestones = progress.milestones.map((step, index) => ({
      ...step,
      state: index === 0 ? 'RUNNING' : 'PENDING',
      elapsedMillis: index === 0 ? 6000 : null,
    }))
    setup.snapshot = initializing({
      setupPhase: 'CONFIG_PREPARED',
      businessPhase: 'NOT_CONFIGURED',
      bindingVersion: 0,
      authGeneration: 0,
      stateVersion: 11,
      initializationProgress: progress,
    })
    await click('Refresh status')
    await act(async () => root.unmount())
    client.clear()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    root = createRoot(container)
    await render()
    expect(container.textContent).toContain('0 of 4 steps completed')
    const reads = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
    setup.snapshot = initializing({ stateVersion: 12 })
    await act(async () => vi.advanceTimersByTimeAsync(3100))
    expect(
      fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length,
    ).toBeGreaterThan(reads)
    expect(container.textContent).toContain('1 of 4 steps completed')
    setup.snapshot = state({ mode: 'CLOUD', stateVersion: 13 })
    await act(async () => vi.advanceTimersByTimeAsync(3100))
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('uses an original Cloud handoff once after temporary-session retirement, never on a storage outage', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    setup.entry = 'UNAVAILABLE'
    await act(async () => useAuthStore.getState().clear())
    await settle()
    expect(cloudNavigation.redirect).not.toHaveBeenCalled()
    const statuses = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
    setup.entry = 'LOGIN'
    await act(async () => vi.advanceTimersByTimeAsync(10100))
    expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
      'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
    )
    await act(async () => vi.advanceTimersByTimeAsync(30000))
    expect(cloudNavigation.redirect).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')).toHaveLength(
      statuses,
    )
  })

  it('shows the last confirmed milestones during a transient read failure without admitting business', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    setup.statusFailure = true
    await click('Refresh status')
    expect(container.textContent).toContain('The last confirmed state is shown')
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
  })

  it('keeps tracking the original running setup after a gateway timeout without showing refusal', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    await act(async () =>
      setup.complete(new Response('<html>Gateway timeout</html>', { status: 504 })),
    )
    await settle()
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.textContent).toContain('Initialization is still running')
    expect(container.textContent).not.toContain('The request was refused')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    expect(container.querySelector('button[type="submit"]')).toBeNull()
    setup.snapshot = initializing({ stateVersion: 12 })
    setup.snapshot.initializationProgress!.state = 'FAILED'
    setup.snapshot.initializationProgress!.milestones[1] = {
      id: 'PREPARE_STORAGE',
      state: 'FAILED',
      elapsedMillis: 4000,
      errorCode: 'control.storage-unavailable',
    }
    await click('Refresh status')
    expect(container.textContent).toContain('Failed — action required')
    expect(container.textContent).not.toContain('Initialization is still running')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('shows an unconfirmed proxy response when no running operation has been observed', async () => {
    const setup = await startPendingCloudSetup()
    await act(async () =>
      setup.complete(new Response('<html>Gateway timeout</html>', { status: 504 })),
    )
    await settle()
    expect(container.textContent).toContain('The server response could not be confirmed')
    expect(container.textContent).not.toContain('Initialization is still running')
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it.each([400, 403, 409])('keeps a genuine setup refusal visible (%s)', async (status) => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    await act(async () =>
      setup.complete(Response.json({ code: 'control.storage-tests-required' }, { status })),
    )
    await settle()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Initialization is still running')
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('does not redirect a refused setup that has no accepted server operation', async () => {
    const setup = await startPendingCloudSetup()
    await act(async () =>
      setup.complete(Response.json({ code: 'control.storage-tests-required' }, { status: 400 })),
    )
    await settle()
    setup.entry = 'LOGIN'
    await act(async () => useAuthStore.getState().clear())
    await settle()
    expect(cloudNavigation.redirect).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Sign in to continue')
  })

  it('continues an explicitly dispatched setup when authentication publishes before the first progress poll', async () => {
    const setup = await startPendingCloudSetup()
    setup.entry = 'LOGIN'
    const statuses = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
    await act(async () => useAuthStore.getState().clear())
    await settle()
    expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
      'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
    )
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')).toHaveLength(
      statuses,
    )
    await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
    await settle()
    expect(cloudNavigation.redirect).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('handles the real HTTP 401 adapter during a pending setup without replaying the write', async () => {
    const authentication = createAuthStore({
      profile: 'cloud',
      storage: null,
      fetcher: (...args) => fetcher(...args),
    })
    const unsubscribe = authentication.subscribe((value) =>
      useAuthStore.setState({
        isAuthenticated: value.isAuthenticated,
        sessionRevision: value.sessionRevision,
      }),
    )
    useAuthStore.setState({ apiFetch: authentication.getState().apiFetch })
    try {
      const setup = await startPendingCloudSetup()
      setup.entry = 'LOGIN'
      const original = fetcher.getMockImplementation()!
      fetcher.mockImplementation(async (url, init) =>
        String(url) === '/api/storage/status'
          ? Response.json({ code: 'control.unauthenticated' }, { status: 401 })
          : original(url, init),
      )
      await click('Refresh status')
      await settle()
      expect(authentication.getState().isAuthenticated).toBe(false)
      expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
        'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
      )
      await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
      await settle()
      expect(cloudNavigation.redirect).toHaveBeenCalledTimes(1)
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(1)
    } finally {
      unsubscribe()
    }
  })

  it('retains independently observed running work after a refused response', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    await act(async () =>
      setup.complete(Response.json({ code: 'control.conflict' }, { status: 409 })),
    )
    await settle()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    setup.entry = 'LOGIN'
    await act(async () => useAuthStore.getState().clear())
    await settle()
    expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
      'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
    )
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('retains the last setup milestones while rediscovering the entry after session retirement', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    let finishEntry!: (response: Response) => void
    const original = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, init) =>
      String(url) === '/auth/storage-entry' && !useAuthStore.getState().isAuthenticated
        ? new Promise<Response>((resolve) => {
            finishEntry = resolve
          })
        : original(url, init),
    )
    await act(async () => useAuthStore.getState().clear())
    await settle()
    expect(container.textContent).toContain('Continuing to your cluster')
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.textContent).not.toContain('Checking storage')
    expect(cloudNavigation.redirect).not.toHaveBeenCalled()
    await act(async () =>
      finishEntry(Response.json({ mode: 'CLOUD', management: false, entry: 'LOGIN' })),
    )
    await settle()
    expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
      'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
    )
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('restores server progress after a fresh document without replaying the original submission', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({ stateVersion: 11 })
    await click('Refresh status')
    expect(container.textContent).toContain('1 of 4 steps completed')
    await act(async () => root.unmount())
    client.clear()
    root = createRoot(container)
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    useAuthStore.setState({ isAuthenticated: false, sessionRevision: 1 })
    let finishEntry!: (response: Response) => void
    const original = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, init) =>
      String(url) === '/auth/storage-entry'
        ? new Promise<Response>((resolve) => {
            finishEntry = resolve
          })
        : original(url, init),
    )
    const statusReads = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
    await render()
    expect(container.textContent).toContain('Loading your Cluster')
    expect(container.textContent).not.toContain('1 of 4 steps completed')
    await act(async () =>
      finishEntry(Response.json({ mode: 'CLOUD', management: false, entry: 'LOGIN' })),
    )
    await settle()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')).toHaveLength(
      statusReads,
    )
    fetcher.mockImplementation(original)
    await act(async () => useAuthStore.setState({ isAuthenticated: true, sessionRevision: 2 }))
    await settle()
    expect(container.textContent).toContain('1 of 4 steps completed')
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    setup.snapshot = initializing({ stateVersion: 12, businessPhase: 'READY' })
    await click('Refresh status')
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    await act(async () => setup.complete(Response.json(setup.snapshot)))
  })

  it.each(['automatic retry', 'manual return'])(
    'retains continuation progress during an entry outage and preserves the target on %s',
    async (recovery) => {
      vi.useFakeTimers()
      const setup = await startPendingCloudSetup()
      setup.snapshot = initializing({ stateVersion: 11 })
      await click('Refresh status')
      const original = fetcher.getMockImplementation()!
      let outage = true
      fetcher.mockImplementation(async (url, init) =>
        String(url) === '/auth/storage-entry' && !useAuthStore.getState().isAuthenticated
          ? outage
            ? Response.json({ code: 'control.storage-unavailable' }, { status: 503 })
            : Response.json({ mode: 'CLOUD', management: false, entry: 'LOGIN' })
          : original(url, init),
      )
      await act(async () => useAuthStore.getState().clear())
      await settle()
      expect(container.textContent).toContain('1 of 4 steps completed')
      expect(container.textContent).toContain('Updating sign-in')
      expect(container.querySelector('[role="alert"]')).not.toBeNull()
      expect(cloudNavigation.redirect).not.toHaveBeenCalled()
      const statuses = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
      if (recovery === 'automatic retry') {
        outage = false
        await act(async () => vi.advanceTimersByTimeAsync(10100))
      } else await click('Return to Cloud sign-in')
      expect(cloudNavigation.redirect).toHaveBeenCalledExactlyOnceWith(
        'https://dev.cloud.tapstate.com/?organizationId=org&enterClusterId=cluster',
      )
      expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')).toHaveLength(
        statuses,
      )
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(1)
    },
  )

  it('shows failed server work and retains explicit continuation instead of an endless waiting form', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    const snapshot = initializing({ stateVersion: 11 })
    snapshot.initializationProgress!.state = 'FAILED'
    snapshot.initializationProgress!.milestones[1] = {
      id: 'PREPARE_STORAGE',
      state: 'FAILED',
      elapsedMillis: 4000,
      errorCode: 'control.storage-unavailable',
    }
    setup.snapshot = snapshot
    await click('Refresh status')
    await act(async () =>
      setup.complete(Response.json({ code: 'control.storage-unavailable' }, { status: 503 })),
    )
    await settle()
    expect(container.textContent).toContain('Failed — action required')
    expect(container.textContent).toContain('Continue saved storage setup')
    expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    const requests = fetcher.mock.calls.length
    await act(async () => vi.advanceTimersByTimeAsync(20000))
    expect(fetcher.mock.calls).toHaveLength(requests)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  function healthCard(name: string) {
    const card = [...container.querySelectorAll('dl > div')].find(
      (element) => element.querySelector('dt')?.textContent === name,
    )
    expect(card, name).toBeTruthy()
    return card!
  }

  it('retains completed connection tests and their times while the original setup is pending', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    const checkedAt = healthCard('Durable cache').querySelector('time')?.dateTime
    expect(checkedAt).toBeTruthy()
    for (const name of ['Durable cache', 'Application data']) {
      expect(healthCard(name).textContent).toContain('Connection checks passed')
      expect(healthCard(name).textContent).not.toContain('Not verified')
    }
    setup.snapshot = {
      ...setup.snapshot,
      businessPhase: 'PREPARING',
      setupPhase: 'STORAGE_BOUND',
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 11,
    }
    await click('Refresh status')
    // The test is a historical result; expiry of its submission proof cannot erase it.
    vi.setSystemTime(Date.now() + 660000)
    await click('Refresh status')
    expect(healthCard('Durable cache').querySelector('time')?.dateTime).toBe(checkedAt)
    setup.statusFailure = true
    await click('Refresh status')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    setup.statusFailure = false
    await click('Refresh status')
    for (const name of ['Durable cache', 'Application data']) {
      expect(healthCard(name).textContent).toContain('Connection checks passed')
      expect(healthCard(name).textContent).toContain('Runtime preparation is still in progress')
    }
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it('shows a current storage failure instead of an earlier successful setup check', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      businessPhase: 'PREPARING',
      stateVersion: 11,
      health: { CONFIG: 'AVAILABLE', CACHE: 'UNAVAILABLE', MASTER: 'UNAVAILABLE' },
      applicationDataVerification: {
        status: 'FAILED',
        checkedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 600000).toISOString(),
      },
    }
    await click('Refresh status')
    for (const name of ['Durable cache', 'Application data']) {
      expect(healthCard(name).textContent).not.toContain('Connection checks passed')
      expect(healthCard(name).querySelector('.text-destructive')).not.toBeNull()
    }
  })

  it('shows the passed cache connection while the authenticated runtime is still starting', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = initializing({
      businessPhase: 'AUTH_READY',
      stateVersion: 11,
      health: { CONFIG: 'AVAILABLE', CACHE: 'AUTH_READY', MASTER: 'UNKNOWN' },
    })
    await click('Refresh status')
    const cache = healthCard('Durable cache')
    expect(cache.textContent).toContain('Connection checks passed')
    expect(cache.querySelector('time')?.dateTime).toBe('2026-10-27T00:00:00Z')
    expect(cache.textContent).toContain('Runtime preparation is still in progress')
    expect(cache.textContent).not.toContain('Sign-in ready; business not ready')
  })

  it.each([
    { operationId: 'another-setup' },
    { setupGeneration: 2 },
    { bindingVersion: 2 },
    { authGeneration: 2 },
  ])('does not carry setup check results into a changed scope: %j', async (changed) => {
    const setup = await startPendingCloudSetup()
    expect(healthCard('Durable cache').textContent).toContain('Connection checks passed')
    setup.snapshot = {
      ...setup.snapshot,
      businessPhase: 'PREPARING',
      stateVersion: 11,
      ...changed,
    }
    await click('Refresh status')
    for (const name of ['Durable cache', 'Application data'])
      expect(healthCard(name).textContent).not.toContain('Connection checks passed')
  })

  it('does not restore old check results when an earlier operation is seen again', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      operationId: 'another-setup',
      businessPhase: 'PREPARING',
      stateVersion: 11,
    }
    await click('Refresh status')
    setup.snapshot = { ...setup.snapshot, operationId: 'setup', stateVersion: 12 }
    await click('Refresh status')
    expect(healthCard('Durable cache').textContent).not.toContain('Connection checks passed')
  })

  it('does not carry check results into another authenticated session or Cluster', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      clusterId: 'another-cluster',
      businessPhase: 'PREPARING',
    }
    await act(async () => useAuthStore.setState({ sessionRevision: 1 }))
    await settle()
    for (const name of ['Durable cache', 'Application data'])
      expect(healthCard(name).textContent).not.toContain('Connection checks passed')
  })

  it('automatically follows a pending setup beyond twelve updates without submitting it again', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    const statusCount = () =>
      fetcher.mock.calls.filter(([url]) => url === '/api/storage/status').length
    const before = statusCount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(statusCount()).toBeGreaterThan(before)
    expect(container.querySelector('[role="status"] svg')).not.toBeNull()
    setup.snapshot = {
      ...setup.snapshot,
      businessPhase: 'PREPARING',
      setupPhase: 'STORAGE_BOUND',
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 11,
    }
    for (let i = 0; i < 15; i++)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100)
      })
    expect(statusCount()).toBeGreaterThan(14)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    setup.snapshot = state({ mode: 'CLOUD', stateVersion: 12 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    const readyCount = statusCount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(statusCount()).toBe(readyCount)
  })
  it('automatically enters the business page when sign-in-ready storage becomes ready', async () => {
    vi.useFakeTimers()
    let snapshot = state({ businessPhase: 'AUTH_READY' })
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry' ? entry() : Response.json(snapshot),
    )
    await render()
    expect(container.querySelector('[role="status"] svg')).not.toBeNull()
    snapshot = state({ stateVersion: 11 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
  })
  it('rechecks a transient startup read failure but stops on lost permission', async () => {
    vi.useFakeTimers()
    let status = 200
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : status === 200
          ? Response.json(state({ businessPhase: 'PREPARING' }))
          : Response.json({ code: 'control.storage-unavailable' }, { status }),
    )
    await render()
    status = 503
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    status = 200
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10100)
    })
    expect(container.querySelector('[role="alert"]')).toBeNull()
    status = 403
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    const calls = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetcher.mock.calls).toHaveLength(calls)
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
  })

  it.each([
    'AWAITING_REBUILD_CONFIRMATION',
    'RESTART_REQUIRED',
    'FIRST_ADMIN_REQUIRED',
    'CLEANUP_REQUIRED',
    'UNAVAILABLE',
  ] as const)(
    'does not animate or poll a phase that requires intervention: %s',
    async (businessPhase) => {
      vi.useFakeTimers()
      fetcher.mockImplementation(async (url) =>
        String(url) === '/auth/storage-entry' ? entry() : Response.json(state({ businessPhase })),
      )
      await render()
      const calls = fetcher.mock.calls.length
      expect(container.querySelector('[role="status"] svg')).toBeNull()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(fetcher.mock.calls).toHaveLength(calls)
      expect(container.querySelector('[data-testid="business"]')).toBeNull()
    },
  )
  it('recovers from an initial network read failure without a reload or another write', async () => {
    vi.useFakeTimers()
    let failed = true
    fetcher.mockImplementation(async (url) => {
      if (failed) throw new TypeError('network unavailable')
      return String(url) === '/auth/storage-entry' ? entry() : Response.json(state())
    })
    await render()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    failed = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10100)
    })
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    expect(
      fetcher.mock.calls.every(([url]) =>
        ['/auth/storage-entry', '/api/storage/status'].includes(String(url)),
      ),
    ).toBe(true)
  })

  it('stops waiting when cleanup is required even while the original commit response is pending', async () => {
    vi.useFakeTimers()
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      businessPhase: 'CLEANUP_REQUIRED',
      stateVersion: 11,
      allowedActions: ['storage.status'],
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(container.textContent).toContain('Cleanup needs verification')
    expect(container.querySelector('[role="status"] svg')).toBeNull()
    const calls = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetcher.mock.calls).toHaveLength(calls)
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })
  it('does not restart polling after a transient manual read failure in a known intervention state', async () => {
    vi.useFakeTimers()
    let failed = false
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry()
        : failed
          ? Response.json({ code: 'control.storage-unavailable' }, { status: 503 })
          : Response.json(state({ businessPhase: 'AWAITING_REBUILD_CONFIRMATION' })),
    )
    await render()
    failed = true
    await click('Refresh status')
    const calls = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetcher.mock.calls).toHaveLength(calls)
  })

  it('stops polling when the management entry requires restart without returning another snapshot', async () => {
    vi.useFakeTimers()
    let restart = false
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? entry(true, restart ? 'RESTART_REQUIRED' : 'SETUP_REQUIRED')
        : Response.json(state({ setupPhase: 'STORAGE_BOUND', businessPhase: 'PREPARING' })),
    )
    await render()
    await input(container.querySelector('input')!, 'owner-secret')
    await click('Continue')
    restart = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(container.textContent).toContain('Restart required')
    const calls = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetcher.mock.calls).toHaveLength(calls)
  })

  it('automatically rechecks a failed entry read after the installation owner provides a capability', async () => {
    vi.useFakeTimers()
    useAuthStore.setState({ isAuthenticated: false, token: null })
    let failed = false
    fetcher.mockImplementation(async (url) =>
      String(url) === '/auth/storage-entry'
        ? failed
          ? new Response('', { status: 503 })
          : entry(true, 'SETUP_REQUIRED')
        : Response.json(state({ businessPhase: 'PREPARING' })),
    )
    await render()
    await input(container.querySelector('input')!, 'owner-secret')
    failed = true
    await click('Continue')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    failed = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10100)
    })
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.textContent).toContain('Preparing storage')
    const statuses = fetcher.mock.calls.filter(([url]) => url === '/api/storage/status')
    expect(statuses).toHaveLength(1)
    expect(new Headers(statuses[0][1]?.headers).get('X-Tapstate-Setup-Capability')).toBe(
      'owner-secret',
    )
    expect(
      fetcher.mock.calls.every(([url]) =>
        ['/auth/storage-entry', '/api/storage/status'].includes(String(url)),
      ),
    ).toBe(true)
  })

  it('rediscovers the public Cloud sign-in entry after a temporary handoff outage without protected requests', async () => {
    vi.useFakeTimers()
    useAuthStore.setState({ profile: 'cloud', isAuthenticated: false, token: null })
    let currentEntry = 'UNAVAILABLE'
    fetcher.mockImplementation(async (url) => {
      expect(String(url)).toBe('/auth/storage-entry')
      return Response.json({ mode: 'CLOUD', management: false, entry: currentEntry })
    })
    await render()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    currentEntry = 'LOGIN'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10100)
    })
    expect(container.textContent).toContain('Sign in to continue')
    expect(container.textContent).toContain('Return to Cloud sign-in')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    const calls = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(fetcher.mock.calls).toHaveLength(calls)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it.each([401, 403, 409])(
    'does not retry a refused public entry (%s) while signed out',
    async (status) => {
      vi.useFakeTimers()
      useAuthStore.setState({ profile: 'cloud', isAuthenticated: false, token: null })
      fetcher.mockResolvedValue(new Response('', { status }))
      await render()
      const calls = fetcher.mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(fetcher.mock.calls).toHaveLength(calls)
      expect(container.querySelector('[data-testid="business"]')).toBeNull()
    },
  )
  it('keeps the Cloud sign-in action during an initial public entry network outage', async () => {
    vi.useFakeTimers()
    useAuthStore.setState({ profile: 'cloud', isAuthenticated: false, token: null })
    fetcher.mockRejectedValue(new TypeError('network unavailable'))
    await render()
    expect(container.textContent).toContain('Return to Cloud sign-in')
    expect(container.querySelector('a[href="/login"]')).toBeNull()
  })

  it('keeps the original setup submission across binding publication without reopening an empty form', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      setupPhase: 'STORAGE_BOUND',
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 11,
      businessPhase: 'PREPARING',
    }
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['storage'] })
    })
    await settle()
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(container.querySelector('button[type="submit"]')).toBeNull()
    expect(container.textContent).toContain('The database settings are saved')
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
    // More read-side refreshes cannot create another write or retire the pending submission.
    for (let i = 0; i < 12; i++)
      await act(async () => {
        await client.invalidateQueries({ queryKey: ['storage'] })
      })
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    setup.entry = 'LOGIN'
    await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
    await settle()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(container.textContent).toContain('Continuing to your cluster')
    expect(container.querySelector('[data-testid="business"]')).toBeNull()
    setup.snapshot = state({ mode: 'CLOUD', stateVersion: 12 })
    await act(async () => useAuthStore.setState({ isAuthenticated: true, sessionRevision: 2 }))
    await settle()
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
  })

  it.each(['session', 'operation', 'setup generation', 'binding generation', 'auth generation'])(
    'does not accept the old setup response after a different %s',
    async (change) => {
      const setup = await startPendingCloudSetup()
      if (change === 'session') await act(async () => useAuthStore.setState({ sessionRevision: 1 }))
      else {
        setup.snapshot = {
          ...setup.snapshot,
          stateVersion: 11,
          ...(change === 'operation' ? { operationId: 'another-operation' } : {}),
          ...(change === 'setup generation' ? { setupGeneration: 2 } : {}),
          ...(['binding generation', 'auth generation'].includes(change)
            ? {
                setupPhase: 'STORAGE_BOUND',
                businessPhase: 'PREPARING',
                bindingVersion: change === 'binding generation' ? 2 : 1,
                authGeneration: change === 'auth generation' ? 2 : 1,
              }
            : {}),
        }
        await act(async () => {
          await client.invalidateQueries({ queryKey: ['storage'] })
        })
      }
      await settle()
      await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
      await settle()
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(container.querySelector('[data-testid="business"]')).toBeNull()
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(1)
    },
  )
  it.each(['completed snapshot', 'read failure'])(
    'keeps the accepted submission owner through a %s while its response is pending',
    async (change) => {
      const setup = await startPendingCloudSetup()
      if (change === 'read failure') setup.statusFailure = true
      else
        setup.snapshot = {
          ...setup.snapshot,
          setupPhase: 'COMPLETE',
          bindingVersion: 1,
          authGeneration: 1,
          stateVersion: 11,
          businessPhase: 'AUTH_READY',
          allowedActions: ['storage.status'],
        }
      await act(async () => {
        await client.invalidateQueries({ queryKey: ['storage'] })
      })
      await settle()
      expect(container.querySelector('input[type="password"]')).toBeNull()
      expect(container.querySelector('[data-testid="business"]')).toBeNull()
      setup.entry = 'LOGIN'
      await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
      await settle()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(container.textContent).toContain('Continuing to your cluster')
      expect(
        fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit'),
      ).toHaveLength(1)
    },
  )
  it('does not clear an already admitted session when the original setup response arrives late', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = state({ mode: 'CLOUD', stateVersion: 11 })
    setup.entry = 'LOGIN'
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['storage'] })
    })
    await settle()
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
    await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
    await settle()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(container.querySelector('[data-testid="business"]')).not.toBeNull()
  })
  it('retains an explicit original-operation continuation after a bound submission fails', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      setupPhase: 'STORAGE_BOUND',
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 11,
      businessPhase: 'PREPARING',
    }
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['storage'] })
    })
    await settle()
    await act(async () =>
      setup.complete(Response.json({ code: 'control.storage-unavailable' }, { status: 503 })),
    )
    await settle()
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe(
      'mongodb+srv://user:secret@cluster/admin',
    )
    expect(container.textContent).toContain('Continue saved storage setup')
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')).toHaveLength(
      1,
    )
    expect(healthCard('Durable cache').textContent).toContain('Connection checks passed')
    setup.testFailure = true
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Test connection')!
        .click(),
    )
    await settle()
    expect(container.textContent).toContain('Connection check failed')
    expect(healthCard('Durable cache').textContent).not.toContain('Connection checks passed')
    setup.testFailure = false
    for (const button of [...container.querySelectorAll('button')].filter(
      (x) => x.textContent === 'Test connection',
    ))
      await act(async () => button.click())
    await click('Continue original setup')
    const writes = fetcher.mock.calls.filter(([url]) => url === '/api/storage/setup/commit')
    expect(writes).toHaveLength(2)
    expect(JSON.parse(String(writes[1][1]?.body))).toEqual(JSON.parse(String(writes[0][1]?.body)))
    setup.entry = 'LOGIN'
    await act(async () => setup.complete(Response.json({ setupPhase: 'COMPLETE' })))
    await settle()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('discards submitted check evidence when continuation connection inputs are edited', async () => {
    const setup = await startPendingCloudSetup()
    setup.snapshot = {
      ...setup.snapshot,
      setupPhase: 'STORAGE_BOUND',
      bindingVersion: 1,
      authGeneration: 1,
      stateVersion: 11,
      businessPhase: 'PREPARING',
    }
    await click('Refresh status')
    await act(async () =>
      setup.complete(Response.json({ code: 'control.storage-unavailable' }, { status: 503 })),
    )
    await settle()
    expect(healthCard('Application data').textContent).toContain('Connection checks passed')
    await input(
      container.querySelector<HTMLInputElement>('input[type="password"]')!,
      'mongodb://other/admin',
    )
    for (const name of ['Durable cache', 'Application data'])
      expect(healthCard(name).textContent).not.toContain('Connection checks passed')
  })
  it('refreshes cached configuration projections when original import status proves committed', async () => {
    features.configurationTransfer = true
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
