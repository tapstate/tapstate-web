import { createFileRoute, Navigate } from '@tanstack/react-router'

import { getDeploymentProfile } from '@/utils/deployment-profile'

export const Route = createFileRoute('/_authenticated/destinations')({
  component: LegacyDestinationsRouteComponent,
})

function LegacyDestinationsRouteComponent() {
  return <Navigate replace to={getDeploymentProfile() === 'cloud' ? '/views' : '/pipelines'} />
}
