import { createRootRoute, Outlet } from '@tanstack/react-router'

import { Providers } from '@/app/routes/-providers'
import { StorageBoundary } from '@/features/storage/storage-gate'

import { NotFoundRouteComponent } from './-not-found'

export function RootRouteComponent() {
  return (
    <Providers>
      <StorageBoundary>
        <Outlet />
      </StorageBoundary>
    </Providers>
  )
}

export const Route = createRootRoute({
  component: RootRouteComponent,
  notFoundComponent: NotFoundRouteComponent,
})
