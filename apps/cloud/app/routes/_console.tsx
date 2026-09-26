import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AccessDeniedPage } from '../features/access/access-denied-page'
import { CloudConsoleShell } from '../shell/cloud-console-shell'

function ConsoleLayout() {
  const session = null

  if (!session) return <AccessDeniedPage />

  return (
    <CloudConsoleShell>
      <Outlet />
    </CloudConsoleShell>
  )
}

export const Route = createFileRoute('/_console')({ component: ConsoleLayout })
