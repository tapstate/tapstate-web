import { useNavigate } from '@tanstack/react-router'
import { Bell, Languages, LogOut, Sparkles } from 'lucide-react'
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

export function AppHeader() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const logoutSession = useAuthStore((state) => state.logout)
  const authProfile = useAuthStore((state) => state.profile)
  const setAskTapstateOpen = useUiStore((state) => state.setAskTapstateOpen)

  function switchLocale(nextLocale: AppLocale) {
    void i18n.changeLanguage(nextLocale)
  }

  async function logout() {
    try {
      await logoutSession()
    } finally {
      if (authProfile === 'on-prem') void navigate({ replace: true, to: '/login' })
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

        <DropdownMenu>
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
                onSelect={() => switchLocale(locale)}
              >
                {t(`app.languageOptions.${locale}`)}
                {i18n.language === locale && (
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-900" aria-hidden="true" />
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
          aria-label={t('app.notifications')}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="app-sidebar__icon-button"
          aria-label={t('app.logout')}
          title={t('app.logout')}
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="app-sidebar__avatar" aria-label={t('app.user.avatar')}>
          {t('app.user.initial')}
        </div>
      </div>
    </header>
  )
}
