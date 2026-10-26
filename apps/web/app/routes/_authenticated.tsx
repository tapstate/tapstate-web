import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/app-shell'
import { LoginRedirect, SessionRecovery } from '@/features/auth/session-recovery'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRouteComponent,
})

function AuthenticatedRouteComponent() {
  const { t } = useTranslation()
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const returnTo = useRef(location.href)
  if (isAuthenticated) returnTo.current = location.href
  const status = useAuthStore((state) => state.status)
  const epoch = useAuthStore((state) => state.authEpoch)
  if (!isAuthenticated && (status === 'checking' || status === 'unavailable'))
    return <SessionRecovery />
  if (!isAuthenticated) {
    return <LoginRedirect returnTo={returnTo.current} />
  }

  return (
    <AppShell>
      <Outlet key={epoch} />
      <span className="sr-only">{t('sources.states.loading')}</span>
    </AppShell>
  )
}
