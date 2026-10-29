import { createRootRoute, Outlet } from '@tanstack/react-router'

import { CloudNotFoundPage } from '../features/navigation/cloud-not-found-page'
import { CloudAppStateProvider } from '../state/cloud-app-state'

function RootRoute() {
  return (
    <CloudAppStateProvider>
      <Outlet />
    </CloudAppStateProvider>
  )
}

export const Route = createRootRoute({ component: RootRoute, notFoundComponent: CloudNotFoundPage })
