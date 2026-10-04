import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { getDeploymentProfile } from '@/utils/deployment-profile'

export const Route = createFileRoute('/_authenticated/views')({
  component: ViewsRouteComponent,
})

function ViewsRouteComponent() {
  if (getDeploymentProfile() !== 'cloud') return <Navigate replace to="/pipelines" />
  return <Outlet />
}
