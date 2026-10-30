import '@/i18n/index'
import { act, type ReactNode } from 'react'
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
  it('removes every recovered diagnostic when one pipeline had multiple errors', async () => {
    const diagnostic = (pipelineId: string, code: string) => ({ pipelineId, code, params: {} })
    const q = diagnostic('q', 'q-error')
    listViews.mockResolvedValue({
      available: true,
      views: [],
      unresolved: [diagnostic('p', 'view-error'), diagnostic('p', 'sync-error'), q],
    })
    page = await renderPage(<ViewsPage />)
    expect(page.container.textContent).toContain('view-error')
    expect(page.container.textContent).toContain('sync-error')

    await act(async () => {
      page!.client.setQueryData(['views'], { available: true, views: [], unresolved: [q] })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(page.container.textContent).not.toContain('view-error')
    expect(page.container.textContent).not.toContain('sync-error')
    expect(page.container.querySelectorAll('.views-page__state li')).toHaveLength(1)
    expect(page.container.textContent).toContain('q-error')

    await act(async () => {
      page!.client.setQueryData(['views'], { available: true, views: [], unresolved: [] })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(page.container.textContent).not.toContain('q-error')
    expect(page.container.textContent).toContain('No views yet')
  })

  it('shows unresolved pipelines without presenting them as an empty collection list', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [],
      unresolved: [
        {
          pipelineId: 'orders-pipeline',
          code: 'actuation.source-schema-not-discovered',
          params: { source: 'orders' },
        },
      ],
    })
    page = await renderPage(<ViewsPage />)
    expect(page.container.textContent).toContain('Output location not yet resolved')
    expect(page.container.textContent).toContain('orders-pipeline')
    expect(page.container.textContent).toContain('actuation.source-schema-not-discovered')
    expect(page.container.textContent).not.toContain('No views yet')
    expect(page.container.querySelector('table')).toBeNull()
  })

  it('keeps known outputs beside an unresolved pipeline', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [viewEntry('orders', 'replica', 'healthy', { state: 'not-loaded' })],
      unresolved: [
        {
          pipelineId: 'unresolved-pipeline',
          code: 'actuation.source-schema-not-discovered',
          params: {},
        },
      ],
    })
    page = await renderPage(<ViewsPage />)
    expect(page.container.querySelector('table')).not.toBeNull()
    expect(page.container.textContent).toContain('unresolved-pipeline')
  })

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

  it('lists one row per replica of a mirror and shows pipeline ownership as secondary text', async () => {
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
    expect(rows[3].textContent).toContain('Stale · 12 min')
    const maintainers = rows.map((row) => row.querySelectorAll('td')[6]?.textContent?.trim())
    expect(maintainers).toEqual(['mirror-core', 'build-c360', 'mirror-core', 'mirror-core'])
    expect(rows.every((row) => !row.querySelector('a[href="/pipelines/$pipelineId/edit"]'))).toBe(
      true,
    )
    expect(page.container.textContent).toContain(
      '4 views · 2 fresh · 1 stale · 1 loading · slowest 4 s behind',
    )
    expect(page.container.textContent).toContain('a Replica is a mirrored copy of one table')
    expect(page.container.textContent).toContain('Tapstate state store')
  })
})
