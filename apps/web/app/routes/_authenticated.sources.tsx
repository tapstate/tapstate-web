import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sources')({
  component: SourcesRouteComponent,
})

export function SourcesRouteComponent() {
  return <Outlet />
}
