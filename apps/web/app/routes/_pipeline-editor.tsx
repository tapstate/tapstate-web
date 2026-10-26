import { createFileRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router'

import { SessionRecovery } from '@/features/auth/session-recovery'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_pipeline-editor')({
  component: PipelineEditorRouteComponent,
})

function PipelineEditorRouteComponent() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const status = useAuthStore((state) => state.status)
  const epoch = useAuthStore((state) => state.authEpoch)
  if (!isAuthenticated && (status === 'checking' || status === 'unavailable'))
    return <SessionRecovery />
  if (!isAuthenticated) return <Navigate replace to="/login" search={{ redirect: location.href }} />
  return <Outlet key={epoch} />
}
