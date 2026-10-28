import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppLocale } from '@/i18n'

import { Button } from '@/components/ui/button'
import { safeLoginReturn } from '@/features/auth/login-return'
import { SessionRecovery } from '@/features/auth/session-recovery'
import { SUPPORTED_LOCALES } from '@/i18n'
import { cn } from '@/lib/utils'
import { AuthClientError } from '@/service/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { replaceWithCloudConsole } from '@/utils/cloud-console'
import { deploymentProfile } from '@/utils/deployment-profile'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeLoginReturn(search.redirect),
  }),
  component: LoginRouteComponent,
})

interface TerminalLine {
  type: 'command' | 'success'
  text: string
}

function localeBadge(nextLocale: AppLocale) {
  if (nextLocale === 'en') return 'EN'
  if (nextLocale === 'zh-CN') return '简'
  return '繁'
}

function LoginRouteComponent() {
  if (deploymentProfile === 'cloud') return <CloudLoginRouteComponent />
  return <OnPremLoginRouteComponent />
}

function CloudLoginRouteComponent() {
  useEffect(() => {
    replaceWithCloudConsole()
  }, [])

  return null
}

function OnPremLoginRouteComponent() {
  const navigate = useNavigate()
  const redirect = safeLoginReturn(Route.useSearch().redirect)
  const { t, i18n } = useTranslation()
  const login = useAuthStore((state) => state.login)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const status = useAuthStore((state) => state.status)
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    username: string | null
    password: string | null
  }>({ username: null, password: null })

  const sequence = useMemo<TerminalLine[]>(
    () => [
      { text: t('auth.login.terminal.connectCommand'), type: 'command' },
      { text: t('auth.login.terminal.connectResult'), type: 'success' },
      { text: t('auth.login.terminal.workspaceCommand'), type: 'command' },
      { text: t('auth.login.terminal.workspaceResult'), type: 'success' },
      { text: t('auth.login.terminal.sourceCommand'), type: 'command' },
      { text: t('auth.login.terminal.sourceResult'), type: 'success' },
      { text: t('auth.login.terminal.pipelineCommand'), type: 'command' },
      { text: t('auth.login.terminal.pipelineResult'), type: 'success' },
    ],
    [t],
  )

  useEffect(() => {
    if (isAuthenticated) void navigate({ replace: true, to: redirect })
  }, [isAuthenticated, navigate, redirect])

  useEffect(() => {
    setVisibleLines([])
    let cancelled = false
    async function run() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setVisibleLines(sequence)
        return
      }
      for (const line of sequence) {
        if (cancelled) return
        await new Promise((resolve) =>
          window.setTimeout(resolve, line.type === 'command' ? 320 : 580),
        )
        setVisibleLines((current) => [...current, line])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [sequence])

  function clearFormErrors() {
    setFieldErrors({ username: null, password: null })
    setFormError(null)
  }

  function validate() {
    const nextErrors = {
      username: username.trim() ? null : t('auth.validation.usernameRequired'),
      password: password ? null : t('auth.validation.passwordRequired'),
    }
    setFieldErrors(nextErrors)
    return !nextErrors.username && !nextErrors.password
  }

  function errorMessage(error: unknown) {
    if (!(error instanceof AuthClientError)) return t('auth.login.errors.unknown')
    if (error.kind === 'browser') return t('auth.session.browserUnsupported')
    if (error.status === 404 || error.status === 405) return t('auth.session.serverUpgradeRequired')
    if (error.kind === 'network') return t('auth.login.errors.network')
    if (error.kind === 'protocol') return t('auth.login.errors.protocol')
    return error.code === 'control.auth-failed'
      ? t('auth.login.errors.invalidCredentials')
      : t('auth.login.errors.server')
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await login({ username: username.trim(), password })
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isSubmitting

  if ((status === 'checking' && !isSubmitting) || status === 'unavailable')
    return <SessionRecovery />

  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#F9FAFB] p-6 font-sans"
      aria-labelledby="login-title"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-10%] right-[0%] h-[70%] w-[60%] animate-pulse rounded-full bg-gradient-to-bl from-indigo-300/40 via-purple-200/30 to-transparent opacity-80 blur-[140px]"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-[-10%] left-[-5%] h-[70%] w-[60%] animate-pulse rounded-full bg-gradient-to-tr from-sky-300/40 via-emerald-200/30 to-transparent opacity-70 blur-[120px]"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
      </div>

      <fieldset
        className="absolute top-6 right-6 z-20 flex items-center rounded-xl border border-white/70 bg-white/70 p-1 shadow-sm backdrop-blur-xl"
        aria-label={t('app.language')}
      >
        {SUPPORTED_LOCALES.map((option) => (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 min-w-8 px-2 text-[11px] font-semibold text-gray-500 hover:bg-white hover:text-gray-900',
              i18n.language === option &&
                'bg-gray-900 text-white shadow-sm hover:bg-gray-900 hover:text-white',
            )}
            aria-label={t(`app.languageOptions.${option}`)}
            aria-pressed={i18n.language === option}
            onClick={() => void i18n.changeLanguage(option)}
          >
            {localeBadge(option)}
          </Button>
        ))}
      </fieldset>

      <div className="relative z-10 flex w-full max-w-[1000px] flex-col items-center gap-12 lg:flex-row lg:gap-20">
        <div className="relative flex w-full shrink-0 flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.02] backdrop-blur-2xl lg:w-[420px]">
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/40" />

          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <img alt="" className="h-6 w-6" src="/tapstate-mark.svg" />
                <span className="text-[15px] font-medium tracking-tight">{t('app.brand')}</span>
              </div>
            </div>

            <h1
              id="login-title"
              className="mb-2 text-[28px] font-semibold tracking-tight text-gray-900"
            >
              {t('auth.login.title')}
            </h1>
            <p className="mb-8 text-[14px] leading-6 text-gray-500">{t('auth.login.subtitle')}</p>

            <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-[13px] font-medium text-gray-700"
                >
                  {t('auth.login.usernameLabel')}
                </label>
                <input
                  id="login-username"
                  value={username}
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder={t('auth.login.usernamePlaceholder')}
                  className="h-10 w-full rounded-lg border border-gray-200/80 bg-white/60 px-3 text-[14px] backdrop-blur-sm transition-all placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby="login-username-error"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    clearFormErrors()
                  }}
                />
                {fieldErrors.username && (
                  <span
                    id="login-username-error"
                    className="block text-[12px] leading-5 text-red-600"
                  >
                    {fieldErrors.username}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-medium text-gray-700"
                >
                  {t('auth.login.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    value={password}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t('auth.login.passwordPlaceholder')}
                    className={cn(
                      'h-10 w-full rounded-lg border border-gray-200/80 bg-white/60 px-3 pr-10 text-[14px] backdrop-blur-sm transition-all placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none',
                      !showPassword && 'font-mono tracking-widest',
                    )}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby="login-password-error"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      clearFormErrors()
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                    aria-label={
                      showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')
                    }
                    title={
                      showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')
                    }
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <span
                    id="login-password-error"
                    className="block text-[12px] leading-5 text-red-600"
                  >
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {formError && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="group mt-2 h-10 w-full text-[13px] font-medium shadow-sm"
                disabled={!canSubmit}
              >
                <span>{isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}</span>
                {isSubmitting ? (
                  <LoaderCircle
                    className="h-3.5 w-3.5 animate-spin opacity-80"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight
                    className="h-3.5 w-3.5 opacity-70 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </form>
          </div>
        </div>

        <aside
          className="relative hidden w-full max-w-[500px] rotate-1 flex-col overflow-hidden rounded-2xl bg-[#0A0A0A]/95 font-mono shadow-[0_30px_60px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-xl transition-transform duration-500 hover:rotate-0 hover:shadow-[0_40px_80px_rgba(0,0,0,0.3)] lg:flex"
          aria-label={t('auth.login.terminal.previewLabel')}
        >
          <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-white/5 px-4">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full border border-black/10 bg-[#FF5F56]" />
              <div className="h-3 w-3 rounded-full border border-black/10 bg-[#FFBD2E]" />
              <div className="h-3 w-3 rounded-full border border-black/10 bg-[#27C93F]" />
            </div>
            <div className="flex-1 text-center font-sans text-[12px] tracking-wide text-gray-400">
              {t('auth.login.terminal.previewLabel')}
            </div>
          </div>

          <div
            className="min-h-[300px] p-6 text-[13px] leading-relaxed text-gray-300"
            aria-hidden="true"
          >
            {visibleLines.map((line, index) => (
              <div key={`${line.text}-${index}`} className="mb-2 flex items-start">
                <span
                  className={cn(
                    line.type === 'command' ? 'text-purple-400' : 'text-emerald-400',
                    'mr-2 shrink-0',
                  )}
                >
                  {line.type === 'command'
                    ? t('auth.login.terminal.prompt')
                    : t('auth.login.terminal.successMark')}
                </span>
                <span className={line.type === 'command' ? 'text-white' : 'text-gray-400'}>
                  {line.text}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-white/10 bg-white/5 px-6 py-5 backdrop-blur-md">
            <p className="font-sans text-[14px] font-medium tracking-tight text-white">
              {t('auth.login.terminal.footerTitle')}
            </p>
            <p className="mt-1 font-sans text-[12px] text-gray-400">
              {t('auth.login.terminal.footerBody')}
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
