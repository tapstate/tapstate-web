import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/app-shell'
import { SessionRecovery } from '@/features/auth/session-recovery'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRouteComponent,
})

function AuthenticatedRouteComponent() {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const status = useAuthStore((state) => state.status)
  const epoch = useAuthStore((state) => state.authEpoch)
  if (!isAuthenticated && (status === 'checking' || status === 'unavailable'))
    return <SessionRecovery />
  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return (
    <AppShell>
      <Outlet key={epoch} />
      <span className="sr-only">{t('sources.states.loading')}</span>
    </AppShell>
  )
}
