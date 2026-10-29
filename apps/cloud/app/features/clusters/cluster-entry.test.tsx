import { act, StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cluster, ClusterState, Organization } from '../../service/cloud-api'

const mocks = vi.hoisted(() => ({
  cluster: vi.fn(),
  resolveCluster: vi.fn(),
  navigate: vi.fn(),
  state: { current: undefined as unknown },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useRouterState: () => '/clusters',
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))
vi.mock('../../service/cloud-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: { ...actual.cloudApi, cluster: mocks.cluster, resolveCluster: mocks.resolveCluster },
  }
})
vi.mock('../../state/cloud-app-state', () => ({ useCloudAppState: () => mocks.state.current }))
vi.mock('../feedback/tawk-feedback-widget', () => ({
  isTawkSupportAvailable: () => false,
  TawkFeedbackWidget: () => null,
}))

import { i18n } from '../../i18n'
import { CloudApiError } from '../../service/cloud-api'
import { CloudConsoleShell } from '../../shell/cloud-console-shell'
import { CloudOverviewView } from '../overview/cloud-overview-view'
import { AutomaticClusterEntry } from './automatic-cluster-entry'
import { clusterEntrySearch } from './cluster-entry-intent'
import { ClustersPage } from './clusters-page'
import { cancelPendingClusterEntries, useClusterEntry } from './use-cluster-entry'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const organization: Organization = { id: 'org-a', name: 'Org A', slug: 'org-a' }
const blockedStates: ClusterState[] = [
  'PROVISIONING_PENDING',
  'PROVISIONING',
  'PROVISIONING_FAILED',
  'DRAINING',
  'DRAINED',
  'TERMINATED',
]
const cluster = (state: ClusterState): Cluster => ({
  id: 'cluster-a',
  orgId: organization.id,
  name: 'Recovery cluster',
  region: 'us-east-1',
  state,
})
const assign = vi.fn()
let consoleHostname: string
let host: HTMLDivElement
let root: Root

async function render(element: ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(element))
}

function button(text: string) {
  const result = [...host.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(text),
  )
  expect(result).toBeDefined()
  return result!
}

function HookEntry({ value }: { value: Cluster }) {
  const { enterCluster, entryError } = useClusterEntry()
  return (
    <>
      <button onClick={() => void enterCluster(value, organization.id)}>Enter</button>
      <p>{entryError}</p>
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  consoleHostname = 'localhost'
  const originalWindow = window
  vi.stubGlobal(
    'window',
    new Proxy(originalWindow, {
      get(target, key) {
        return key === 'location'
          ? { hostname: consoleHostname, assign }
          : Reflect.get(target, key, target)
      },
    }),
  )
  mocks.state.current = {
    activeOrganization: organization,
    clusters: [cluster('DEGRADED')],
    setClusters: vi.fn(),
    setDarkMode: vi.fn(),
    setActiveOrganization: vi.fn(),
    clearIdentity: vi.fn(),
  }
  mocks.cluster.mockResolvedValue(cluster('DEGRADED'))
  mocks.resolveCluster.mockResolvedValue({
    success: true,
    baseUri: 'http://localhost:28443',
    exchangeCode: 'single-use-code',
  })
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await act(async () => root?.unmount())
  host?.remove()
  vi.unstubAllGlobals()
})

describe('Cluster recovery entry', () => {
  it('automatically resumes an authorized Cluster through the original C1 path once', async () => {
    await render(
      <StrictMode>
        <AutomaticClusterEntry
          cluster={cluster('DEGRADED')}
          organizationId={organization.id}
          onBack={() => {}}
        />
      </StrictMode>,
    )
    expect(mocks.resolveCluster).toHaveBeenCalledExactlyOnceWith('cluster-a', organization.id)
    expect(assign).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:28443/auth/exchange?code=single-use-code',
    )
  })

  it('does not automatically retry a failed C1 return as the page rerenders', async () => {
    mocks.resolveCluster.mockRejectedValue(new CloudApiError('Dependency unavailable', 503))
    const element = (
      <AutomaticClusterEntry
        cluster={cluster('DEGRADED')}
        organizationId={organization.id}
        onBack={() => {}}
      />
    )
    await render(element)
    expect(host.textContent).toContain('Dependency unavailable')
    await act(async () => root.render(element))
    expect(mocks.resolveCluster).toHaveBeenCalledTimes(1)
    expect(assign).not.toHaveBeenCalled()
  })

  it('discards an automatic entry response after the waiting page is left', async () => {
    let complete!: (value: Cluster) => void
    mocks.cluster.mockImplementation(
      () =>
        new Promise<Cluster>((resolve) => {
          complete = resolve
        }),
    )
    await render(
      <AutomaticClusterEntry
        cluster={cluster('READY')}
        organizationId={organization.id}
        onBack={() => {}}
      />,
    )
    await act(async () => root.unmount())
    await act(async () => complete(cluster('READY')))
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('cancels immediately when returning to the console even before navigation unmounts the page', async () => {
    let complete!: (value: Cluster) => void
    mocks.cluster.mockImplementation(
      () =>
        new Promise<Cluster>((resolve) => {
          complete = resolve
        }),
    )
    const back = vi.fn()
    await render(
      <AutomaticClusterEntry
        cluster={cluster('READY')}
        organizationId={organization.id}
        onBack={back}
      />,
    )
    await act(async () => button(i18n.t('clusterEntry.back')).click())
    expect(back).toHaveBeenCalledTimes(1)
    await act(async () => complete(cluster('READY')))
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('lets a later manual Cluster selection supersede an automatic return', async () => {
    let complete!: (value: Cluster) => void
    const another = { ...cluster('READY'), id: 'cluster-b' }
    mocks.cluster.mockImplementation((_org, id) =>
      id === 'cluster-a'
        ? new Promise<Cluster>((resolve) => {
            complete = resolve
          })
        : Promise.resolve(another),
    )
    await render(
      <>
        <AutomaticClusterEntry
          cluster={cluster('READY')}
          organizationId={organization.id}
          onBack={() => {}}
        />
        <HookEntry value={another} />
      </>,
    )
    await act(async () => button('Enter').click())
    await act(async () => complete(cluster('READY')))
    expect(mocks.resolveCluster).toHaveBeenCalledExactlyOnceWith('cluster-b', organization.id)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('does not enter a Cluster under a different organization or unavailable state', async () => {
    await render(
      <AutomaticClusterEntry
        cluster={cluster('READY')}
        organizationId="other-org"
        onBack={() => {}}
      />,
    )
    expect(mocks.cluster).not.toHaveBeenCalled()
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    await act(async () =>
      root.render(
        <AutomaticClusterEntry
          cluster={cluster('DRAINED')}
          organizationId={organization.id}
          onBack={() => {}}
        />,
      ),
    )
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
  })

  it('preserves only bounded target identifiers in an entry intent, never a return URL or code', () => {
    expect(
      clusterEntrySearch({
        organizationId: 'org-a',
        enterClusterId: 'cluster-a',
        returnUrl: 'https://evil.example',
        code: 'private',
      }),
    ).toEqual({ organizationId: 'org-a', enterClusterId: 'cluster-a' })
    expect(
      clusterEntrySearch({ organizationId: 'org-a', enterClusterId: 'https://evil.example' })
        .enterClusterId,
    ).toBeUndefined()
    expect(clusterEntrySearch({ enterClusterId: 'cluster-a' }).enterClusterId).toBeUndefined()
  })

  it('opens a degraded Cluster from the list through the original exchange flow', async () => {
    await render(<ClustersPage />)
    expect(host.textContent).toContain('Degraded')
    expect(button('Recovery cluster').disabled).toBe(false)
    await act(async () => button('Recovery cluster').click())
    expect(mocks.cluster).toHaveBeenCalledWith(organization.id, 'cluster-a')
    expect(mocks.resolveCluster).toHaveBeenCalledWith('cluster-a', organization.id)
    expect(assign).toHaveBeenCalledWith('http://localhost:28443/auth/exchange?code=single-use-code')
  })

  it.each(blockedStates)('keeps the list entry disabled for %s', async (state) => {
    mocks.state.current = {
      activeOrganization: organization,
      clusters: [cluster(state)],
      setClusters: vi.fn(),
    }
    await render(<ClustersPage />)
    expect(button('Recovery cluster').disabled).toBe(true)
    await act(async () => button('Recovery cluster').click())
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
  })

  it('requires an organization before opening a list entry', async () => {
    mocks.state.current = {
      activeOrganization: null,
      clusters: [cluster('DEGRADED')],
      setClusters: vi.fn(),
    }
    await render(<ClustersPage />)
    expect(button('Recovery cluster').disabled).toBe(true)
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
  })

  it.each(['READY', 'DEGRADED', ...blockedStates] as ClusterState[])(
    'keeps overview entry consistent for %s',
    async (state) => {
      const enter = vi.fn()
      await render(
        <CloudOverviewView
          clusters={[cluster(state)]}
          onNavigate={vi.fn()}
          onOpenProvisionModal={vi.fn()}
          onEnterCluster={enter}
          enteringClusterId={null}
          entryError={null}
        />,
      )
      const allowed = state === 'READY' || state === 'DEGRADED'
      expect(button('Recovery cluster').disabled).toBe(!allowed)
      await act(async () => button('Recovery cluster').click())
      expect(enter).toHaveBeenCalledTimes(allowed ? 1 : 0)
      if (state === 'DEGRADED') expect(host.textContent).toContain('Degraded')
    },
  )

  it('opens a degraded Cluster from the sidebar without routing back to the list', async () => {
    await render(
      <CloudConsoleShell
        organization={organization}
        organizations={[organization]}
        clusters={[cluster('DEGRADED')]}
        user={{ id: 'user-a', email: 'fixture@example.com' }}
      >
        <span>Content</span>
      </CloudConsoleShell>,
    )
    await act(async () => button('Recovery cluster').click())
    expect(mocks.resolveCluster).toHaveBeenCalledWith('cluster-a', organization.id)
    expect(assign).toHaveBeenCalledOnce()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it.each(blockedStates)('does not resolve a %s Cluster', async (state) => {
    await render(<HookEntry value={cluster(state)} />)
    await act(async () => button('Enter').click())
    expect(mocks.cluster).not.toHaveBeenCalled()
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('allows READY to become DEGRADED during the fresh state check', async () => {
    await render(<HookEntry value={cluster('READY')} />)
    await act(async () => button('Enter').click())
    expect(assign).toHaveBeenCalledOnce()
  })

  it('rejects an entry state that becomes DRAINING before resolve', async () => {
    mocks.cluster.mockResolvedValue(cluster('DRAINING'))
    await render(<HookEntry value={cluster('DEGRADED')} />)
    await act(async () => button('Enter').click())
    expect(mocks.cluster).toHaveBeenCalledOnce()
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    expect(host.textContent).toContain('no longer')
  })

  it('returns an expired Cloud session to ordinary login', async () => {
    mocks.cluster.mockRejectedValue(new CloudApiError('Session expired', 401))
    await render(<HookEntry value={cluster('DEGRADED')} />)
    await act(async () => button('Enter').click())
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/auth',
      search: { organizationId: organization.id, enterClusterId: 'cluster-a' },
    })
    expect(mocks.resolveCluster).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([
    'https://attacker.example',
    'http://cluster-a.cloud.tapstate.com',
    'https://user:secret@cluster-a.cloud.tapstate.com',
    'https://cluster-a.cloud.tapstate.com:8443',
  ])('rejects invalid exchange target %s', async (baseUri) => {
    vi.stubEnv('DEV', false)
    consoleHostname = 'cloud.tapstate.com'
    mocks.resolveCluster.mockResolvedValue({
      success: true,
      baseUri,
      exchangeCode: 'single-use-code',
    })
    await render(<HookEntry value={cluster('DEGRADED')} />)
    await act(async () => button('Enter').click())
    expect(mocks.resolveCluster).toHaveBeenCalledOnce()
    expect(assign).not.toHaveBeenCalled()
    expect(host.textContent).toContain('address is unavailable')
  })

  it('preserves the ordinary HTTPS production exchange target', async () => {
    consoleHostname = 'cloud.tapstate.com'
    mocks.cluster.mockResolvedValue(cluster('READY'))
    mocks.resolveCluster.mockResolvedValue({
      success: true,
      baseUri: 'https://cluster-a.cloud.tapstate.com',
      exchangeCode: 'single-use-code',
    })
    await render(<HookEntry value={cluster('READY')} />)
    await act(async () => button('Enter').click())
    expect(assign).toHaveBeenCalledWith(
      'https://cluster-a.cloud.tapstate.com/auth/exchange?code=single-use-code',
    )
  })

  it('does not redirect when logout cancels an in-flight exchange', async () => {
    let finish!: (value: unknown) => void
    mocks.resolveCluster.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(<HookEntry value={cluster('DEGRADED')} />)
    await act(async () => button('Enter').click())
    expect(mocks.resolveCluster).toHaveBeenCalledOnce()
    await act(async () => {
      cancelPendingClusterEntries()
      finish({ success: true, baseUri: 'http://localhost:28443', exchangeCode: 'old-code' })
    })
    expect(assign).not.toHaveBeenCalled()
  })
})
