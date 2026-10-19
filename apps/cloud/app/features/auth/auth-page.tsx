import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../types'

import {
  CloudApiError,
  type EmailRegistrationInput,
  type LoginInput,
} from '../../service/cloud-api'
import { AuthProviderButtons } from './auth-provider-buttons'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  invitationToken: string | null
  oauthOutcome?: string
  onLogin: (input: LoginInput) => Promise<UserProfile>
  onRequestCode: (email: string, invitationToken: string) => Promise<void>
  onRegisterWithEmail: (input: EmailRegistrationInput) => Promise<UserProfile>
  onAccessType: (code: string) => Promise<{ type: 'trial' | 'organization' }>
  onAcceptInvitation: (invitationToken: string, organizationName?: string) => Promise<UserProfile>
  onCurrentSession: () => Promise<UserProfile>
  onAuthenticated: (user: UserProfile) => Promise<void>
  onOAuth: (
    provider: 'google' | 'github',
    mode: AuthMode,
    invitationToken: string | null,
    organizationName?: string,
  ) => Promise<void>
}

const inputClassName =
  'h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]'

const codeToMessage: Record<string, string> = {
  'auth.email-already-registered': 'auth.errors.emailExists',
  'auth.invitation-required': 'auth.errors.invitationRequired',
  'auth.invitation-invalid': 'auth.errors.invitationInvalid',
  'auth.invitation-expired': 'auth.errors.invitationExpired',
  'auth.invitation-revoked': 'auth.errors.invitationRevoked',
  'auth.invitation-consumed': 'auth.errors.invitationConsumed',
  'auth.invitation-email-mismatch': 'auth.errors.invitationEmailMismatch',
  'auth.email-code-invalid': 'auth.errors.codeInvalid',
  'auth.email-code-expired': 'auth.errors.codeExpired',
  'auth.email-code-attempts-exceeded': 'auth.errors.codeAttemptsExceeded',
  'auth.email-code-rate-limited': 'auth.errors.codeRateLimited',
  'auth.email-code-cooldown': 'auth.errors.codeCooldown',
  'auth.email-delivery-unavailable': 'auth.errors.emailUnavailable',
  'auth.sso-provider-unavailable': 'auth.errors.providerUnavailable',
  'auth.sso-email-unverified': 'auth.errors.providerEmailUnverified',
  'auth.sso-account-link-required': 'auth.errors.accountLinkRequired',
  'auth.identity-link-conflict': 'auth.errors.identityConflict',
  'auth.reauthentication-required': 'auth.errors.reauthenticationRequired',
}

function errorMessageKey(error: unknown) {
  if (!(error instanceof CloudApiError)) return 'auth.errors.generic'
  if (error.status === 0) return 'auth.errors.network'
  if (error.status === 401) return 'auth.errors.invalidCredentials'
  if (error.code && codeToMessage[error.code]) return codeToMessage[error.code]
  if (error.status === 409) return 'auth.errors.emailExists'
  return 'auth.errors.generic'
}

function oauthErrorMessage(outcome: string) {
  if (outcome === 'cancelled') return 'auth.errors.oauthCancelled'
  if (outcome === 'auth.invitation-required') return 'auth.errors.invitationRequiredAfterOAuth'
  if (outcome === 'provider-unavailable') return 'auth.errors.providerUnavailable'
  if (outcome === 'provider-error' || outcome === 'provider-email-unavailable') {
    return 'auth.errors.providerError'
  }
  if (outcome.startsWith('auth.')) return codeToMessage[outcome] ?? 'auth.errors.generic'
  return null
}

export function AuthPage({
  darkMode,
  setDarkMode,
  invitationToken,
  oauthOutcome,
  onLogin,
  onRequestCode,
  onRegisterWithEmail,
  onAccessType,
  onAcceptInvitation,
  onCurrentSession,
  onAuthenticated,
  onOAuth,
}: AuthPageProps) {
  const { t } = useTranslation()
  const [activeInvitationToken, setActiveInvitationToken] = useState(invitationToken)
  const [invitationLink, setInvitationLink] = useState('')
  const [accessType, setAccessType] = useState<'trial' | 'organization' | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [mode, setMode] = useState<AuthMode>(invitationToken ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthCompleting, setOauthCompleting] = useState(false)
  const oauthHandled = useRef(false)

  useEffect(() => {
    if (!activeInvitationToken) {
      setAccessType(null)
      return
    }
    let live = true
    void onAccessType(activeInvitationToken)
      .then((result) => {
        if (live) setAccessType(result.type)
      })
      .catch((cause: unknown) => {
        if (live) {
          setAccessType(null)
          setError(errorMessageKey(cause))
        }
      })
    return () => {
      live = false
    }
  }, [activeInvitationToken, onAccessType])

  useEffect(() => {
    if (!oauthOutcome || oauthHandled.current) return
    if (oauthOutcome === 'success') {
      oauthHandled.current = true
      setOauthCompleting(true)
      void onCurrentSession()
        .then(onAuthenticated)
        .catch((cause: unknown) => setError(errorMessageKey(cause)))
        .finally(() => setOauthCompleting(false))
      return
    }
    const message = oauthErrorMessage(oauthOutcome)
    if (message) setError(message)
  }, [oauthOutcome, onAuthenticated, onCurrentSession])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (activeInvitationToken && !accessType) return
    if (accessType === 'trial' && !organizationName.trim()) {
      setError('auth.errors.organizationNameRequired')
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      let user: UserProfile
      if (mode === 'login') {
        user = await onLogin({ email: email.trim(), password })
        if (activeInvitationToken)
          user = await onAcceptInvitation(activeInvitationToken, organizationName.trim())
      } else {
        if (!activeInvitationToken) {
          setError('auth.errors.invitationRequired')
          return
        }
        if (!verificationSent) {
          setError('auth.errors.requestCodeFirst')
          return
        }
        user = await onRegisterWithEmail({
          email: email.trim(),
          invitationToken: activeInvitationToken,
          code: verificationCode.trim(),
          password,
          displayName: displayName.trim(),
          organizationName: organizationName.trim(),
        })
      }
      await onAuthenticated(user)
    } catch (cause) {
      setError(errorMessageKey(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestCode = async () => {
    if (!activeInvitationToken) {
      setError('auth.errors.invitationRequired')
      return
    }
    if (!accessType) return
    setError(null)
    setIsSendingCode(true)
    try {
      await onRequestCode(email.trim(), activeInvitationToken)
      setVerificationSent(true)
    } catch (cause) {
      setError(errorMessageKey(cause))
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (activeInvitationToken && !accessType) return
    if (accessType === 'trial' && !organizationName.trim()) {
      setError('auth.errors.organizationNameRequired')
      return
    }
    setError(null)
    setIsStartingOAuth(true)
    try {
      await onOAuth(provider, mode, activeInvitationToken, organizationName.trim())
    } catch (cause) {
      setError(errorMessageKey(cause))
      setIsStartingOAuth(false)
    }
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
  }

  const applyInvitationLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = invitationLink.trim()
    let token = input
    if (input.includes('://')) {
      try {
        const url = new URL(input)
        if (url.origin !== window.location.origin || url.pathname !== '/auth') {
          setError('auth.errors.invitationInvalid')
          return
        }
        token =
          new URLSearchParams(url.hash.replace(/^#/, '')).get('invite') ??
          url.searchParams.get('invite') ??
          url.searchParams.get('invitationToken') ??
          ''
      } catch {
        setError('auth.errors.invitationInvalid')
        return
      }
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setError('auth.errors.invitationInvalid')
      return
    }
    setActiveInvitationToken(token)
    setAccessType(null)
    setVerificationSent(false)
    setVerificationCode('')
    setInvitationLink('')
    setMode('register')
    setError(null)
  }

  const updateEmail = (value: string) => {
    if (email.trim().toLowerCase() !== value.trim().toLowerCase()) {
      setVerificationSent(false)
      setVerificationCode('')
    }
    setEmail(value)
  }

  if (oauthCompleting) {
    return (
      <AuthShell darkMode={darkMode} setDarkMode={setDarkMode}>
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p className="text-sm text-[var(--muted-foreground)]">{t('auth.working')}</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell darkMode={darkMode} setDarkMode={setDarkMode}>
      {error && (
        <div
          className="mb-5 flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--app-background)] p-3 text-sm text-[var(--foreground)]"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t(error)}</span>
        </div>
      )}

      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          {t(mode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t(mode === 'login' ? 'auth.loginDescription' : 'auth.registerDescription')}
        </p>
      </div>

      {activeInvitationToken && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--app-background)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          <span>{t('auth.invitationNotice')}</span>
          <button
            className="shrink-0 font-medium text-[var(--foreground)] hover:underline"
            onClick={() => {
              setActiveInvitationToken(null)
              setVerificationSent(false)
              setVerificationCode('')
              setError(null)
            }}
            type="button"
          >
            {t('auth.changeCode')}
          </button>
        </div>
      )}

      {accessType === 'trial' && (
        <div className="mt-4">
          <Field label={t('auth.organizationNameLabel')} htmlFor="auth-organization-name">
            <input
              autoComplete="organization"
              className={inputClassName}
              id="auth-organization-name"
              maxLength={100}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
              value={organizationName}
            />
          </Field>
        </div>
      )}

      {!activeInvitationToken && (
        <form className="mt-4 space-y-2" onSubmit={applyInvitationLink}>
          <label className="block text-sm font-medium" htmlFor="auth-invitation-link">
            {t('auth.invitationLinkLabel')}
          </label>
          <div className="flex gap-2">
            <input
              autoComplete="off"
              className={inputClassName}
              id="auth-invitation-link"
              onChange={(event) => setInvitationLink(event.target.value)}
              placeholder={t('auth.invitationLinkPlaceholder')}
              value={invitationLink}
            />
            <button
              className="shrink-0 rounded-md bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)]"
              type="submit"
            >
              {t('auth.useInvitation')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        <AuthProviderButtons
          disabled={
            isSubmitting ||
            isSendingCode ||
            isStartingOAuth ||
            Boolean(activeInvitationToken && !accessType)
          }
          mode={mode}
          onStart={(provider) => void handleOAuth(provider)}
        />
        {isStartingOAuth && (
          <p aria-live="polite" className="text-center text-xs text-[var(--muted-foreground)]">
            {t('auth.working')}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <Field label={t('auth.nameLabel')} htmlFor="auth-name">
              <input
                autoComplete="name"
                className={inputClassName}
                id="auth-name"
                maxLength={100}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t('auth.namePlaceholder')}
                value={displayName}
              />
            </Field>
          )}

          <Field label={t('auth.emailLabel')} htmlFor="auth-email">
            <input
              autoComplete="email"
              className={inputClassName}
              id="auth-email"
              onChange={(event) => updateEmail(event.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              type="email"
              value={email}
            />
          </Field>

          {mode === 'register' && (
            <div className="space-y-2">
              <button
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--app-background)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!email.trim() || isSendingCode || isSubmitting || !accessType}
                onClick={handleRequestCode}
                type="button"
              >
                {isSendingCode
                  ? t('auth.sendingCode')
                  : verificationSent
                    ? t('auth.resendCode')
                    : t('auth.sendCode')}
              </button>
              {verificationSent && (
                <Field label={t('auth.codeLabel')} htmlFor="auth-code">
                  <input
                    autoComplete="one-time-code"
                    className={inputClassName}
                    id="auth-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                    pattern="[0-9]{6}"
                    required
                    value={verificationCode}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('auth.codeSentTo', { email: email.trim() })}
                  </p>
                </Field>
              )}
            </div>
          )}

          {(mode === 'login' || verificationSent) && (
            <Field label={t('auth.passwordLabel')} htmlFor="auth-password">
              <div className="relative">
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`${inputClassName} pr-10`}
                  id="auth-password"
                  minLength={mode === 'register' ? 8 : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t(
                    mode === 'login' ? 'auth.passwordPlaceholder' : 'auth.newPasswordPlaceholder',
                  )}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  className="absolute inset-y-0 right-3 text-[var(--muted-foreground)]"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          )}

          {(mode === 'login' || verificationSent) && (
            <button
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                isSubmitting || isSendingCode || Boolean(activeInvitationToken && !accessType)
              }
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                  <span>{t('auth.working')}</span>
                </>
              ) : (
                <>
                  <span>{t(mode === 'login' ? 'auth.loginAction' : 'auth.registerAction')}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </form>

        {activeInvitationToken ? (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            {t(mode === 'login' ? 'auth.haveAccount' : 'auth.haveInviteAccount')}{' '}
            <button
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              type="button"
            >
              {t(mode === 'login' ? 'auth.goRegister' : 'auth.goLogin')}
            </button>
          </p>
        ) : (
          <p className="text-center text-xs text-[var(--muted-foreground)]">
            {t('auth.invitationRequiredForRegistration')}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{t('auth.securityNote')}</span>
        </div>
      </div>
    </AuthShell>
  )
}

function AuthShell({
  children,
  darkMode,
  setDarkMode,
}: {
  children: ReactNode
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-between px-4 py-6 text-[var(--foreground)]">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 dark:hidden">
            <img alt="" className="h-7 w-7" src="/tapstate-app-icon.svg" />
            <img alt="Tapstate" className="h-7 w-auto" src="/tapstate-wordmark-light.svg" />
          </div>
          <img
            alt="Tapstate"
            className="hidden h-7 w-auto dark:block"
            src="/tapstate-lockup-dark.svg"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">
            {t('auth.headerNote')}
          </span>
          <button
            aria-label={t('app.toggleTheme')}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            onClick={() => setDarkMode(!darkMode)}
            title={t('app.toggleTheme')}
            type="button"
          >
            {darkMode ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <main className="my-auto flex w-full max-w-md items-center justify-center py-10">
        <section className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--main-shadow)] sm:p-8">
          {children}
        </section>
      </main>

      <footer className="w-full max-w-5xl text-center text-xs text-[var(--muted-foreground)]">
        {t('auth.footer')}
      </footer>
    </div>
  )
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode
  htmlFor: string
  label: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}
