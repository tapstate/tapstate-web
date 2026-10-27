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
    registrationPolicyStatus: 'ready',
    trialCodeRequired: true,
    onRetryRegistrationPolicy: vi.fn(),
    onAccessType: vi.fn().mockResolvedValue({ type: 'organization' }),
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

async function checkLegalCheckbox() {
  const checkbox = host?.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (checkbox) {
    await act(async () => {
      checkbox.click()
    })
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Cloud invitation authentication', () => {
  it('continues Google signup with an invitation after an invite-required callback', async () => {
    const token = 'A2B3C4D5E6F7'
    const link = new URL('/auth', window.location.origin)
    link.searchParams.set('invite', token)
    const props = await renderPage({
      invitationToken: null,
      initialMode: 'register',
      oauthOutcome: 'auth.invitation-required',
    })

    expect(host?.querySelector('h1')?.textContent).toContain('Create your Tapstate account')
    await act(async () => changeInput('#auth-invitation-link', link.toString()))
    await clickButton('Continue')
    await clickButton('Sign up with Google')

    expect(props.onOAuth).toHaveBeenCalledWith('google', 'register', token, '')
    expect(props.onRequestCode).not.toHaveBeenCalled()
  })

  it('keeps sign-up reachable for users who do not have an account yet', async () => {
    const props = await renderPage({ invitationToken: null })

    expect(host?.querySelector('h1')?.textContent).toContain('Sign in to Tapstate Cloud')
    await clickButton('Sign up')

    expect(host?.querySelector('h1')?.textContent).toContain('Create your Tapstate account')
    expect(host?.querySelector('#auth-name')).not.toBeNull()
    const googleButton = buttonWithText('Sign up with Google') as HTMLButtonElement
    const githubButton = buttonWithText('Sign up with GitHub') as HTMLButtonElement
    expect(googleButton.disabled).toBe(true)
    expect(githubButton.disabled).toBe(true)
    expect((buttonWithText('Email me a verification code') as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(host?.textContent).toContain('During early access, enter a trial code')
    expect(host?.textContent).toContain('Already have an account?')
    await clickButton('Sign up with Google')
    await clickButton('Sign up with GitHub')
    expect(props.onOAuth).not.toHaveBeenCalled()
    expect(props.onRequestCode).not.toHaveBeenCalled()
  })

  it('rejects legacy 43-character invitation codes', async () => {
    const props = await renderPage({ invitationToken: null })
    await act(async () => changeInput('#auth-invitation-link', 'A'.repeat(43)))
    await clickButton('Continue')

    expect(host?.querySelector('[role="alert"]')?.textContent).toContain(
      'This invitation link is not valid.',
    )
    expect(props.onAccessType).not.toHaveBeenCalled()
    expect(props.onOAuth).not.toHaveBeenCalled()
  })

  it('registers an invited user after email verification and authenticates the new session', async () => {
    const props = await renderPage()
    await act(async () => changeInput('#auth-name', 'Member'))
    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')
    await act(async () => changeInput('#auth-code', '123456'))
    await act(async () => changeInput('#auth-password', 'correct-horse-battery'))
    await checkLegalCheckbox()
    await submitForm()

    expect(props.onRequestCode).toHaveBeenCalledWith('member@example.com', 'invite-token')
    expect(props.onRegisterWithEmail).toHaveBeenCalledWith({
      email: 'member@example.com',
      invitationToken: 'invite-token',
      code: '123456',
      password: 'correct-horse-battery',
      displayName: 'Member',
      organizationName: '',
      agreedLegalVersion: expect.any(String),
    })
    expect(props.onAuthenticated).toHaveBeenCalledWith(user)
  })

  it('starts Google signup without a trial code after the gate is disabled', async () => {
    const props = await renderPage({ invitationToken: null, trialCodeRequired: false })
    await clickButton('Sign up')
    await act(async () => changeInput('#auth-organization-name', 'Member Workspace'))
    await clickButton('Sign up with Google')

    expect(props.onOAuth).toHaveBeenCalledWith('google', 'register', null, 'Member Workspace')
  })

  it('registers a new account and organization without a trial code when the gate is disabled', async () => {
    const props = await renderPage({ invitationToken: null, trialCodeRequired: false })
    await clickButton('Sign up')
    await act(async () => changeInput('#auth-name', 'Member'))
    await act(async () => changeInput('#auth-organization-name', 'Member Workspace'))
    await act(async () => changeInput('#auth-email', 'member@example.com'))

    const requestCodeButton = buttonWithText('Email me a verification code') as HTMLButtonElement
    expect(requestCodeButton.disabled).toBe(false)
    expect(host?.querySelector('#auth-invitation-link')).toBeNull()
    await clickButton('Email me a verification code')
    await act(async () => changeInput('#auth-code', '123456'))
    await act(async () => changeInput('#auth-password', 'correct-horse-battery'))
    await checkLegalCheckbox()
    await submitForm()

    expect(props.onRequestCode).toHaveBeenCalledWith('member@example.com', null)
    expect(props.onRegisterWithEmail).toHaveBeenCalledWith({
      email: 'member@example.com',
      code: '123456',
      password: 'correct-horse-battery',
      displayName: 'Member',
      organizationName: 'Member Workspace',
      agreedLegalVersion: expect.any(String),
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

  it('waits 60 seconds before allowing another verification code request', async () => {
    vi.useFakeTimers()
    const props = await renderPage()

    await act(async () => changeInput('#auth-email', 'member@example.com'))
    await clickButton('Email me a verification code')

    const resendButton = buttonWithText('Send another code in 60 seconds') as HTMLButtonElement
    expect(resendButton.disabled).toBe(true)

    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(buttonWithText('Send another code')?.disabled).toBe(false)

    await clickButton('Send another code')
    expect(props.onRequestCode).toHaveBeenCalledTimes(2)
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
    expect(props.onOAuth).toHaveBeenCalledWith('google', 'register', 'invite-token', '')
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
