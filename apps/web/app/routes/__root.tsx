import { createRootRoute, Outlet } from '@tanstack/react-router'

import { Providers } from '@/app/routes/-providers'

import { NotFoundRouteComponent } from './-not-found'

export function RootRouteComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
}

export const Route = createRootRoute({
  component: RootRouteComponent,
  notFoundComponent: NotFoundRouteComponent,
})
