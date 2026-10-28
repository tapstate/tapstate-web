import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AlertsPage, type AlertTab } from '../features/notifications/alerts-page'

export const Route = createFileRoute('/_console/alerts')({
  validateSearch: (search: Record<string, unknown>): { tab?: AlertTab } => ({
    tab:
      typeof search.tab === 'string' && ['events', 'policies', 'deliveries'].includes(search.tab)
        ? (search.tab as AlertTab)
        : undefined,
  }),
  component: AlertsRouteComponent,
})

function AlertsRouteComponent() {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()

  const handleTabChange = (nextTab: AlertTab) => {
    void navigate({
      to: '/alerts',
      search: (prev) => ({ organizationId: prev.organizationId, tab: nextTab }),
    })
  }

  return <AlertsPage initialTab={tab ?? 'events'} onTabChange={handleTabChange} />
}
