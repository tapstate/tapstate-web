import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/utils/deployment-profile', () => ({ deploymentProfile: 'cloud' }))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { profile: string; logout: () => Promise<void> }) => T) =>
    selector({ profile: 'cloud', logout: async () => {} }),
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
  expect(document.querySelector('a[href="https://tapstate.dev/docs"]')).not.toBeNull()
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
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <AppHeader cloudUserEmail="alice@example.com" />
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
