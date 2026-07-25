import { Outlet } from '@tanstack/react-router'
import { Providers } from '@/app/routes/providers'

export function RootRouteComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
}
