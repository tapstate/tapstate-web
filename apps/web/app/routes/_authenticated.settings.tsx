import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

import { StateStorePage } from '@/features/settings/state-store-page'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsRouteComponent,
})

function SettingsRouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return pathname === '/settings/alerts' ? <Outlet /> : <StateStorePage />
}
