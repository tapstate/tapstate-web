import '@/i18n/index'
import type { ReactNode } from 'react'

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderPage, viewEntry } from './views-test-support'

const { apiFetch, listPipelines, listViews } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  listPipelines: vi.fn(),
  listViews: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  listPipelines,
}))
vi.mock('@/service/view-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/view-client')>()),
  listViews,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

import { ViewDetailPage } from './view-detail-page'

let page: Awaited<ReturnType<typeof renderPage>> | null = null

beforeEach(() => {
  listPipelines.mockReset().mockResolvedValue([
    {
      id: 'build-c360',
      dag: { nodes: [], edges: [] },
      contentHash: 'h',
      status: { pipelineId: 'build-c360', state: 'RUNNING', failure: null },
    },
  ])
  listViews.mockReset().mockResolvedValue({
    available: true,
    views: [viewEntry('customer_360', 'view', 'build-c360', { state: 'fresh', behindSeconds: 3 })],
  })
})

afterEach(() => {
  page?.unmount()
  page = null
})

describe('ViewDetailPage', () => {
  it('does not interpret an unreported application time as an unapplied view', async () => {
    const view = viewEntry('customer_360', 'view', 'build-c360', {
      state: 'stale',
      staleSeconds: 0,
    })
    listViews.mockResolvedValue({
      available: true,
      views: [{ ...view, documents: 3, lastAppliedAt: null }],
    })
    page = await renderPage(<ViewDetailPage viewId="views/customer_360" />)
    const text = page.container.textContent ?? ''
    expect(text).toContain('Last applied time is not reported')
    expect(text).not.toContain('no change applied yet')
  })

  it('shows the Overview tab with the same status wording as the list', async () => {
    page = await renderPage(<ViewDetailPage viewId="views/customer_360" />)

    const text = page.container.textContent ?? ''
    expect(page.container.querySelector('h1')?.textContent).toBe('customer_360')
    expect(text).toContain('Maintained by build-c360')
    expect(text).toContain('Observed · event age 3 s')
    expect(text).toContain('build-c360 · running')
    expect(text).toContain('Observations current')
    expect(text).toContain('1.5 KB')
    expect(text).toContain('Tapstate state store')
    const tabs = [...page.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    expect(tabs).toEqual(['Overview', 'Documents', 'Shape', 'Lineage', 'Indexes'])
  })

  it('names the other collections its pipeline writes and shows load progress', async () => {
    listViews.mockResolvedValue({
      available: true,
      views: [
        viewEntry('accounts', 'replica', 'mirror-core', { state: 'loading', percent: 42 }),
        viewEntry('loans', 'replica', 'mirror-core', { state: 'fresh', behindSeconds: 2 }),
        viewEntry('customer_360', 'view', 'build-c360', { state: 'fresh', behindSeconds: 3 }),
      ],
    })

    page = await renderPage(<ViewDetailPage viewId="views/accounts" />)

    const text = page.container.textContent ?? ''
    expect(text).toContain('Also written by this pipeline:loans')
    expect(text).not.toContain('customer_360')
    expect(text).toContain('Initial load')
    expect(
      page.container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),
    ).toBe('42')
    expect(text).toContain('limit 16 MB per document')
  })

  it('says a tab is not available yet rather than showing empty data', async () => {
    page = await renderPage(<ViewDetailPage viewId="views/customer_360" />)

    const lineage = [...page.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent === 'Lineage',
    )
    act(() => lineage?.click())

    expect(lineage?.getAttribute('aria-selected')).toBe('true')
    expect(page.container.querySelector('[role="tabpanel"]')?.textContent).toContain(
      'Field lineage is not available on this server yet',
    )
  })

  it('says so when the view does not exist or the server does not list views', async () => {
    page = await renderPage(<ViewDetailPage viewId="views/missing" />)
    expect(page.container.textContent).toContain('No view named views/missing')
    page.unmount()

    listViews.mockResolvedValue({ available: false })
    page = await renderPage(<ViewDetailPage viewId="views/customer_360" />)
    expect(page.container.textContent).toContain('does not list views yet')
  })
})
