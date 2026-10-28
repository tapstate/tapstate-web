import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { identities, reauthenticateIdentity, oauthStart, invitations, useCloudAppState } =
  vi.hoisted(() => ({
    identities: vi.fn(),
    reauthenticateIdentity: vi.fn(),
    oauthStart: vi.fn(),
    invitations: vi.fn().mockResolvedValue([]),
    useCloudAppState: vi.fn(),
  }))

vi.mock('../../service/cloud-api', () => ({
  cloudApi: { identities, reauthenticateIdentity, oauthStart, invitations },
  CloudApiError: class extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../../state/cloud-app-state', () => ({ useCloudAppState }))

import { i18n } from '../../i18n'
import { SettingsPage } from './settings-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function linkButtons() {
  return Array.from(host?.querySelectorAll<HTMLButtonElement>('button') ?? []).filter((button) =>
    button.textContent?.includes('Link account'),
  )
}

async function renderPage() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <SettingsPage />
      </I18nextProvider>,
    )
  })
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  useCloudAppState.mockReturnValue({
    activeOrganization: {
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      ownerEmail: 'member@example.com',
    },
    organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', ownerEmail: 'member@example.com' }],
    user: { id: 'user-1', email: 'member@example.com', displayName: 'Member' },
  })
  identities.mockResolvedValue([
    { provider: 'google', email: 'member@example.com', linkedAt: '2026-10-14T00:00:00Z' },
  ])
  reauthenticateIdentity.mockResolvedValue(undefined)
  oauthStart.mockResolvedValue('http://localhost:8080/oauth2/authorization/github')
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.clearAllMocks()
})

describe('Cloud linked identity settings', () => {
  it('shows linked and unlinked providers with linking disabled for an existing identity', async () => {
    await renderPage()

    expect(host?.textContent).toContain('Linked as member@example.com')
    expect(host?.textContent).toContain('Not linked')
    expect(linkButtons()).toHaveLength(2)
    expect(linkButtons()[0]?.disabled).toBe(true)
    expect(linkButtons()[1]?.disabled).toBe(false)
  })

  it('shows a reauthentication error and keeps the provider action available', async () => {
    reauthenticateIdentity.mockRejectedValueOnce(new Error('Session expired'))
    await renderPage()
    const githubButton = linkButtons()[1]
    expect(githubButton).toBeDefined()

    await act(async () => githubButton?.click())

    expect(host?.querySelector('[role="alert"]')?.textContent).toContain(
      'Reauthenticate with your Cloud account',
    )
    expect(linkButtons()[1]?.disabled).toBe(false)
    expect(oauthStart).not.toHaveBeenCalled()
  })

  it('reports OAuth startup failures after reauthentication', async () => {
    oauthStart.mockRejectedValueOnce(new Error('Provider is unavailable'))
    await renderPage()

    await act(async () => linkButtons()[1]?.click())

    expect(reauthenticateIdentity).toHaveBeenCalledWith('')
    expect(oauthStart).toHaveBeenCalledWith('github', 'link')
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain('Could not start linking')
  })

  it('switches to organization tab and displays organization details and invitations', async () => {
    const onTabChange = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <I18nextProvider i18n={i18n}>
          <SettingsPage initialTab="account" onTabChange={onTabChange} />
        </I18nextProvider>,
      )
    })

    const orgTab = Array.from(host?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []).find(
      (btn) => btn.textContent?.includes('Organization'),
    )
    expect(orgTab).toBeDefined()

    await act(async () => {
      orgTab?.click()
    })

    expect(onTabChange).toHaveBeenCalledWith('organization')
    expect(host?.textContent).toContain('Acme')
    expect(host?.textContent).toContain('acme')
    expect(host?.textContent).toContain('Organization invitations')
  })
})
