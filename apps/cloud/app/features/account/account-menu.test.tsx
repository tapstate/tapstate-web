import '../../i18n'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockSetDarkMode = vi.fn()
vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    darkMode: false,
    setDarkMode: mockSetDarkMode,
  }),
}))

import { AccountMenu } from './account-menu'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it('renders user pill trigger and opens account popup with profile, appearance, and logout', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onLogout = vi.fn()

  try {
    await act(async () => {
      root.render(
        <AccountMenu
          organizationId="org-123"
          onLogout={onLogout}
          user={{
            email: 'alex@tapstate.com',
            displayName: 'Alex Smith',
          }}
        />,
      )
    })

    const trigger = host.querySelector<HTMLButtonElement>('button[title="Alex Smith"]')!
    expect(trigger).not.toBeNull()
    expect(trigger.textContent).toContain('Alex Smith')
    expect(trigger.textContent).toContain('A')

    await act(async () => {
      trigger.click()
    })

    // Check user card content
    expect(document.body.textContent).toContain('alex@tapstate.com')
    expect(document.body.textContent).toContain('Profile')
    expect(document.body.textContent).toContain('Appearance')
    expect(document.body.textContent).toContain('Log out')

    // Click Profile
    const profileItem = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (item) => item.textContent?.includes('Profile'),
    )!
    expect(profileItem).toBeDefined()
    await act(async () => {
      profileItem.click()
    })
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/settings',
      search: { organizationId: 'org-123', tab: 'account' },
    })

    // Open menu again to test logout
    await act(async () => {
      trigger.click()
    })
    const logoutItem = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (item) => item.textContent?.includes('Log out'),
    )!
    expect(logoutItem).toBeDefined()
    await act(async () => {
      logoutItem.click()
    })
    expect(onLogout).toHaveBeenCalled()
  } finally {
    await act(async () => {
      root.unmount()
    })
    host.remove()
  }
})
