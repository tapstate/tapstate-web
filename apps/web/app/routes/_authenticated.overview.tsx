import { createFileRoute } from '@tanstack/react-router'

import { OverviewPage } from '@/features/overview/overview-page'

export const Route = createFileRoute('/_authenticated/overview')({
  component: OverviewRouteComponent,
})

function OverviewRouteComponent() {
  return <OverviewPage />
}
