import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../i18n'
import { cloudApi } from '../../service/cloud-api'
import { EventCenterPage } from './event-center-page'

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Data' },
  }),
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

describe('EventCenterPage', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    vi.spyOn(cloudApi, 'events').mockResolvedValue({
      items: [
        {
          id: 'evt-1',
          source: 'scheduled',
          type: 'scheduled.provisioning.failed',
          severity: 'CRITICAL',
          subject: 'Cluster provisioning failed',
          actor: 'system',
          occurredAt: '2026-10-22T10:00:00Z',
          dedupeKey: 'dedupe-1',
          schemaVersion: 1,
          payload: { clusterId: 'cluster-1' },
        },
      ],
      nextCursor: null,
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  it('renders events and opens the bounded detail payload', async () => {
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <EventCenterPage />
        </I18nextProvider>,
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(cloudApi.events).toHaveBeenCalledWith('org-1', {
      type: undefined,
      severity: undefined,
      limit: 50,
    })
    expect(host.textContent).toContain('Cluster provisioning failed')
    expect(host.textContent).toContain('Critical')

    const row = host.querySelector('tbody tr')
    expect(row).not.toBeNull()
    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Event detail')
    expect(host.textContent).toContain('cluster-1')
  })
})
