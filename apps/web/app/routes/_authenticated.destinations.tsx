import { createFileRoute } from '@tanstack/react-router'

import { DestinationsPage } from '@/features/destinations/destinations-page'

export const Route = createFileRoute('/_authenticated/destinations')({
  component: DestinationsRouteComponent,
})

function DestinationsRouteComponent() {
  return <DestinationsPage />
}
