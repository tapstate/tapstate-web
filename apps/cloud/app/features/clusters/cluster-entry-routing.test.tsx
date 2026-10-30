import { act, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  organizations: vi.fn(),
  clusters: vi.fn(),
  navigate: vi.fn(),
  identity: vi.fn(),
  oauthStart: vi.fn(),
  authenticated: undefined as undefined | ((user: unknown, setup?: boolean) => Promise<void>),
}))
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  redirect: (options: unknown) => ({ redirect: options }),
  useNavigate: () => mocks.navigate,
  Outlet: () => null,
}))
vi.mock('../../service/cloud-api', async (original) => {
  const actual = await original<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: {
      ...actual.cloudApi,
      me: mocks.me,
      oauthStart: mocks.oauthStart,
      registrationPolicy: vi.fn(async () => ({ trialCodeRequired: true })),
      organizations: mocks.organizations,
      activeClusters: mocks.clusters,
    },
  }
})
vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    darkMode: false,
    setDarkMode: vi.fn(),
    setIdentity: mocks.identity,
    activeOrganization: { id: 'org-b' },
    setClusters: vi.fn(),
  }),
}))
vi.mock('../../shell/cloud-console-shell', () => ({
  CloudConsoleShell: ({ children }: { children: import('react').ReactNode }) => (
    <div>{children}</div>
  ),
}))
vi.mock('./automatic-cluster-entry', () => ({
  AutomaticClusterEntry: () => <div>Continuing entry</div>,
}))
vi.mock('../auth/auth-page', () => ({
  AuthPage: ({
    onAuthenticated,
    onOAuth,
    organizationSetupRequired,
  }: {
    onAuthenticated: (user: unknown, setup?: boolean) => Promise<void>
    onOAuth: (provider: 'google', mode: 'login', invitation: null, defer: boolean) => Promise<void>
    organizationSetupRequired?: boolean
  }) => {
    mocks.authenticated = onAuthenticated
    return (
      <>
        <button
          onClick={() =>
            void onAuthenticated({ email: 'tester@example.invalid' }, organizationSetupRequired)
          }
        >
          Complete sign-in
        </button>
        <button onClick={() => void onOAuth('google', 'login', null, false)}>
          Provider sign-in
        </button>
      </>
    )
  },
}))

import type { ClusterEntrySearch } from './cluster-entry-intent'

import { Route as ConsoleRoute } from '../../routes/_console'
import { Route as AuthRoute } from '../../routes/auth'
import { CloudApiError } from '../../service/cloud-api'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const intent = { organizationId: 'org-b', enterClusterId: 'cluster-b' }
const load = (deps: ClusterEntrySearch) =>
  (ConsoleRoute.options.loader as (context: { deps: ClusterEntrySearch }) => Promise<unknown>)({
    deps,
  })
beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/auth')
  mocks.authenticated = undefined
  mocks.oauthStart.mockResolvedValue('https://provider.example/authorize')
  mocks.me.mockResolvedValue({ email: 'tester@example.invalid' })
  mocks.organizations.mockResolvedValue([
    { id: 'org-a', name: 'A' },
    { id: 'org-b', name: 'B' },
  ])
  mocks.clusters.mockResolvedValue([{ id: 'cluster-b', orgId: 'org-b', state: 'DEGRADED' }])
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Cloud initialization return routing', () => {
  it('preserves the target when the mounted Console session expires during entry', async () => {
    vi.useFakeTimers()
    vi.spyOn(ConsoleRoute, 'useSearch').mockReturnValue(intent)
    vi.spyOn(ConsoleRoute, 'useLoaderData').mockReturnValue({
      session: { email: 'tester@example.invalid' },
      organizations: [{ id: 'org-b', name: 'B' }],
      clusters: [{ id: 'cluster-b', orgId: 'org-b', state: 'DEGRADED' }],
    } as never)
    mocks.clusters.mockRejectedValue(new CloudApiError('Expired', 401))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const Console = ConsoleRoute.options.component as ComponentType
    try {
      await act(async () => root.render(<Console />))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10010)
      })
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/auth', search: intent })
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

  it('ignores a late poll failure after leaving the automatic entry target', async () => {
    vi.useFakeTimers()
    const search = vi.spyOn(ConsoleRoute, 'useSearch').mockReturnValue(intent)
    vi.spyOn(ConsoleRoute, 'useLoaderData').mockReturnValue({
      session: { email: 'tester@example.invalid' },
      organizations: [{ id: 'org-b', name: 'B' }],
      clusters: [{ id: 'cluster-b', orgId: 'org-b', state: 'DEGRADED' }],
    } as never)
    let fail!: (reason: unknown) => void
    mocks.clusters.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        }),
    )
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const Console = ConsoleRoute.options.component as ComponentType
    try {
      await act(async () => root.render(<Console />))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10010)
      })
      search.mockReturnValue({})
      await act(async () => root.render(<Console />))
      await act(async () => fail(new CloudApiError('Expired', 401)))
      expect(mocks.navigate).not.toHaveBeenCalled()
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
  it('selects the requested authorized organization rather than the first organization', async () => {
    await load(intent)
    expect(mocks.clusters).toHaveBeenCalledExactlyOnceWith('org-b')
  })

  it.each([{ organizations: [] }, { organizations: [{ id: 'org-a', name: 'A' }] }])(
    'refuses an inaccessible target organization without falling back: %j',
    async ({ organizations }) => {
      mocks.organizations.mockResolvedValue(organizations)
      await expect(load(intent)).rejects.toMatchObject({ status: 403 })
      expect(mocks.clusters).not.toHaveBeenCalled()
    },
  )

  it('preserves only the validated target when an expired Cloud session needs sign-in', async () => {
    mocks.me.mockRejectedValue(new CloudApiError('Expired', 401))
    await expect(load(intent)).rejects.toEqual({ redirect: { to: '/auth', search: intent } })
  })

  it('continues to the same target after normal sign-in completes', async () => {
    vi.spyOn(AuthRoute, 'useSearch').mockReturnValue(intent)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const Auth = AuthRoute.options.component as ComponentType
    try {
      await act(async () => root.render(<Auth />))
      await act(async () => host.querySelector('button')!.click())
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/', search: intent })
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
  it('completes required organization onboarding before attempting a retained Cluster target', async () => {
    vi.spyOn(AuthRoute, 'useSearch').mockReturnValue(intent)
    window.history.replaceState({}, '', '/auth?oauth=success&onboarding=organization')
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const Auth = AuthRoute.options.component as ComponentType
    try {
      await act(async () => root.render(<Auth />))
      await act(async () => host.querySelector('button')!.click())
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
        to: '/onboarding',
        search: { organizationId: undefined, subscriptionId: undefined, createOrganization: true },
      })
      expect(new URL(window.location.href).searchParams.has('onboarding')).toBe(false)
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

  it.each([undefined, true])(
    'ignores a completed sign-in after leaving Auth (setup=%s)',
    async (setup) => {
      vi.spyOn(AuthRoute, 'useSearch').mockReturnValue(intent)
      const host = document.createElement('div')
      document.body.append(host)
      const root = createRoot(host)
      const Auth = AuthRoute.options.component as ComponentType
      await act(async () => root.render(<Auth />))
      const complete = mocks.authenticated!
      await act(async () => root.unmount())
      host.remove()
      await act(async () => complete({ email: 'tester@example.invalid' }, setup))
      expect(mocks.identity).not.toHaveBeenCalled()
      expect(mocks.navigate).not.toHaveBeenCalled()
    },
  )

  it('keeps the original validated Cluster target through a provider callback', async () => {
    const search = vi.spyOn(AuthRoute, 'useSearch').mockReturnValue(intent)
    const actualWindow = window
    const location = { href: 'http://localhost/auth', assign: vi.fn() }
    vi.stubGlobal(
      'window',
      new Proxy(actualWindow, {
        get(target, key) {
          return key === 'location' ? location : Reflect.get(target, key, target)
        },
      }),
    )
    const host = document.createElement('div')
    document.body.append(host)
    let root = createRoot(host)
    const Auth = AuthRoute.options.component as ComponentType
    try {
      await act(async () => root.render(<Auth />))
      await act(async () => (host.querySelectorAll('button')[1] as HTMLButtonElement).click())
      expect(location.assign).toHaveBeenCalledExactlyOnceWith('https://provider.example/authorize')
      await act(async () => root.unmount())
      search.mockReturnValue({})
      location.href = 'http://localhost/auth?oauth=success'
      root = createRoot(host)
      await act(async () => root.render(<Auth />))
      await act(async () => host.querySelector('button')!.click())
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/', search: intent })
      await act(async () => root.unmount())
      root = createRoot(host)
      await act(async () => root.render(<Auth />))
      await act(async () => host.querySelector('button')!.click())
      expect(mocks.navigate).toHaveBeenLastCalledWith({ to: '/', search: {} })
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})
