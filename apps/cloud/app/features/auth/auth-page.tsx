import { Button } from '@langgenius/dify-ui/button'
import { Field, FieldDescription, FieldLabel } from '@langgenius/dify-ui/field'
import { IconButton } from '@langgenius/dify-ui/icon-button'
import { Input } from '@langgenius/dify-ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@langgenius/dify-ui/input-group'
import { AlertCircle, Eye, EyeOff, Moon, ShieldCheck, Sun } from 'lucide-react'
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

      <main className="z-10 my-auto flex w-full items-center justify-center py-8">
        <div className="auth-card flowing-card-container material-fusion w-full max-w-[400px]">
          <div aria-hidden="true" className="flowing-border-glow" />

          <section className="liquid-glass-card relative z-10 w-full overflow-hidden p-7 transition-all duration-200 sm:p-8">
            <div aria-hidden="true" className="liquid-glass-meniscus" />

            {error && (
              <div
                className="system-xs-regular text-text-destructive border-components-input-border-destructive bg-components-input-bg-destructive mb-4 flex items-start gap-2 rounded-lg border p-3"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="leading-snug">{t(error)}</div>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-1 text-center">
                <h1 className="title-2xl-semi-bold text-text-primary">
                  {t(mode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')}
                </h1>
                <p className="body-sm-regular text-text-tertiary">
                  {t(mode === 'login' ? 'auth.loginDescription' : 'auth.registerDescription')}
                </p>
              </div>

              <AuthProviderButtons mode={mode} />

              <form className="space-y-3.5" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <Field name="displayName">
                    <FieldLabel>{t('auth.nameLabel')}</FieldLabel>
                    <Input
                      autoComplete="name"
                      maxLength={100}
                      onValueChange={setDisplayName}
                      placeholder={t('auth.namePlaceholder')}
                      required
                      value={displayName}
                    />
                  </Field>
                )}

                <Field name="email">
                  <FieldLabel>{t('auth.emailLabel')}</FieldLabel>
                  <Input
                    autoComplete="email"
                    onValueChange={setEmail}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    type="email"
                    value={email}
                  />
                </Field>

                <Field name="password">
                  <FieldLabel>{t('auth.passwordLabel')}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'register' ? 8 : undefined}
                      onValueChange={setPassword}
                      placeholder={t(
                        mode === 'login'
                          ? 'auth.passwordPlaceholder'
                          : 'auth.newPasswordPlaceholder',
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
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </IconButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {mode === 'register' && (
                    <FieldDescription>{t('auth.passwordHint')}</FieldDescription>
                  )}
                </Field>

                <Button
                  aria-labelledby="auth-submit-label"
                  className="mt-1 w-full"
                  loading={isSubmitting}
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
              </form>

              <div className="body-sm-regular text-text-tertiary pt-2 text-center">
                {t(mode === 'login' ? 'auth.noAccount' : 'auth.haveAccount')}{' '}
                <button
                  className="system-sm-medium text-components-button-secondary-accent-text focus-visible:outline-state-accent-solid ml-0.5 rounded-sm hover:underline focus-visible:outline-2"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  type="button"
                >
                  {t(mode === 'login' ? 'auth.goRegister' : 'auth.goLogin')}
                </button>
              </div>

              <div className="system-xs-regular text-text-tertiary border-divider-subtle flex items-center justify-center gap-2 border-t pt-4">
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
