import { createRootRoute, Outlet } from '@tanstack/react-router'

import { CloudAppStateProvider } from '../state/cloud-app-state'

function RootRoute() {
  return (
    <CloudAppStateProvider>
      <Outlet />
    </CloudAppStateProvider>
  )
}

export const Route = createRootRoute({ component: RootRoute })
