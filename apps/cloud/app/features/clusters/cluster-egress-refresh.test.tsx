import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cluster, Organization } from '../../service/cloud-api'

const mocks = vi.hoisted(() => ({
  activeClusters: vi.fn(),
  clusters: vi.fn(),
  stabilizeClusterEgressAddress: vi.fn(),
  subscription: vi.fn(),
  navigate: vi.fn(),
  state: { current: undefined as unknown },
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))

vi.mock('../../service/cloud-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: {
      ...actual.cloudApi,
      activeClusters: mocks.activeClusters,
      clusters: mocks.clusters,
      stabilizeClusterEgressAddress: mocks.stabilizeClusterEgressAddress,
      subscription: mocks.subscription,
    },
  }
})

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => mocks.state.current,
}))

import { OverviewPage } from '../overview/overview-page'
import { ClustersPage } from './clusters-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const organizationA: Organization = { id: 'org-a', name: 'Org A', slug: 'org-a' }
const organizationB: Organization = { id: 'org-b', name: 'Org B', slug: 'org-b' }

function makeCluster(
  id: string,
  orgId: string,
  egressAddressStatus: Cluster['egressAddressStatus'],
): Cluster {
  return {
    id,
    orgId,
    region: 'us-east-1',
    name: `cluster-${id}`,
    state: 'READY',
    egressAddressStatus,
  }
}

let host: HTMLDivElement | undefined
let root: Root | undefined

async function render(element: ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root?.render(element))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  mocks.state.current = {
    activeOrganization: organizationA,
    clusters: [],
    setClusters: vi.fn(),
  }
  mocks.activeClusters.mockResolvedValue([])
  mocks.clusters.mockResolvedValue([])
  mocks.stabilizeClusterEgressAddress.mockReset()
  mocks.subscription.mockResolvedValue(null)
  mocks.navigate.mockReset()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('Cluster egress refresh', () => {
  it('does not apply a stabilization response after switching organizations', async () => {
    const clusterA = makeCluster('cluster-a', organizationA.id, 'DYNAMIC')
    const clusterB = makeCluster('cluster-b', organizationB.id, 'DYNAMIC')
    const setClusters = vi.fn()
    mocks.state.current = {
      activeOrganization: organizationA,
      clusters: [clusterA],
      setClusters,
    }
    const response = deferred<Cluster>()
    mocks.stabilizeClusterEgressAddress.mockReturnValue(response.promise)

    await render(<ClustersPage />)
    const makeStable = Array.from(host?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Make IP stable'),
    )
    expect(makeStable).toBeDefined()
    await act(async () => makeStable?.click())

    const confirm = Array.from(host?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Confirm update'),
    )
    expect(confirm).toBeDefined()
    await act(async () => confirm?.click())
    await vi.waitFor(() => expect(mocks.stabilizeClusterEgressAddress).toHaveBeenCalledOnce())

    mocks.state.current = {
      activeOrganization: organizationB,
      clusters: [clusterB],
      setClusters,
    }
    await act(async () => root?.render(<ClustersPage />))

    await act(async () => {
      response.resolve({ ...clusterA, egressAddressStatus: 'STABLE', ec2PublicIp: '203.0.113.1' })
      await response.promise
    })

    expect(setClusters).not.toHaveBeenCalled()
    expect(host?.textContent).toContain(clusterB.name)
    expect(host?.textContent).not.toContain(clusterA.name)
  })

  it.each([
    ['Clusters', <ClustersPage />],
    ['Overview', <OverviewPage />],
  ])('uses the active-cluster projection when %s polls egress updates', async (_page, page) => {
    vi.useFakeTimers()
    const cluster = makeCluster('cluster-a', organizationA.id, 'STABILIZING')
    mocks.state.current = {
      activeOrganization: organizationA,
      clusters: [cluster],
      setClusters: vi.fn(),
    }
    await render(page)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    expect(mocks.activeClusters).toHaveBeenCalledWith(organizationA.id)
    expect(mocks.clusters).not.toHaveBeenCalled()
  })
})
