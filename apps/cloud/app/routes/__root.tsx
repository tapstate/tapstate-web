import { createRootRoute, Outlet } from '@tanstack/react-router'

function RootRoute() {
  return <Outlet />
}

export const Route = createRootRoute({ component: RootRoute })
