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
  vi.useRealTimers()
})

describe('whole-site storage boundary', () => {
  async function startPendingCloudSetup() {
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
    expect(container.textContent).toContain('Sign in to continue')
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
      expect(container.textContent).toContain('Sign in to continue')
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
