import { act, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  organizations: vi.fn(),
  clusters: vi.fn(),
  navigate: vi.fn(),
  identity: vi.fn(),
}))
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  redirect: (options: unknown) => ({ redirect: options }),
  useNavigate: () => mocks.navigate,
}))
vi.mock('../../service/cloud-api', async (original) => {
  const actual = await original<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: {
      ...actual.cloudApi,
      me: mocks.me,
      organizations: mocks.organizations,
      activeClusters: mocks.clusters,
    },
  }
})
vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({ darkMode: false, setDarkMode: vi.fn(), setIdentity: mocks.identity }),
}))
vi.mock('../auth/auth-page', () => ({
  AuthPage: ({ onAuthenticated }: { onAuthenticated: (user: unknown) => Promise<void> }) => (
    <button onClick={() => void onAuthenticated({ email: 'tester@example.invalid' })}>
      Complete sign-in
    </button>
  ),
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
  mocks.me.mockResolvedValue({ email: 'tester@example.invalid' })
  mocks.organizations.mockResolvedValue([
    { id: 'org-a', name: 'A' },
    { id: 'org-b', name: 'B' },
  ])
  mocks.clusters.mockResolvedValue([{ id: 'cluster-b', orgId: 'org-b', state: 'DEGRADED' }])
})
afterEach(() => vi.restoreAllMocks())

describe('Cloud initialization return routing', () => {
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
})
