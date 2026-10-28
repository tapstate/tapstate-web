import { useNavigate } from '@tanstack/react-router'
import { Languages, LogOut, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppLocale } from '@/i18n'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { useUiStore } from '@/stores/ui-store'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'

export function AppHeader() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const logoutSession = useAuthStore((state) => state.logout)
  const authProfile = useAuthStore((state) => state.profile)
  const setAskTapstateOpen = useUiStore((state) => state.setAskTapstateOpen)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(false)

  function switchLocale(nextLocale: AppLocale) {
    void i18n.changeLanguage(nextLocale)
  }

  async function logout() {
    setIsLoggingOut(true)
    setLogoutError(false)
    try {
      await logoutSession()
      if (authProfile === 'cloud') {
        replaceWithCloudConsole(new URL('/auth', cloudConsoleUrl).toString())
      } else {
        void navigate({ replace: true, to: '/login' })
      }
    } catch {
      setLogoutError(true)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="app-sidebar__footer">
      <div className="app-sidebar__actions">
        <Button
          type="button"
          variant="ghost"
          className="app-sidebar__ask"
          onClick={() => setAskTapstateOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('ask.launch')}</span>
          <kbd>{t('app.shortcuts.ask')}</kbd>
        </Button>

        <DropdownMenu open={languageMenuOpen} onOpenChange={setLanguageMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="app-sidebar__icon-button"
              aria-label={t('app.language')}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {SUPPORTED_LOCALES.map((locale) => (
              <DropdownMenuItem
                key={locale}
                className="justify-between"
                disabled={i18n.language === locale}
                onClick={() => switchLocale(locale)}
              >
                {t(`app.languageOptions.${locale}`)}
                {i18n.language === locale && (
                  <span className="bg-foreground h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="app-sidebar__icon-button"
          aria-label={t('app.logout')}
          aria-busy={isLoggingOut}
          disabled={isLoggingOut}
          title={t('app.logout')}
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="app-sidebar__avatar" aria-label={t('app.user.avatar')}>
          {t('app.user.initial')}
        </div>
      </div>
      {logoutError && (
        <p className="px-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('auth.session.logoutFailed')}
        </p>
      )}
    </header>
  )
}
