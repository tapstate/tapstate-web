import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/app-shell'
import { useAuthStore } from '@/stores/auth-store'

import { NotFoundContent } from './-not-found'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRouteComponent,
  notFoundComponent: NotFoundContent,
})

function AuthenticatedRouteComponent() {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return (
    <AppShell>
      <Outlet />
      <span className="sr-only">{t('sources.states.loading')}</span>
    </AppShell>
  )
}
