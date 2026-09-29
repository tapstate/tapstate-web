import '@/i18n/index'
import type { ReactNode } from 'react'

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderPage, viewEntry } from './views-test-support'

const { apiFetch, listViews } = vi.hoisted(() => ({ apiFetch: vi.fn(), listViews: vi.fn() }))

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
  it('shows the Overview tab with the same status wording as the list', async () => {
    page = await renderPage(<ViewDetailPage viewId="views/customer_360" />)

    const text = page.container.textContent ?? ''
    expect(page.container.querySelector('h1')?.textContent).toBe('customer_360')
    expect(text).toContain('Maintained by build-c360')
    expect(text).toContain('Fresh · 3 s behind')
    expect(text).toContain('1.5 KB')
    expect(text).toContain('Tapstate state store')
    const tabs = [...page.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    expect(tabs).toEqual(['Overview', 'Documents', 'Shape', 'Lineage', 'Indexes'])
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
