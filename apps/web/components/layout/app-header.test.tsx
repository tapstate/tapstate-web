import '@/i18n/index'
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
  await act(async () =>
    root.render(
      <>
        <AppHeader />
        <TawkFeedbackWidget />
      </>,
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
