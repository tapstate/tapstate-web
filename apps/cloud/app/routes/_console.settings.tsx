import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SettingsPage, type SettingsTab } from '../features/settings/settings-page'

export const Route = createFileRoute('/_console/settings')({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab:
      search.tab === 'organization'
        ? 'organization'
        : search.tab === 'account'
          ? 'account'
          : undefined,
  }),
  component: SettingsRouteComponent,
})

function SettingsRouteComponent() {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()

  const handleTabChange = (nextTab: SettingsTab) => {
    void navigate({
      to: '/settings',
      search: (prev) => ({ organizationId: prev.organizationId, tab: nextTab }),
    })
  }

  return <SettingsPage initialTab={tab ?? 'account'} onTabChange={handleTabChange} />
}
