import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cluster, Organization, Spec, Subscription } from '../../service/cloud-api'

const mocks = vi.hoisted(() => ({
  specs: vi.fn(),
  subscriptions: vi.fn(),
  createCheckout: vi.fn(),
  cancelAtPeriodEnd: vi.fn(),
  subscriptionById: vi.fn(),
  navigate: vi.fn(),
  navigateToCheckout: vi.fn(),
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
      createCheckout: mocks.createCheckout,
      cancelAtPeriodEnd: mocks.cancelAtPeriodEnd,
      subscriptionById: mocks.subscriptionById,
    },
  }
})

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => mocks.state.current,
}))

vi.mock('./checkout-navigation', () => ({
  navigateToCheckout: mocks.navigateToCheckout,
}))

import { i18n } from '../../i18n'
import { CloudApiError } from '../../service/cloud-api'
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

function checkbox() {
  return host?.querySelector<HTMLInputElement>('input[type="checkbox"]')
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
  it('renders the API catalog in USD with each plan trial policy', async () => {
    await renderBilling()
    await vi.waitFor(() => expect(host?.textContent).toContain('2C8G Starter'))

    const text = host?.textContent ?? ''
    expect(text).toContain('$199.00')
    expect(text).toContain('$399.00')
    expect(text).toContain('$799.00')
    expect(text).toContain('2 vCPU · 8 GB RAM · 10 GB managed storage')
    expect(text.match(/7-day free trial/g)).toHaveLength(1)
    expect(text.match(/No trial/g)).toHaveLength(2)
    expect(buttonWithText('Continue to secure checkout')?.hasAttribute('disabled')).toBe(true)
  })

  it('requires auto-renew consent and reuses the idempotency key after a failed checkout', async () => {
    mocks.createCheckout
      .mockRejectedValueOnce(new CloudApiError('The Cloud service is unreachable.', 0))
      .mockResolvedValueOnce({
        subscriptionId: 'subscription-new',
        status: 'PENDING_PAYMENT',
        checkoutUrl: 'https://checkout.stripe.com/c/pay/test',
      })

    await renderBilling()
    await vi.waitFor(() => expect(host?.textContent).toContain('2C8G Starter'))

    const subscribe = buttonWithText('Continue to secure checkout')
    expect(subscribe?.hasAttribute('disabled')).toBe(true)

    await click(checkbox())
    expect(subscribe?.hasAttribute('disabled')).toBe(false)

    await click(subscribe)
    await vi.waitFor(() =>
      expect(host?.textContent).toContain('The Cloud service could not be reached'),
    )
    expect(mocks.createCheckout).toHaveBeenCalledTimes(1)
    const firstRequestId = mocks.createCheckout.mock.calls[0]?.[1]?.clientRequestId

    await click(buttonWithText('Continue to secure checkout'))
    await vi.waitFor(() =>
      expect(mocks.navigateToCheckout).toHaveBeenCalledWith(
        'https://checkout.stripe.com/c/pay/test',
      ),
    )

    expect(mocks.createCheckout).toHaveBeenCalledTimes(2)
    expect(mocks.createCheckout.mock.calls[1]?.[1]).toMatchObject({
      specKey: '2c8g',
      clientRequestId: firstRequestId,
    })
    expect(window.sessionStorage.getItem('tapstate.cloud.checkout-attempt')).toContain(
      'subscription-new',
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
    expect(dialogOverlay()?.textContent).toContain(formatDate(periodEnd))
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
      clusters: [],
      user: { email: 'member@example.com', displayName: 'Member' },
    }

    await renderBilling()
    await vi.waitFor(() =>
      expect(host?.textContent).toContain(
        'Only the organization owner can change the subscription.',
      ),
    )

    expect(checkbox()).toBeNull()
    expect(buttonWithText('Continue to secure checkout')).toBeUndefined()
    expect(host?.textContent).toContain('$199.00')
  })
})
