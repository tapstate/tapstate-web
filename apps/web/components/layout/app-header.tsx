import type { AppLocale } from '@/i18n'
import { useNavigate } from '@tanstack/react-router'
import { Bell, Languages, LogOut, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const clear = useAuthStore((state) => state.clear)
  const setAskTapstateOpen = useUiStore((state) => state.setAskTapstateOpen)

  function switchLocale(nextLocale: AppLocale) {
    void i18n.changeLanguage(nextLocale)
  }

  function logout() {
    clear()
    void navigate({ replace: true, to: '/login' })
  }

  return (
    <header className="app-header">
      <div className="app-header__context" />

      <div className="app-header__actions">
        <button type="button" className="app-header__ask" onClick={() => setAskTapstateOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('ask.launch')}</span>
          <kbd>{t('app.shortcuts.ask')}</kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="app-header__icon-button"
              aria-label={t('app.language')}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
            </button>
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

        <button
          type="button"
          className="app-header__icon-button"
          aria-label={t('app.notifications')}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="app-header__icon-button"
          aria-label={t('app.logout')}
          title={t('app.logout')}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="app-header__avatar" aria-label={t('app.user.avatar')}>
          {t('app.user.initial')}
        </div>
      </div>
    </header>
  )
}
