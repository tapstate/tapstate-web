import type { ComponentProps } from 'react'

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserProfile } from '../../types'

import { i18n } from '../../i18n'
import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { cloudApiOrigin } from '../../service/cloud-api-origin'
import { AuthPage } from './auth-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const user: UserProfile = { email: 'member@example.com', displayName: 'Member' }

let host: HTMLDivElement | undefined
let root: Root | undefined

function buttonWithText(text: string) {
  return Array.from(host?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  )
}

function changeInput(selector: string, value: string) {
  const input = host?.querySelector<HTMLInputElement>(selector)
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input?.dispatchEvent(new Event('input', { bubbles: true }))
}

async function renderPage(props: Partial<ComponentProps<typeof AuthPage>> = {}) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const defaults: ComponentProps<typeof AuthPage> = {
    darkMode: false,
    setDarkMode: vi.fn(),
    invitationToken: 'invite-token',
    onLogin: vi.fn().mockResolvedValue(user),
    onRequestCode: vi.fn().mockResolvedValue(undefined),
    onRegisterWithEmail: vi.fn().mockResolvedValue(user),
    onAcceptInvitation: vi.fn().mockResolvedValue(user),
    onCurrentSession: vi.fn().mockResolvedValue(user),
    onAuthenticated: vi.fn().mockResolvedValue(undefined),
    onOAuth: vi.fn().mockResolvedValue(undefined),
  }
  const merged = { ...defaults, ...props }
  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <AuthPage {...merged} />
      </I18nextProvider>,
    )
  })
  return merged
}

async function clickButton(text: string) {
  const button = buttonWithText(text)
  expect(button).toBeDefined()
  await act(async () => button?.click())
}

async function submitForm() {
  await act(async () => {
    host
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Cloud invitation authentication', () => {
  it('continues Google signup with an invitation after an invite-required callback', async () => {
    const token = 'A'.repeat(43)
    const link = new URL('/auth', window.location.origin)
    link.searchParams.set('invite', token)
    const props = await renderPage({
      invitationToken: null,
      oauthOutcome: 'auth.invitation-required',
    })

    await act(async () => changeInput('#auth-invitation-link', link.toString()))
    await clickButton('Continue')
    await clickButton('Sign up with Google')

    expect(props.onOAuth).toHaveBeenCalledWith('google', 'register', token)
    expect(props.onRequestCode).not.toHaveBeenCalled()
  })

  it('registers an invited user after email verification and authenticates the new session', async () => {
    const props = await renderPage()
    await act(async () => changeInput('#auth-name', 'Member'))
    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')
    await act(async () => changeInput('#auth-code', '123456'))
    await act(async () => changeInput('#auth-password', 'correct-horse-battery'))
    await submitForm()

    expect(props.onRequestCode).toHaveBeenCalledWith('member@example.com', 'invite-token')
    expect(props.onRegisterWithEmail).toHaveBeenCalledWith({
      email: 'member@example.com',
      invitationToken: 'invite-token',
      code: '123456',
      password: 'correct-horse-battery',
      displayName: 'Member',
    })
    expect(props.onAuthenticated).toHaveBeenCalledWith(user)
  })

  it('shows the rate limit response and allows retrying after the limit clears', async () => {
    const onRequestCode = vi
      .fn()
      .mockRejectedValueOnce(
        new CloudApiError('Too many requests', 429, 'auth.email-code-rate-limited'),
      )
      .mockResolvedValueOnce(undefined)
    await renderPage({ onRequestCode })

    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain('Too many code requests')

    await clickButton('Email me a verification code')
    expect(host?.querySelector('#auth-code')).not.toBeNull()
  })

  it('shows an expired invitation error without switching to open registration', async () => {
    const onRequestCode = vi
      .fn()
      .mockRejectedValue(new CloudApiError('Invitation expired', 410, 'auth.invitation-expired'))
    await renderPage({ onRequestCode })
    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')

    expect(host?.querySelector('[role="alert"]')?.textContent).toContain(
      'This invitation has expired',
    )
    expect(host?.querySelector('#auth-code')).toBeNull()
  })

  it('shows a generic error when the Cloud request fails unexpectedly', async () => {
    await renderPage({
      onRequestCode: vi.fn().mockRejectedValue(new CloudApiError('Server error', 500)),
    })
    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')

    expect(host?.querySelector('[role="alert"]')?.textContent).toContain(
      'We could not complete that request',
    )
  })

  it('shows OAuth cancellation and account-link conflict outcomes', async () => {
    await renderPage({ invitationToken: null, oauthOutcome: 'cancelled' })
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain('Sign-in was cancelled')

    await act(async () => root?.unmount())
    host?.remove()
    host = undefined
    root = undefined

    await renderPage({ invitationToken: null, oauthOutcome: 'auth.identity-link-conflict' })
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      'already linked to another account',
    )
  })

  it('starts the selected provider with the invitation signup intent', async () => {
    const props = await renderPage()
    await clickButton('Sign up with Google')
    expect(props.onOAuth).toHaveBeenCalledWith('google', 'register', 'invite-token')
  })

  it('sends the invitation token in the OAuth-start request body, not in its URL', async () => {
    const fetchStub = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            code: 'ok',
            data: { authorizationUrl: '/oauth2/authorization/google' },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    )
    vi.stubGlobal('fetch', fetchStub)

    const authorizationUrl = await cloudApi.oauthStart('google', 'signup', 'raw-invitation-token')
    const [requestUrl, requestInit] = fetchStub.mock.calls[0] ?? []

    expect(new URL(String(requestUrl), window.location.origin).search).toBe('')
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      flow: 'signup',
      invitationToken: 'raw-invitation-token',
    })
    expect(authorizationUrl).toBe(
      new URL('/oauth2/authorization/google', cloudApiOrigin || window.location.origin).toString(),
    )
  })
})
