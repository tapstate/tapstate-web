import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cluster, Organization, Spec, Subscription } from '../../service/cloud-api'

const mocks = vi.hoisted(() => ({
  specs: vi.fn(),
  subscriptions: vi.fn(),
  cancelAtPeriodEnd: vi.fn(),
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
      specs: mocks.specs,
      subscriptions: mocks.subscriptions,
      cancelAtPeriodEnd: mocks.cancelAtPeriodEnd,
    },
  }
})

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => mocks.state.current,
}))

import { i18n } from '../../i18n'
import { formatDate } from './billing-format'
import { BillingPage } from './billing-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Data',
  slug: 'acme-data',
  ownerEmail: 'owner@example.com',
}

const specs: Spec[] = [
  {
    key: '2c8g',
    displayName: '2C8G Starter',
    cpuCores: 2,
    memoryGb: 8,
    trialDays: 7,
    mdbSizeGb: 10,
    currency: 'usd',
    unitPriceCents: 19900,
    stripePriceId: 'price_starter',
    paymentMethod: 'STRIPE',
  },
  {
    key: '4c16g',
    displayName: '4C16G Pro',
    cpuCores: 4,
    memoryGb: 16,
    trialDays: 0,
    mdbSizeGb: 20,
    currency: 'usd',
    unitPriceCents: 39900,
    stripePriceId: 'price_pro',
    paymentMethod: 'STRIPE',
  },
  {
    key: '8c32g',
    displayName: '8C32G Enterprise',
    cpuCores: 8,
    memoryGb: 32,
    trialDays: 0,
    mdbSizeGb: 50,
    currency: 'usd',
    unitPriceCents: 79900,
    stripePriceId: 'price_enterprise',
    paymentMethod: 'STRIPE',
  },
]

const periodEnd = '2026-11-19T00:00:00Z'

const cluster: Cluster = {
  id: 'cluster-1',
  orgId: organization.id,
  region: 'ap-southeast-1',
  name: 'acme-data-stream',
  specKey: '2c8g',
  state: 'READY',
}

const trialSubscription: Subscription = {
  id: 'subscription-1',
  orgId: organization.id,
  status: 'TRIAL',
  provisioningAllowed: true,
  resourceState: 'READY',
  clusterId: cluster.id,
  currentPeriodStart: '2026-11-12T00:00:00Z',
  currentPeriodEnd: periodEnd,
}

let host: HTMLDivElement | undefined
let root: Root | undefined

function buttonWithText(text: string) {
  return Array.from(host?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  )
}

function dialogOverlay() {
  return host?.querySelector('[role="dialog"]')?.parentElement ?? null
}

async function click(element: Element | null | undefined) {
  await act(async () => {
    ;(element as HTMLElement | null)?.click()
  })
}

async function renderBilling() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <BillingPage />
      </I18nextProvider>,
    )
  })
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  window.sessionStorage.clear()
  mocks.state.current = {
    activeOrganization: organization,
    clusters: [],
    user: { email: 'owner@example.com', displayName: 'Owner' },
  }
  mocks.specs.mockResolvedValue(specs)
  mocks.subscriptions.mockResolvedValue([])
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.clearAllMocks()
})

describe('Cloud subscription flow', () => {
  it('sends an organization without a valid subscription to onboarding', async () => {
    mocks.subscriptions.mockResolvedValue([])

    await renderBilling()

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/onboarding',
        search: { organizationId: organization.id, subscriptionId: undefined },
        replace: true,
      }),
    )
  })

  it('sends a canceled subscription to onboarding', async () => {
    mocks.subscriptions.mockResolvedValue([{ ...trialSubscription, status: 'CANCELLED' }])

    await renderBilling()

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/onboarding',
        search: { organizationId: organization.id, subscriptionId: undefined },
        replace: true,
      }),
    )
  })

  it('shows the period end in the cancel dialog and moves to pending cancellation', async () => {
    mocks.state.current = {
      activeOrganization: organization,
      clusters: [cluster],
      user: { email: 'owner@example.com', displayName: 'Owner' },
    }
    mocks.subscriptions.mockResolvedValue([trialSubscription])
    mocks.cancelAtPeriodEnd.mockResolvedValue({
      ...trialSubscription,
      status: 'PENDING_CANCEL',
    })

    await renderBilling()
    await vi.waitFor(() => expect(host?.textContent).toContain('Trial active'))
    expect(host?.textContent).toContain('2C8G Starter')

    expect(dialogOverlay()?.getAttribute('aria-hidden')).toBe('true')
    await click(buttonWithText('Cancel subscription'))
    expect(dialogOverlay()?.getAttribute('aria-hidden')).toBe('false')
    expect(dialogOverlay()?.textContent).toContain(formatDate(periodEnd, 'en'))
    expect(dialogOverlay()?.textContent).toContain(
      'Your instance will be released and all data will be deleted',
    )

    await click(buttonWithText('Yes, cancel'))
    await vi.waitFor(() => expect(host?.textContent).toContain('Pending cancellation'))
    expect(mocks.cancelAtPeriodEnd).toHaveBeenCalledWith(organization.id, trialSubscription.id)
    expect(dialogOverlay()?.getAttribute('aria-hidden')).toBe('true')
    expect(buttonWithText('Cancel subscription')).toBeUndefined()
  })

  it('keeps non-owners on a read-only summary', async () => {
    mocks.state.current = {
      activeOrganization: organization,
      clusters: [cluster],
      user: { email: 'member@example.com', displayName: 'Member' },
    }
    mocks.subscriptions.mockResolvedValue([trialSubscription])

    await renderBilling()
    await vi.waitFor(() =>
      expect(host?.textContent).toContain(
        'Only the organization owner can change the subscription.',
      ),
    )

    expect(host?.textContent).toContain('2C8G Starter')
    expect(buttonWithText('Cancel subscription')).toBeUndefined()
  })
})
