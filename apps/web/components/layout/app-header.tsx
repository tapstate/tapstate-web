import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@tapstate-web/ui/avatar'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { Bell, Languages, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppLocale } from '@/i18n'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES } from '@/i18n'
import { getCurrentUser } from '@/service/current-user-client'
import { useAuthStore } from '@/stores/auth-store'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'

import { HelpMenu } from './help-menu'

const footerIconButtonClassName =
  'size-7 rounded-full border border-components-card-border bg-components-card-bg p-0 text-text-tertiary shadow-xs transition-colors hover:bg-components-card-bg-alt hover:text-ui-brand-blue-inverted data-popup-open:bg-components-card-bg-alt data-popup-open:text-ui-brand-blue-inverted'

export function AppHeader({ cloudUserEmail }: { cloudUserEmail?: string | null }) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const logoutSession = useAuthStore((state) => state.logout)
  const authProfile = useAuthStore((state) => state.profile)
  const hasSession = useAuthStore((state) => state.isAuthenticated)
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const currentUserQuery = useQuery({
    queryKey: ['current-user'],
    queryFn: () => getCurrentUser(apiFetch),
    enabled: hasSession && authProfile === 'on-prem',
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const principal = currentUserQuery.data?.principal.trim()
  const userLabel = authProfile === 'cloud' ? cloudUserEmail?.trim() || undefined : principal
  const userInitial = userLabel?.slice(0, 1).toUpperCase() || t('app.user.initial')

  useEffect(
    () => () => {
      queryClient.removeQueries({ queryKey: ['current-user'] })
    },
    [queryClient],
  )
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
        <HelpMenu />
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

        {userLabel && (
          <span className="text-text-tertiary max-w-40 truncate text-[10px]" title={userLabel}>
            {userLabel}
          </span>
        )}
        <Avatar
          size="md"
          className="size-7"
          aria-label={
            userLabel ? t('app.user.avatarFor', { name: userLabel }) : t('app.user.avatar')
          }
          title={userLabel}
        >
          <AvatarFallback>{userInitial}</AvatarFallback>
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
