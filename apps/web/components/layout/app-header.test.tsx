import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/utils/deployment-profile', () => ({ deploymentProfile: 'cloud' }))
const auth = vi.hoisted(() => ({
  profile: 'cloud',
  logout: async () => {},
  isAuthenticated: true,
  apiFetch: vi.fn(),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: typeof auth) => T) => selector(auth),
}))

import { TawkFeedbackWidget } from '@/features/feedback/tawk-feedback-widget'

import { AppHeader } from './app-header'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const showWidget = vi.fn()
const hideWidget = vi.fn()
const maximize = vi.fn()

beforeEach(() => {
  auth.profile = 'cloud'
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.Tawk_API = Object.assign({ showWidget, hideWidget }, { maximize })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.getElementById('tapstate-tawk-feedback-widget')?.remove()
  delete window.Tawk_API
  vi.clearAllMocks()
})

it('opens documentation or support from the sidebar Help menu', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
        <TawkFeedbackWidget />
      </QueryClientProvider>,
    ),
  )
  const help = host.querySelector<HTMLButtonElement>('button[aria-label="Help"]')
  expect(help).not.toBeNull()
  await act(async () => help?.click())
  expect(document.querySelector('a[href="https://tapstate.dev/"]')).not.toBeNull()
  const support = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) =>
    item.textContent?.includes('Contact support'),
  )
  expect(support).toBeDefined()
  await act(async () => support?.click())
  expect(showWidget).toHaveBeenCalled()
  expect(maximize).toHaveBeenCalled()
})

it('opens the account menu with the cloud identity and sign out action', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['current-user'], {
    mode: 'cloud',
    principal: 'cloud-user-id',
    username: null,
    email: 'alice@example.com',
    scopes: ['read'],
  })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    ),
  )
  const account = host.querySelector<HTMLButtonElement>('button[aria-label="Account menu"]')
  expect(account?.textContent).toContain('alice')
  await act(async () => account?.click())
  expect(document.body.textContent).toContain('alice@example.com')
  expect(document.body.textContent).toContain('Language')
  expect(host.querySelector('button[aria-label="Language"]')).toBeNull()
  expect(
    [...document.querySelectorAll('[role="menuitem"]')].some((item) =>
      item.textContent?.includes('Sign out'),
    ),
  ).toBe(true)
})

it('uses the on-prem username when no email is available', async () => {
  auth.profile = 'on-prem'
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['current-user'], {
    mode: 'on-prem',
    principal: 'operator',
    username: 'operator',
    email: null,
    scopes: ['read'],
  })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    ),
  )
  expect(
    host.querySelector<HTMLButtonElement>('button[aria-label="Account menu"]')?.textContent,
  ).toContain('operator')
})

it('shows the signed-in on-prem email in the account menu', async () => {
  auth.profile = 'on-prem'
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['current-user'], {
    mode: 'on-prem',
    principal: 'alice@example.com',
    username: 'alice@example.com',
    email: 'alice@example.com',
    scopes: ['read'],
  })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    ),
  )
  const account = host.querySelector<HTMLButtonElement>('button[aria-label="Account menu"]')
  await act(async () => account?.click())
  expect(document.body.textContent).toContain('alice@example.com')
})

it('loads the cloud account from the authenticated current-user endpoint', async () => {
  auth.apiFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        mode: 'cloud',
        principal: 'cloud-user-id',
        username: null,
        email: 'alice@example.com',
        scopes: ['read'],
      }),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    )
  })
  await vi.waitFor(() =>
    expect(auth.apiFetch).toHaveBeenCalledWith('/api/auth/me', { cache: 'no-store' }),
  )
  await vi.waitFor(() => expect(host.textContent).toContain('alice'))
})

it('keeps the Cloud workspace email when an older server has no current-user endpoint', async () => {
  auth.apiFetch.mockResolvedValue(new Response(null, { status: 404 }))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader cloudUserEmail="legacy@example.com" />
      </QueryClientProvider>,
    )
  })
  await vi.waitFor(() =>
    expect(auth.apiFetch).toHaveBeenCalledWith('/api/auth/me', { cache: 'no-store' }),
  )
  expect(host.querySelector<HTMLButtonElement>('button[aria-label="Account menu"]')?.title).toBe(
    'legacy@example.com',
  )
})
