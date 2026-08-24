import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_pipeline-editor')({
  component: PipelineEditorRouteComponent,
})

function PipelineEditorRouteComponent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate replace to="/login" />
  return <Outlet />
}
