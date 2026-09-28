import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

import { CloudApiError, cloudApi } from '../service/cloud-api'
import { CloudConsoleShell } from '../shell/cloud-console-shell'
import { useCloudAppState } from '../state/cloud-app-state'

function ConsoleLayout() {
  const { session, organizations, clusters } = Route.useLoaderData()
  const { activeOrganization, user, setIdentity } = useCloudAppState()

  useEffect(() => {
    setIdentity(session, organizations, clusters)
  }, [clusters, organizations, session, setIdentity])

  return (
    <CloudConsoleShell
      organization={activeOrganization ?? organizations[0] ?? null}
      user={user ?? session}
      organizations={organizations}
      clusters={clusters}
    >
      <Outlet />
    </CloudConsoleShell>
  )
}

export const Route = createFileRoute('/_console')({
  loader: async () => {
    try {
      const [session, organizations] = await Promise.all([cloudApi.me(), cloudApi.organizations()])
      if (organizations.length === 0) throw redirect({ to: '/onboarding' })
      const clusters = await cloudApi.clusters(organizations[0].id)
      return { session, organizations, clusters }
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) throw redirect({ to: '/auth' })
      throw error
    }
  },
  component: ConsoleLayout,
})
