import '@/i18n/index'
import type { ReactNode } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderPage, sourceEntry, viewEntry } from './views-test-support'

const { apiFetch, listSources, listViews } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  listSources: vi.fn(),
  listViews: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listSources,
}))
vi.mock('@/service/view-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/view-client')>()),
  listViews,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params?: Record<string, string>
    children: ReactNode
    className?: string
  }) => (
    <a href={to} data-params={params ? JSON.stringify(params) : undefined} className={className}>
      {children}
    </a>
  ),
}))

import { ViewsPage } from './views-page'

let page: Awaited<ReturnType<typeof renderPage>> | null = null

beforeEach(() => {
  listSources.mockReset().mockResolvedValue([sourceEntry('views'), sourceEntry('orders')])
  listViews.mockReset()
})

afterEach(() => {
  page?.unmount()
  page = null
})

describe('ViewsPage', () => {
  it('shows a loading state, then an error with a retry', async () => {
    listViews.mockReturnValue(new Promise(() => undefined))
    page = await renderPage(<ViewsPage />)
    expect(page.container.textContent).toContain('Loading views')
    page.unmount()

    listViews.mockRejectedValue(new Error('down'))
    page = await renderPage(<ViewsPage />)
    expect(page.container.querySelector('[role="alert"]')?.textContent).toContain(
      'could not be loaded',
    )
  })

  it('says the server does not list views yet, instead of claiming there are none', async () => {
    listViews.mockResolvedValue({ available: false })

    page = await renderPage(<ViewsPage />)

    expect(page.container.querySelector('[role="status"]')?.textContent).toContain(
      'does not list views yet',
    )
    expect(page.container.textContent).not.toContain('No views yet')
    expect(page.container.querySelector('table')).toBeNull()
  })

  it('explains views when there are none, offering Build a view but no goal cards', async () => {
    listViews.mockResolvedValue({ available: true, views: [] })

    page = await renderPage(<ViewsPage />)

    const text = page.container.textContent ?? ''
    expect(text).toContain('No views yet')
    expect(text).toContain('Tapstate state store')
    expect(text).toContain('Build a view')
    expect(text).not.toContain('Mirror tables')
    expect(text).not.toContain('Customer 360')
  })

  it('says the store is not set up when the server has none', async () => {
    listSources.mockResolvedValue([sourceEntry('orders')])
    listViews.mockResolvedValue({ available: true, views: [] })

    page = await renderPage(<ViewsPage />)

    expect(page.container.textContent).toContain('Views live in a state store')
    expect(page.container.querySelector('a[href="/overview"]')?.textContent).toBe('Set up')
  })

  it('lists one row per replica of a mirror and one per view, each linked to its pipeline', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [
        viewEntry('accounts', 'replica', 'mirror-core', { state: 'fresh', behindSeconds: 3 }),
        viewEntry('customers', 'replica', 'mirror-core', { state: 'fresh', behindSeconds: 4 }),
        viewEntry('loans', 'replica', 'mirror-core', { state: 'stale', staleSeconds: 720 }),
        viewEntry('customer_360', 'view', 'build-c360', { state: 'loading', percent: 42 }),
      ],
    })

    page = await renderPage(<ViewsPage />)

    const rows = [...page.container.querySelectorAll('tbody tr')]
    expect(rows.map((row) => row.querySelector('td')?.textContent)).toEqual([
      'accounts',
      'customer_360',
      'customers',
      'loans',
    ])
    expect(rows[1].textContent).toContain('View')
    expect(rows[1].textContent).toContain('Loading 42%')
    expect(rows[3].textContent).toContain('Replica')
    expect(rows[3].textContent).toContain('Observation unavailable · 12 min old')
    const maintainers = rows.map((row) =>
      row.querySelector('a[href="/pipelines/$pipelineId/edit"]')?.getAttribute('data-params'),
    )
    expect(maintainers).toEqual([
      JSON.stringify({ pipelineId: 'mirror-core' }),
      JSON.stringify({ pipelineId: 'build-c360' }),
      JSON.stringify({ pipelineId: 'mirror-core' }),
      JSON.stringify({ pipelineId: 'mirror-core' }),
    ])
    expect(page.container.textContent).toContain(
      '4 views · 2 observed · 1 unavailable · 1 loading · maximum event age 4 s',
    )
    expect(page.container.textContent).toContain('a Replica is a mirrored copy of one table')
    expect(page.container.textContent).toContain('Tapstate state store')
  })
  it('keeps source-idle event age separate from observation availability and shows measurement times', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [
        viewEntry('idle', 'view', 'idle-pipeline', {
          state: 'fresh',
          behindSeconds: 900,
          eventAgeSeconds: 900,
          unit: 's',
          aggregation: 'max-input-table-event-age',
          observedAt: '2026-10-29T00:00:00Z',
          refreshedAt: '2026-10-29T00:00:01Z',
          observationAgeSeconds: 1,
        }),
      ],
    })
    page = await renderPage(<ViewsPage />)
    expect(page.container.textContent).toContain('Observed · event age 15 min')
    expect(page.container.textContent).toContain('Measured')
    expect(page.container.textContent).toContain('refreshed')
    expect(page.container.textContent).toContain('does not measure end-to-end lag')
    expect(page.container.textContent).not.toContain('behind')
  })
  it('shows a clock diagnostic and available refresh time when the measurement time is missing', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [
        viewEntry('unknown-clock', 'view', 'clock-pipeline', {
          state: 'stale',
          staleSeconds: null,
          reason: 'clock-or-time-unavailable',
          observedAt: null,
          refreshedAt: '2026-10-29T00:00:01Z',
        }),
      ],
    })
    page = await renderPage(<ViewsPage />)
    expect(page.container.textContent).toContain('Observation time unavailable')
    expect(page.container.textContent).toContain('Measured unknown · refreshed')
  })
})
