import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cluster, Organization, Region, Subscription } from '../../service/cloud-api'
import type { OnboardingWorkspace } from './onboarding-service'
import type { OnboardingInput } from './onboarding-types'

import { CloudApiError } from '../../service/cloud-api'

const { regions, cluster, subscriptionById, cancelSubscription, retryCluster, navigate } =
  vi.hoisted(() => ({
    regions: vi.fn(),
    cluster: vi.fn(),
    subscriptionById: vi.fn(),
    cancelSubscription: vi.fn(),
    retryCluster: vi.fn(),
    navigate: vi.fn(),
  }))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

vi.mock('../../service/cloud-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: {
      ...actual.cloudApi,
      regions,
      cluster,
      subscriptionById,
      cancelSubscription,
      retryCluster,
    },
  }
})

import { i18n } from '../../i18n'
import { OnboardingPage } from './onboarding-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Data',
  slug: 'acme-data',
}

const region: Region = {
  code: 'us-west-2',
  name: 'US West',
  open: true,
  defaultSpecKey: 'small',
}

const alternateRegion: Region = {
  code: 'us-east-1',
  name: 'US East',
  open: true,
  defaultSpecKey: 'small',
}

const failedCluster: Cluster = {
  id: 'cluster-1',
  orgId: organization.id,
  region: region.code,
  name: 'acme-data-stream',
  state: 'PROVISIONING_FAILED',
  provisionErrorCode: 'PROVISIONING_FAILED',
}

const activeSubscription: Subscription = {
  id: 'subscription-1',
  orgId: organization.id,
  status: 'TRIAL',
  provisioningAllowed: true,
  resourceState: 'PROVISIONING',
  clusterId: failedCluster.id,
}

const cancelledSubscription: Subscription = {
  ...activeSubscription,
  status: 'CANCELLED',
}

const failedWorkspace: OnboardingWorkspace = {
  organization,
  cluster: failedCluster,
  subscription: activeSubscription,
}

let host: HTMLDivElement | undefined
let root: Root | undefined

function buttonWithText(text: string) {
  return Array.from(host?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  )
}

function changeOrganizationName(value: string) {
  const input = host?.querySelector<HTMLInputElement>('#onboarding-organization')
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input?.dispatchEvent(new Event('input', { bubbles: true }))
}

async function renderPage(
  onCreateWorkspace: (input: OnboardingInput) => Promise<OnboardingWorkspace>,
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <OnboardingPage
          darkMode={false}
          entryError={null}
          isOpeningCluster={false}
          onComplete={() => undefined}
          onCreateWorkspace={onCreateWorkspace}
          setDarkMode={() => undefined}
          user={{ email: 'user@example.com', displayName: 'Test User' }}
        />
      </I18nextProvider>,
    )
  })

  await vi.waitFor(() => expect(buttonWithText('US West')).toBeDefined())
}

async function submitSetup() {
  await act(async () => changeOrganizationName('Acme Data'))
  await act(async () => {
    host
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function clickButton(text: string) {
  const button = buttonWithText(text)
  expect(button).toBeDefined()
  await act(async () => button?.click())
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  regions.mockResolvedValue([region, alternateRegion])
  cluster.mockResolvedValue(failedCluster)
  subscriptionById.mockResolvedValue(activeSubscription)
  retryCluster.mockResolvedValue(failedCluster)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.clearAllMocks()
})

describe('Cloud onboarding subscription cancellation', () => {
  it('keeps setup blocked after a cancellation error and only allows a replacement after success', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    expect(onCreateWorkspace).toHaveBeenCalledTimes(1)
    expect(host?.textContent).toContain('Provisioning interrupted')

    cancelSubscription
      .mockRejectedValueOnce(new Error('The response was unavailable'))
      .mockResolvedValueOnce(cancelledSubscription)

    await clickButton('Cancel subscription')

    expect(host?.textContent).toContain('Cancellation could not be confirmed')
    expect(buttonWithText('Create workspace and cluster')).toBeUndefined()
    expect(buttonWithText('Retry Provisioning')?.disabled).toBe(true)
    expect(onCreateWorkspace).toHaveBeenCalledTimes(1)

    await clickButton('Cancel subscription')
    expect(host?.textContent).toContain('Provisioning cancelled')

    await clickButton('Back to setup')
    await clickButton('US East')
    await act(async () => {
      host
        ?.querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onCreateWorkspace).toHaveBeenCalledTimes(2)
    expect(onCreateWorkspace.mock.calls[1]?.[0]).toMatchObject({
      organizationName: 'Acme Data',
      organizationSlug: 'acme-data',
      clusterName: 'acme-data-stream',
      region: { code: alternateRegion.code },
    })
    expect(cancelSubscription).toHaveBeenCalledWith(organization.id, activeSubscription.id)
  })

  it('refreshes cluster state before cancellation and does not cancel a recovered cluster', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster.mockResolvedValueOnce({ ...failedCluster, state: 'READY' })
    subscriptionById.mockResolvedValueOnce({ ...activeSubscription, resourceState: 'READY' })
    await clickButton('Cancel subscription')

    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(host?.textContent).toContain('Cluster is ready')
  })

  it('shows cancellation errors after status refresh moves the view to a ready cluster', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster
      .mockResolvedValueOnce(failedCluster)
      .mockResolvedValueOnce({ ...failedCluster, state: 'READY' })
    subscriptionById
      .mockResolvedValueOnce(activeSubscription)
      .mockResolvedValueOnce({ ...activeSubscription, resourceState: 'READY' })
    cancelSubscription.mockRejectedValueOnce(new Error('The response was unavailable'))

    await clickButton('Cancel subscription')

    expect(host?.textContent).toContain('Cluster is ready')
    expect(host?.textContent).toContain('Cancellation could not be confirmed')
  })

  it('blocks provisioning retry when cancellation outcome cannot be rechecked', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster
      .mockResolvedValueOnce(failedCluster)
      .mockRejectedValueOnce(new Error('The status check failed'))
    subscriptionById
      .mockResolvedValueOnce(activeSubscription)
      .mockRejectedValueOnce(new Error('The status check failed'))
    cancelSubscription.mockRejectedValueOnce(new Error('The response was unavailable'))

    await clickButton('Cancel subscription')

    expect(host?.textContent).toContain('Cancellation could not be confirmed')
    expect(buttonWithText('Retry Provisioning')?.disabled).toBe(true)
    expect(buttonWithText('Cancel subscription')?.disabled).toBe(false)

    cluster.mockRejectedValueOnce(new Error('The status check failed again'))
    subscriptionById.mockRejectedValueOnce(new Error('The status check failed again'))
    await clickButton('Cancel subscription')

    expect(buttonWithText('Retry Provisioning')?.disabled).toBe(true)
    expect(cancelSubscription).toHaveBeenCalledTimes(1)
  })

  it('redirects to auth when the cancellation outcome refresh returns 401', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster
      .mockResolvedValueOnce(failedCluster)
      .mockRejectedValueOnce(new CloudApiError('Unauthorized', 401))
    subscriptionById
      .mockResolvedValueOnce(activeSubscription)
      .mockResolvedValueOnce(activeSubscription)
    cancelSubscription.mockRejectedValueOnce(new Error('The response was unavailable'))

    await clickButton('Cancel subscription')

    expect(navigate).toHaveBeenCalledWith({ to: '/auth' })
  })

  it('prioritizes a 401 when the other parallel status read fails first', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    let rejectSubscription: (error: unknown) => void = () => undefined
    subscriptionById.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSubscription = reject
        }),
    )
    cluster.mockRejectedValueOnce(new Error('The cluster status check failed'))

    await clickButton('Cancel subscription')
    rejectSubscription(new CloudApiError('Unauthorized', 401))

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth' }))
  })

  it('redirects on a 401 even while the other status read is still pending', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    let resolveSubscription: (subscription: Subscription) => void = () => undefined
    subscriptionById.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubscription = resolve
        }),
    )
    cluster.mockRejectedValueOnce(new CloudApiError('Unauthorized', 401))

    await clickButton('Cancel subscription')
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth' }))
    resolveSubscription(activeSubscription)
  })

  it('does not show cancellation as complete when the API response is not cancelled', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster.mockResolvedValueOnce(failedCluster)
    subscriptionById.mockResolvedValueOnce(activeSubscription)
    cancelSubscription.mockResolvedValueOnce(activeSubscription)

    await clickButton('Cancel subscription')

    expect(host?.textContent).not.toContain('Provisioning cancelled')
    expect(host?.textContent).toContain('Cancellation could not be confirmed')
    expect(buttonWithText('Retry Provisioning')?.disabled).toBe(true)
    expect(buttonWithText('Cancel subscription')?.disabled).toBe(false)
  })

  it('still cancels the subscription when the cluster is terminating', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster.mockResolvedValueOnce({ ...failedCluster, state: 'DRAINING' })
    subscriptionById.mockResolvedValueOnce(activeSubscription)
    cancelSubscription.mockResolvedValueOnce(cancelledSubscription)

    await clickButton('Cancel subscription')

    expect(cancelSubscription).toHaveBeenCalledWith(organization.id, activeSubscription.id)
    expect(host?.textContent).toContain('Provisioning cancelled')
  })

  it('reports a status-read failure without claiming cancellation was sent', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster.mockRejectedValueOnce(new Error('The cluster status check failed'))
    subscriptionById.mockResolvedValueOnce(activeSubscription)

    await clickButton('Cancel subscription')

    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(host?.textContent).toContain('Could not refresh the current deployment status')
    expect(host?.textContent).not.toContain('Cancellation could not be confirmed')
  })

  it('refreshes a stale failed screen before retrying a cancelled subscription', async () => {
    const onCreateWorkspace = vi.fn(async (_input: OnboardingInput) => failedWorkspace)
    await renderPage(onCreateWorkspace)
    await submitSetup()

    cluster.mockResolvedValueOnce(failedCluster)
    subscriptionById.mockResolvedValueOnce(cancelledSubscription)

    await clickButton('Retry Provisioning')

    expect(retryCluster).not.toHaveBeenCalled()
    expect(host?.textContent).toContain('Provisioning cancelled')
  })
})
