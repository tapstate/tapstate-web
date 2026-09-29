import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/views')({
  component: ViewsRouteComponent,
})

function ViewsRouteComponent() {
  return <Outlet />
}
