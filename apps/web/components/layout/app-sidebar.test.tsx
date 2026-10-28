import '@/i18n/index'
import type { HTMLAttributes, ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  loadCloudWorkspaceContext: vi.fn(),
  profile: 'local',
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to: string; children: ReactNode } & HTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/overview' } }),
}))

vi.mock('@/service/cloud-workspace-client', () => ({
  loadCloudWorkspaceContext: mockState.loadCloudWorkspaceContext,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { profile: string; apiFetch: typeof fetch }) => T) =>
    selector({ profile: mockState.profile, apiFetch: mockState.apiFetch }),
}))

vi.mock('./app-header', () => ({ AppHeader: () => null }))

import { AppSidebar } from './app-sidebar'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let container: HTMLDivElement
let root: Root

async function renderSidebar(profile: 'local' | 'cloud') {
  mockState.profile = profile
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppSidebar />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  mockState.profile = 'local'
  mockState.apiFetch.mockReset()
  mockState.loadCloudWorkspaceContext.mockResolvedValue({
    clusterName: 'cluster',
    clusterState: 'READY',
    organizationId: 'org',
    organizationName: 'Organization',
    region: 'us-east-1',
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('AppSidebar', () => {
  it('keeps the organization return link in cloud mode', async () => {
    await renderSidebar('cloud')
    const link = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="Return to Organization in Tapstate Cloud"]',
    )
    expect(link?.href).toContain('/?organizationId=org')
  })

  it.each(['local', 'cloud'] as const)(
    'hides Explorations and preserves the primary navigation order for the %s profile',
    async (profile) => {
      await renderSidebar(profile)

      const navigation = container.querySelector('.app-sidebar__nav:not(.app-sidebar__nav--footer)')
      expect(
        [...(navigation?.querySelectorAll<HTMLAnchorElement>('a') ?? [])].map((link) =>
          link.getAttribute('href'),
        ),
      ).toEqual(['/overview', '/sources', '/pipelines', '/views'])
      expect(container.querySelector('a[href="/explorations"]')).toBeNull()
      expect(container.querySelector('a[href="/settings"]')).toBeNull()
    },
  )
})
