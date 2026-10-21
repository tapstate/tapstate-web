import { createFileRoute } from '@tanstack/react-router'

import { StateStorePage } from '@/features/settings/state-store-page'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsRouteComponent,
})

function SettingsRouteComponent() {
  return <StateStorePage />
}
