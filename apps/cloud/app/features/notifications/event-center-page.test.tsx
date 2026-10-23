import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventPage, PlatformEvent } from '../../service/cloud-api'

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

function event(id: string, subject: string, clusterId = id): PlatformEvent {
  return {
    id,
    source: 'scheduled',
    type: 'scheduled.provisioning.failed',
    severity: 'CRITICAL',
    subject,
    actor: 'system',
    occurredAt: '2026-10-22T10:00:00Z',
    dedupeKey: `dedupe-${id}`,
    schemaVersion: 1,
    payload: { clusterId },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

async function renderPage() {
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
}

function button(label: string) {
  return Array.from(host.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('EventCenterPage', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    vi.spyOn(cloudApi, 'events').mockResolvedValue({
      items: [event('evt-1', 'Cluster provisioning failed', 'cluster-1')],
      nextCursor: null,
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  it('renders events and opens the bounded detail payload', async () => {
    await renderPage()

    expect(cloudApi.events).toHaveBeenCalledWith('org-1', {
      type: undefined,
      severity: undefined,
      limit: 20,
      cursor: undefined,
    })
    expect(host.textContent).toContain('Cluster provisioning failed')
    expect(host.textContent).toContain('Critical')

    const openDetails = button('Cluster provisioning failed')
    expect(openDetails).not.toBeUndefined()
    await act(async () => {
      openDetails?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Event detail')
    expect(host.textContent).toContain('cluster-1')
  })

  it('does not let an older filter response replace the current results', async () => {
    const previousFilter = deferred<EventPage>()
    const currentFilter = deferred<EventPage>()
    vi.mocked(cloudApi.events).mockImplementation((_orgId, filters) =>
      filters?.type ? currentFilter.promise : previousFilter.promise,
    )

    await renderPage()
    await act(async () => {
      const filter = host.querySelector('input[aria-label="Event type"]') as HTMLInputElement
      setInput(filter, 'pipeline.failed')
      await Promise.resolve()
    })
    await act(async () => {
      currentFilter.resolve({ items: [event('evt-current', 'Current filter event')] })
      await currentFilter.promise
    })
    expect(host.textContent).toContain('Current filter event')

    await act(async () => {
      previousFilter.resolve({ items: [event('evt-old', 'Old filter event')] })
      await previousFilter.promise
    })

    expect(host.textContent).toContain('Current filter event')
    expect(host.textContent).not.toContain('Old filter event')
  })

  it('pages through events with a 20-row page and a cursor', async () => {
    vi.mocked(cloudApi.events)
      .mockResolvedValueOnce({
        items: [event('evt-1', 'First page event')],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({ items: [event('evt-2', 'Second page event')], nextCursor: null })

    await renderPage()
    expect(host.textContent).toContain('Page 1')

    await act(async () => {
      button('Next')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(cloudApi.events).toHaveBeenLastCalledWith('org-1', {
      type: undefined,
      severity: undefined,
      limit: 20,
      cursor: 'cursor-2',
    })
    expect(host.textContent).toContain('Second page event')
    expect(host.textContent).toContain('Page 2')
  })

  it('renders the event detail action as a keyboard-focusable button', async () => {
    await renderPage()
    const openDetails = button('Cluster provisioning failed')
    expect(openDetails).not.toBeUndefined()
    expect(openDetails?.tagName).toBe('BUTTON')
    expect(openDetails?.tabIndex).toBe(0)
    await act(async () => {
      openDetails?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Event detail')
  })
})
