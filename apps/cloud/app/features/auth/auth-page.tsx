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
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import './auth-pages.css'

import type { UserProfile } from '../../types'

import { CloudApiError, type LoginInput, type RegisterInput } from '../../service/cloud-api'
import { AuthProviderButtons } from './auth-provider-buttons'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  onLogin: (input: LoginInput) => Promise<UserProfile>
  onRegister: (input: RegisterInput) => Promise<UserProfile>
  onAuthenticated: (user: UserProfile) => Promise<void>
}

function errorMessageKey(error: unknown) {
  if (!(error instanceof CloudApiError)) return 'auth.errors.generic'
  if (error.status === 0) return 'auth.errors.network'
  if (error.status === 401) return 'auth.errors.invalidCredentials'
  if (error.status === 409) return 'auth.errors.emailExists'
  return 'auth.errors.generic'
}

const inputClassName =
  'w-full h-10 px-3.5 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#202124] text-[13px] text-[#111827] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#111827] dark:focus:border-white focus:ring-1 focus:ring-[#111827] dark:focus:ring-white transition-all font-mono'

export function AuthPage({
  darkMode,
  setDarkMode,
  onLogin,
  onRegister,
  onAuthenticated,
}: AuthPageProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const user =
        mode === 'login'
          ? await onLogin({ email: email.trim(), password })
          : await onRegister({ email: email.trim(), password, displayName: displayName.trim() })
      await onAuthenticated(user)
    } catch (cause) {
      setError(errorMessageKey(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
  }

  return (
    <div
      className={`app-shell relative flex min-h-screen w-full flex-col items-center justify-between px-4 py-6 font-sans transition-colors duration-200 ${darkMode ? 'dark text-[#f0f1f3]' : 'text-[#111827]'}`}
    >
      <header className="z-20 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#111827] text-xs font-bold text-white shadow-xs dark:bg-white dark:text-[#111827]">
            <span className="font-mono text-sm leading-none font-semibold">T</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#111827] dark:text-white">
            Tapstate
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">
            {t('auth.headerNote')}
          </span>
          <button
            aria-label={t('app.toggleTheme')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:hover:bg-white/[0.05] dark:hover:text-white"
            onClick={() => setDarkMode(!darkMode)}
            title={t('app.toggleTheme')}
            type="button"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="z-10 my-auto flex w-full items-center justify-center py-8">
        <div className="auth-card flowing-card-container material-fusion w-full max-w-[400px]">
          <div aria-hidden="true" className="flowing-border-glow" />

          <section className="liquid-glass-card relative z-10 w-full overflow-hidden p-7 transition-all duration-200 sm:p-8">
            <div aria-hidden="true" className="liquid-glass-meniscus" />

            {error && (
              <div
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/80 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="leading-snug">{t(error)}</div>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-1 text-center">
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827] dark:text-white">
                  {t(mode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')}
                </h1>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                  {t(mode === 'login' ? 'auth.loginDescription' : 'auth.registerDescription')}
                </p>
              </div>

              <AuthProviderButtons mode={mode} />

              <form className="space-y-3.5" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label
                      className="block text-[12px] font-medium text-[#374151] dark:text-neutral-300"
                      htmlFor="auth-name"
                    >
                      {t('auth.nameLabel')}
                    </label>
                    <input
                      autoComplete="name"
                      className={inputClassName}
                      id="auth-name"
                      maxLength={100}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={t('auth.namePlaceholder')}
                      required
                      value={displayName}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    className="block text-[12px] font-medium text-[#374151] dark:text-neutral-300"
                    htmlFor="auth-email"
                  >
                    {t('auth.emailLabel')}
                  </label>
                  <input
                    autoComplete="email"
                    className={inputClassName}
                    id="auth-email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    type="email"
                    value={email}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    className="block text-[12px] font-medium text-[#374151] dark:text-neutral-300"
                    htmlFor="auth-password"
                  >
                    {t('auth.passwordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className={`${inputClassName} pr-10`}
                      id="auth-password"
                      minLength={mode === 'register' ? 8 : undefined}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t(
                        mode === 'login'
                          ? 'auth.passwordPlaceholder'
                          : 'auth.newPasswordPlaceholder',
                      )}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                      className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === 'register' && (
                    <p className="text-[11px] text-neutral-400">{t('auth.passwordHint')}</p>
                  )}
                </div>

                <button
                  className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13px] font-medium text-white shadow-xs transition-all hover:bg-[#1f2937] active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('auth.working')}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {t(mode === 'login' ? 'auth.loginAction' : 'auth.registerAction')}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                {t(mode === 'login' ? 'auth.noAccount' : 'auth.haveAccount')}{' '}
                <button
                  className="ml-0.5 font-medium text-[#111827] transition-colors hover:underline dark:text-white"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  type="button"
                >
                  {t(mode === 'login' ? 'auth.goRegister' : 'auth.goLogin')}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 border-t border-black/[0.06] pt-4 text-[11px] text-neutral-400 dark:border-white/[0.08]">
                <ShieldCheck className="h-4 w-4" />
                <span>{t('auth.securityNote')}</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
