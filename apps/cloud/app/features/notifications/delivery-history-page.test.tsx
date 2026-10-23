import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationDelivery, NotificationDeliveryPage } from '../../service/cloud-api'

import { i18n } from '../../i18n'
import { cloudApi } from '../../service/cloud-api'
import { DeliveryHistoryPage } from './delivery-history-page'

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Data' },
  }),
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

function delivery(id: string, subject: string): NotificationDelivery {
  return {
    id,
    channel: 'EMAIL',
    recipient: 'owner@example.com',
    subject,
    status: 'SENT',
    attempts: 0,
    createdAt: '2026-10-22T10:00:00Z',
  }
}

async function renderPage() {
  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <DeliveryHistoryPage />
      </I18nextProvider>,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function button(label: string) {
  return Array.from(host.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
}

describe('DeliveryHistoryPage', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    vi.spyOn(cloudApi, 'deliveries').mockImplementation(
      (_orgId, page = 0): Promise<NotificationDeliveryPage> =>
        Promise.resolve({
          items:
            page === 0
              ? [delivery('d-1', 'First page mail')]
              : [delivery('d-2', 'Second page mail')],
          page,
          size: 20,
          total: 25,
        }),
    )
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  it('renders 20-row pages and moves to the next page', async () => {
    await renderPage()

    expect(cloudApi.deliveries).toHaveBeenCalledWith('org-1', 0, 20)
    expect(host.textContent).toContain('First page mail')
    expect(host.textContent).toContain('Page 1 of 2')

    await act(async () => {
      button('Next')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(cloudApi.deliveries).toHaveBeenLastCalledWith('org-1', 1, 20)
    expect(host.textContent).toContain('Second page mail')
    expect(host.textContent).toContain('Page 2 of 2')
  })
})
