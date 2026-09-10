import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sources/$sourceId')({
  component: SourceRouteComponent,
})

function SourceRouteComponent() {
  return <Outlet />
}
