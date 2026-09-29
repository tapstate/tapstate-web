import { createFileRoute, Navigate } from '@tanstack/react-router'

import { ViewsPage } from '@/features/views/views-page'
import { getDeploymentProfile } from '@/utils/deployment-profile'

export const Route = createFileRoute('/_authenticated/views')({
  component: ViewsRouteComponent,
})

function ViewsRouteComponent() {
  if (getDeploymentProfile() !== 'cloud') return <Navigate replace to="/pipelines" />
  return <ViewsPage />
}
