import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@tapstate-web/ui/avatar'
import { Languages, LogOut, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppLocale } from '@/i18n'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES } from '@/i18n'
import { getCurrentUser } from '@/service/current-user-client'
import { useAuthStore } from '@/stores/auth-store'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'

import { HelpMenu } from './help-menu'

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
    enabled: hasSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const username = currentUserQuery.data?.username?.trim() || undefined
  const email = currentUserQuery.data?.email?.trim() || undefined
  const legacyLabel =
    authProfile === 'cloud' ? cloudUserEmail?.trim() : currentUserQuery.data?.principal.trim()
  const userLabel = email || username || legacyLabel || undefined
  const displayName = username && username !== email ? username : userLabel?.split('@')[0]
  const userInitial = displayName?.slice(0, 1).toUpperCase() || t('app.user.initial')

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
      <div className="flex items-center justify-between border-t border-black/[0.05] pt-2 dark:border-white/[0.05]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('app.user.accountMenu')}
              title={userLabel}
              className="text-components-main-nav-text hover:bg-state-base-hover data-popup-open:bg-state-base-hover flex max-w-45 min-w-0 items-center gap-3 rounded-full py-1 ps-1 pe-4 text-start transition-colors"
            >
              <Avatar size="md" className="size-7 shrink-0" aria-hidden="true">
                <AvatarFallback className="bg-[#155eef] text-xs font-medium text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="system-md-medium text-text-primary min-w-0 truncate">
                {displayName || t('app.user.initial')}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-60 max-w-80 overflow-hidden p-1"
          >
            <div className="from-background-section-burn to-background-section flex items-center gap-3 rounded-xl bg-gradient-to-b p-3">
              <div className="min-w-0 grow">
                <div className="body-md-medium text-text-primary truncate" title={displayName}>
                  {displayName || t('app.user.initial')}
                </div>
                {userLabel && (
                  <div className="system-xs-regular text-text-tertiary truncate" title={userLabel}>
                    {userLabel}
                  </div>
                )}
              </div>
              <Avatar size="lg" className="size-9 shrink-0" aria-hidden="true">
                <AvatarFallback className="bg-[#155eef] text-sm font-medium text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </div>
            <DropdownMenuItem
              className="mx-0 h-8 cursor-pointer gap-2 px-3"
              onClick={() => void navigate({ to: '/settings' })}
            >
              <Settings className="size-4" aria-hidden="true" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="mx-0 h-8 cursor-pointer gap-2 px-3">
                <Languages className="size-4" aria-hidden="true" />
                {t('app.language')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-36">
                {SUPPORTED_LOCALES.map((locale) => (
                  <DropdownMenuItem
                    key={locale}
                    disabled={i18n.language === locale}
                    onClick={() => switchLocale(locale)}
                  >
                    {t(`app.languageOptions.${locale}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="mx-0 h-8 cursor-pointer gap-2 px-3"
              disabled={isLoggingOut}
              onClick={() => void logout()}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t('app.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <HelpMenu />
      </div>
      {logoutError && (
        <p className="px-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('auth.session.logoutFailed')}
        </p>
      )}
    </header>
  )
}
