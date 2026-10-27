import { createRootRoute, Outlet } from '@tanstack/react-router'

import { Providers } from '@/app/routes/-providers'
import { TawkFeedbackWidget } from '@/features/feedback/tawk-feedback-widget'
import { useAuthStore } from '@/stores/auth-store'
import { deploymentProfile } from '@/utils/deployment-profile'

import { NotFoundRouteComponent } from './-not-found'

export function RootRouteComponent() {
  return (
    <Providers>
      <Outlet />
      <AuthenticatedSupport />
    </Providers>
  )
}

function AuthenticatedSupport() {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  return authenticated && deploymentProfile === 'cloud' ? <TawkFeedbackWidget /> : null
}

export const Route = createRootRoute({
  component: RootRouteComponent,
  notFoundComponent: NotFoundRouteComponent,
})
