import { Button } from '@tapstate-web/ui/button'
import { Field as SharedUIField, FieldDescription, FieldLabel } from '@tapstate-web/ui/field'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { Input } from '@tapstate-web/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@tapstate-web/ui/input-group'
import { AlertCircle, Eye, EyeOff, Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import './auth-pages.css'

import type { UserProfile } from '../../types'

import {
  CloudApiError,
  type EmailRegistrationInput,
  type LoginInput,
} from '../../service/cloud-api'
import { AuthProviderButtons } from './auth-provider-buttons'
import { InteractiveCustomer360Showcase } from './interactive-customer-360-showcase'

type AuthMode = 'login' | 'register'

const CURRENT_LEGAL_VERSION = import.meta.env.VITE_LEGAL_VERSION ?? 'legal-v1.0-2026-10-27'
const LEGAL_DOCS = {
  eula: 'https://docs.tapstate.com/legal/eula',
  privacy: 'https://docs.tapstate.com/privacy',
  subscription: 'https://docs.tapstate.com/subscription-policy',
  dpa: 'https://docs.tapstate.com/data-processing-addendum',
} as const

const emailCodeCooldownSeconds = 60

interface AuthPageProps {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  invitationToken: string | null
  initialMode?: 'login' | 'register'
  oauthOutcome?: string
  registrationPolicyStatus: 'loading' | 'ready' | 'error'
  trialCodeRequired: boolean
  onRetryRegistrationPolicy: () => void
  onLogin: (input: LoginInput) => Promise<UserProfile>
  onRequestCode: (email: string, invitationToken: string | null) => Promise<void>
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
  initialMode,
  oauthOutcome,
  registrationPolicyStatus,
  trialCodeRequired,
  onRetryRegistrationPolicy,
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
  const [mode, setMode] = useState<AuthMode>(
    initialMode ?? (invitationToken ? 'register' : 'login'),
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [resendAvailableIn, setResendAvailableIn] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthCompleting, setOauthCompleting] = useState(false)
  const oauthHandled = useRef(false)
  const emailParts = email.trim().split('@')
  const workspaceDomain = emailParts.length === 2 ? emailParts[1]?.trim() || undefined : undefined
  const isAuthenticating = isSubmitting || isSendingCode || isStartingOAuth || oauthCompleting
  const registrationPolicyBlocked =
    mode === 'register' && !activeInvitationToken && registrationPolicyStatus !== 'ready'
  const trialCodeBlocked =
    mode === 'register' &&
    !activeInvitationToken &&
    registrationPolicyStatus === 'ready' &&
    trialCodeRequired

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

  useEffect(() => {
    if (resendAvailableIn === 0) return
    const interval = window.setInterval(() => {
      setResendAvailableIn((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [resendAvailableIn])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (registrationPolicyBlocked) {
      setError('auth.errors.registrationPolicyUnavailable')
      return
    }
    if (activeInvitationToken && !accessType) return
    const needsOrganizationName =
      accessType === 'trial' ||
      (mode === 'register' &&
        !activeInvitationToken &&
        registrationPolicyStatus === 'ready' &&
        !trialCodeRequired)
    if (needsOrganizationName && !organizationName.trim()) {
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
        if (!activeInvitationToken && trialCodeRequired) {
          setError('auth.errors.invitationRequired')
          return
        }
        if (!verificationSent) {
          setError('auth.errors.requestCodeFirst')
          return
        }
        user = await onRegisterWithEmail({
          email: email.trim(),
          ...(activeInvitationToken ? { invitationToken: activeInvitationToken } : {}),
          code: verificationCode.trim(),
          password,
          displayName: displayName.trim(),
          organizationName: organizationName.trim(),
          agreedLegalVersion: CURRENT_LEGAL_VERSION,
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
    if (registrationPolicyBlocked) {
      setError('auth.errors.registrationPolicyUnavailable')
      return
    }
    if (!activeInvitationToken && trialCodeRequired) {
      setError('auth.errors.invitationRequired')
      return
    }
    if (activeInvitationToken && !accessType) return
    setError(null)
    setIsSendingCode(true)
    try {
      await onRequestCode(email.trim(), activeInvitationToken)
      setVerificationSent(true)
      setResendAvailableIn(emailCodeCooldownSeconds)
    } catch (cause) {
      setError(errorMessageKey(cause))
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (registrationPolicyBlocked) {
      setError('auth.errors.registrationPolicyUnavailable')
      return
    }
    if (mode === 'register' && trialCodeRequired && !activeInvitationToken) {
      setError('auth.errors.invitationRequired')
      return
    }
    if (activeInvitationToken && !accessType) return
    const needsOrganizationName =
      accessType === 'trial' ||
      (mode === 'register' &&
        !activeInvitationToken &&
        registrationPolicyStatus === 'ready' &&
        !trialCodeRequired)
    if (needsOrganizationName && !organizationName.trim()) {
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
    if (!/^[2-9A-HJ-NP-Z]{12}$/i.test(token)) {
      setError('auth.errors.invitationInvalid')
      return
    }
    token = token.toUpperCase()
    setActiveInvitationToken(token)
    setAccessType(null)
    setVerificationSent(false)
    setVerificationCode('')
    setResendAvailableIn(0)
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
      <AuthShell
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        workspaceDomain={workspaceDomain}
        isAuthenticating={isAuthenticating}
      >
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{t('auth.working')}</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      workspaceDomain={workspaceDomain}
      isAuthenticating={isAuthenticating}
    >
      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/80 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="leading-snug">{t(error)}</span>
        </div>
      )}

      <div className="space-y-1 text-center">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827] dark:text-white">
          {t(mode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')}
        </h1>
        <p className="body-sm-regular text-text-tertiary">
          {t(
            mode === 'login'
              ? 'auth.loginDescription'
              : activeInvitationToken
                ? 'auth.registerDescription'
                : registrationPolicyStatus !== 'ready'
                  ? 'auth.registerDescriptionChecking'
                  : trialCodeRequired
                    ? 'auth.registerDescription'
                    : 'auth.registerDescriptionOpen',
          )}
        </p>
      </div>

      {mode === 'register' && !activeInvitationToken && registrationPolicyStatus === 'loading' && (
        <p aria-live="polite" className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
          {t('auth.registrationPolicyLoading')}
        </p>
      )}
      {mode === 'register' && !activeInvitationToken && registrationPolicyStatus === 'error' && (
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--app-background)] p-3 text-sm text-[var(--foreground)]"
          role="alert"
        >
          <span>{t('auth.registrationPolicyUnavailable')}</span>
          <button
            className="system-xs-medium text-components-button-secondary-accent-text shrink-0 underline-offset-4 hover:underline"
            onClick={onRetryRegistrationPolicy}
            type="button"
          >
            {t('auth.retryRegistrationPolicy')}
          </button>
        </div>
      )}

      {activeInvitationToken && (
        <div className="border-divider-subtle bg-components-card-bg body-xs-regular text-text-tertiary mt-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <span>{t('auth.invitationNotice')}</span>
          <button
            className="system-xs-medium text-components-button-secondary-accent-text shrink-0 hover:underline"
            onClick={() => {
              setActiveInvitationToken(null)
              setMode('login')
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

      {(accessType === 'trial' ||
        (mode === 'register' && !activeInvitationToken && !trialCodeRequired)) && (
        <div className="mt-4">
          <AuthField label={t('auth.organizationNameLabel')} name="auth-organization-name">
            <Input
              autoComplete="organization"
              id="auth-organization-name"
              maxLength={100}
              onValueChange={setOrganizationName}
              required
              value={organizationName}
            />
          </AuthField>
        </div>
      )}

      {!activeInvitationToken &&
        (mode === 'login' || registrationPolicyStatus !== 'ready' || trialCodeRequired) && (
          <form className="mt-4 space-y-2" onSubmit={applyInvitationLink}>
            <AuthField label={t('auth.invitationLinkLabel')} name="auth-invitation-link">
              <div className="flex gap-2">
                <Input
                  autoComplete="off"
                  id="auth-invitation-link"
                  onValueChange={setInvitationLink}
                  placeholder={t('auth.invitationLinkPlaceholder')}
                  value={invitationLink}
                />
                <Button size="medium" type="submit" variant="secondary">
                  {t('auth.useInvitation')}
                </Button>
              </div>
            </AuthField>
          </form>
        )}
      {mode === 'register' &&
        !activeInvitationToken &&
        registrationPolicyStatus === 'ready' &&
        trialCodeRequired && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {t('auth.invitationRequiredForRegistration')}
          </p>
        )}

      <div className="mt-6 space-y-4">
        <AuthProviderButtons
          disabled={
            isSubmitting ||
            isSendingCode ||
            isStartingOAuth ||
            registrationPolicyBlocked ||
            trialCodeBlocked ||
            Boolean(activeInvitationToken && !accessType)
          }
          mode={mode}
          onStart={(provider) => void handleOAuth(provider)}
        />
        {isStartingOAuth && (
          <p aria-live="polite" className="body-xs-regular text-text-tertiary text-center">
            {t('auth.working')}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <AuthField label={t('auth.nameLabel')} name="auth-name">
              <Input
                autoComplete="name"
                id="auth-name"
                maxLength={100}
                onValueChange={setDisplayName}
                placeholder={t('auth.namePlaceholder')}
                value={displayName}
              />
            </AuthField>
          )}

          <AuthField label={t('auth.emailLabel')} name="auth-email">
            <Input
              autoComplete="email"
              id="auth-email"
              onValueChange={updateEmail}
              placeholder={t('auth.emailPlaceholder')}
              required
              type="email"
              value={email}
            />
          </AuthField>

          {mode === 'register' && (
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={
                  !email.trim() ||
                  isSendingCode ||
                  isSubmitting ||
                  resendAvailableIn > 0 ||
                  registrationPolicyBlocked ||
                  trialCodeBlocked ||
                  Boolean(activeInvitationToken && !accessType)
                }
                onClick={handleRequestCode}
                size="large"
                type="button"
                variant="secondary"
              >
                {isSendingCode
                  ? t('auth.sendingCode')
                  : resendAvailableIn > 0
                    ? t('auth.resendCodeIn', { count: resendAvailableIn })
                    : verificationSent
                      ? t('auth.resendCode')
                      : t('auth.sendCode')}
              </Button>
              {verificationSent && (
                <AuthField label={t('auth.codeLabel')} name="auth-code">
                  <Input
                    autoComplete="one-time-code"
                    id="auth-code"
                    inputMode="numeric"
                    maxLength={6}
                    onValueChange={(value) => setVerificationCode(value.replace(/\D/g, ''))}
                    pattern="[0-9]{6}"
                    required
                    value={verificationCode}
                  />
                  <FieldDescription>
                    {t('auth.codeSentTo', { email: email.trim() })}
                  </FieldDescription>
                </AuthField>
              )}
            </div>
          )}

          {(mode === 'login' || verificationSent) && (
            <AuthField label={t('auth.passwordLabel')} name="auth-password">
              <InputGroup>
                <InputGroupInput
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  id="auth-password"
                  minLength={mode === 'register' ? 8 : undefined}
                  onValueChange={setPassword}
                  placeholder={t(
                    mode === 'login' ? 'auth.passwordPlaceholder' : 'auth.newPasswordPlaceholder',
                  )}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <InputGroupAddon align="inline-end">
                  <IconButton
                    aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                    onClick={() => setShowPassword((visible) => !visible)}
                    size="lg"
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconButton>
                </InputGroupAddon>
              </InputGroup>
            </AuthField>
          )}

          {(mode === 'login' || verificationSent) && (
            <Button
              aria-labelledby="auth-submit-label"
              className="w-full"
              disabled={
                isSendingCode ||
                registrationPolicyBlocked ||
                Boolean(activeInvitationToken && !accessType)
              }
              loading={isSubmitting}
              size="large"
              type="submit"
              variant="primary"
            >
              <span id="auth-submit-label">
                {t(
                  isSubmitting
                    ? 'auth.working'
                    : mode === 'login'
                      ? 'auth.loginAction'
                      : 'auth.registerAction',
                )}
              </span>
            </Button>
          )}
        </form>

        <div className="space-y-1 text-center">
          <p className="body-sm-regular text-text-tertiary">
            {t(mode === 'login' ? 'auth.noAccount' : 'auth.haveInviteAccount')}{' '}
            <button
              className="system-sm-medium text-components-button-secondary-accent-text underline-offset-4 hover:underline"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              type="button"
            >
              {t(mode === 'login' ? 'auth.goRegister' : 'auth.goLogin')}
            </button>
          </p>
          {mode === 'login' && !activeInvitationToken && (
            <p className="body-xs-regular text-text-tertiary">
              {registrationPolicyStatus === 'ready' &&
                trialCodeRequired &&
                t('auth.invitationRequiredForRegistration')}
            </p>
          )}
        </div>

        <div className="border-divider-subtle body-xs-regular text-text-tertiary border-t pt-4 text-center">
          <Trans
            i18nKey={mode === 'register' ? 'auth.legalNoticeSignup' : 'auth.legalNoticeSignin'}
            components={{
              eulaLink: (
                <a
                  className="text-text-primary hover:text-text-secondary font-semibold transition-colors"
                  href={LEGAL_DOCS.eula}
                  rel="noopener noreferrer"
                  target="_blank"
                />
              ),
              privacyLink: (
                <a
                  className="text-text-primary hover:text-text-secondary font-semibold transition-colors"
                  href={LEGAL_DOCS.privacy}
                  rel="noopener noreferrer"
                  target="_blank"
                />
              ),
            }}
          />
        </div>
      </div>
    </AuthShell>
  )
}

function AuthShell({
  children,
  darkMode,
  setDarkMode,
  workspaceDomain,
  isAuthenticating,
}: {
  children: ReactNode
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  workspaceDomain?: string
  isAuthenticating: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={`app-shell relative flex min-h-screen w-full flex-col items-center justify-between overflow-x-hidden px-4 py-6 font-sans transition-colors duration-200 ${darkMode ? 'dark text-[#f0f1f3]' : 'text-[#111827]'}`}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-[18%] -left-[8%] h-[680px] w-[680px] rounded-full opacity-70 blur-3xl dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(240, 246, 255, 0.35) 50%, transparent 75%)',
          }}
        />
        <div className="absolute -bottom-[28%] -left-[12%] hidden h-[640px] w-[640px] rounded-full border border-white/60 bg-gradient-to-tr from-sky-200/20 via-white/30 to-transparent backdrop-blur-[2px] lg:block dark:border-white/[0.04] dark:from-sky-950/15 dark:via-white/[0.01] dark:to-transparent" />
      </div>

      <header className="z-20 flex w-full max-w-5xl items-center justify-end">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">
            {t('auth.headerNote')}
          </span>
          <IconButton
            aria-label={t('app.toggleTheme')}
            onClick={() => setDarkMode(!darkMode)}
            title={t('app.toggleTheme')}
            size="lg"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
        </div>
      </header>

      <main className="relative z-10 flex w-full flex-1 items-center justify-center px-3 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-16">
        <div className="flex w-full max-w-[1260px] flex-col items-center justify-center gap-10 xl:flex-row xl:gap-16 2xl:gap-20">
          <div className="hidden w-full max-w-[690px] items-center justify-center xl:flex xl:max-w-[720px] xl:flex-1 xl:justify-start 2xl:max-w-[740px]">
            <InteractiveCustomer360Showcase
              darkMode={darkMode}
              workspaceDomain={workspaceDomain}
              isAuthenticating={isAuthenticating}
            />
          </div>

          <div className="flex w-full shrink-0 flex-col items-center justify-center lg:w-[410px] xl:w-[430px] 2xl:w-[440px]">
            <div className="auth-card flowing-card-container material-fusion my-auto w-full max-w-[440px]">
              <div aria-hidden="true" className="flowing-border-aura" />
              <div aria-hidden="true" className="flowing-border-glow" />
              <section className="liquid-glass-card relative z-10 flex w-full flex-col justify-between px-7 py-8 transition-all duration-200 sm:px-9 sm:py-9">
                <div aria-hidden="true" className="liquid-glass-meniscus" />
                {children}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function AuthField({
  children,
  name,
  label,
}: {
  children: ReactNode
  name: string
  label: string
}) {
  return (
    <SharedUIField name={name}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </SharedUIField>
  )
}
