import { Avatar, AvatarFallback } from '@langgenius/dify-ui/avatar'
import { IconButton } from '@langgenius/dify-ui/icon-button'
import { useNavigate } from '@tanstack/react-router'
import { Bell, Languages, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppLocale } from '@/i18n'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'

const footerIconButtonClassName =
  'size-7 rounded-full border border-components-card-border bg-components-card-bg p-0 text-text-tertiary shadow-xs transition-colors hover:bg-components-card-bg-alt hover:text-saas-dify-blue-inverted data-popup-open:bg-components-card-bg-alt data-popup-open:text-saas-dify-blue-inverted'

export function AppHeader() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const logoutSession = useAuthStore((state) => state.logout)
  const authProfile = useAuthStore((state) => state.profile)
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              type="button"
              size="lg"
              className={footerIconButtonClassName}
              aria-label={t('app.language')}
            >
              <Languages className="size-4 shrink-0" aria-hidden="true" />
            </IconButton>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-900" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <IconButton
          type="button"
          size="lg"
          className={footerIconButtonClassName}
          aria-label={t('app.notifications')}
        >
          <Bell className="size-4 shrink-0" aria-hidden="true" />
        </IconButton>

        <IconButton
          type="button"
          size="lg"
          className={footerIconButtonClassName}
          aria-label={t('app.logout')}
          aria-busy={isLoggingOut}
          disabled={isLoggingOut}
          title={t('app.logout')}
          onClick={() => void logout()}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
        </IconButton>

        <Avatar size="md" className="size-7" aria-label={t('app.user.avatar')}>
          <AvatarFallback>{t('app.user.initial')}</AvatarFallback>
        </Avatar>
      </div>
      {logoutError && (
        <p className="px-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('auth.session.logoutFailed')}
        </p>
      )}
    </header>
  )
}
