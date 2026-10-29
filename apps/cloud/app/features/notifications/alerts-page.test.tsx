import '../../i18n'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { events, alertPolicies, deliveries, eventTypes } = vi.hoisted(() => ({
  events: vi.fn(),
  alertPolicies: vi.fn(),
  deliveries: vi.fn(),
  eventTypes: vi.fn(),
}))

vi.mock('../../service/cloud-api', () => ({
  cloudApi: {
    events,
    alertPolicies,
    deliveries,
    eventTypes,
  },
  CloudApiError: class extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

let mockUserEmail = 'owner@example.com'
vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Data', ownerEmail: 'owner@example.com' },
    user: { id: 'u-1', email: mockUserEmail },
  }),
}))

import { AlertsPage, type AlertTab } from './alerts-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

async function renderAlerts(
  initialTab: AlertTab = 'events',
  onTabChange?: (tab: AlertTab) => void,
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<AlertsPage initialTab={initialTab} onTabChange={onTabChange} />)
  })
}

beforeEach(() => {
  mockUserEmail = 'owner@example.com'
  events.mockResolvedValue({ items: [], nextCursor: null })
  alertPolicies.mockResolvedValue([])
  deliveries.mockResolvedValue({ items: [], total: 0 })
  eventTypes.mockResolvedValue([])
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.clearAllMocks()
})

describe('AlertsPage', () => {
  it('renders unified Alerts header with Events tab active by default', async () => {
    await renderAlerts('events')

    expect(host?.textContent).toContain('Alerts')
    expect(host?.textContent).toContain('Events')
    expect(host?.textContent).toContain('Alert policies')
    expect(host?.textContent).toContain('Delivery history')
    expect(events).toHaveBeenCalledWith('org-1', expect.anything())
  })

  it('switches to Alert policies tab when clicked', async () => {
    const onTabChange = vi.fn()
    await renderAlerts('events', onTabChange)

    const policiesTab = Array.from(
      host?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    ).find((btn) => btn.textContent?.includes('Alert policies'))
    expect(policiesTab).toBeDefined()

    await act(async () => {
      policiesTab?.click()
    })

    expect(onTabChange).toHaveBeenCalledWith('policies')
  })

  it('hides Alert policies tab for non-admin users', async () => {
    mockUserEmail = 'viewer@example.com'
    await renderAlerts('events')

    const tabs = Array.from(host?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []).map(
      (b) => b.textContent?.trim(),
    )
    expect(tabs).toContain('Events')
    expect(tabs).toContain('Delivery history')
    expect(tabs).not.toContain('Alert policies')
  })
})
