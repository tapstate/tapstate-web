import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { CloudApiError, cloudApi } from '../service/cloud-api'
import { CloudConsoleShell } from '../shell/cloud-console-shell'
import { useCloudAppState } from '../state/cloud-app-state'

function ConsoleLayout() {
  const navigate = useNavigate()
  const { session, organizations, clusters } = Route.useLoaderData()
  const { activeOrganization, user, setClusters, setIdentity } = useCloudAppState()

  useEffect(() => {
    setIdentity(session, organizations, clusters)
  }, [clusters, organizations, session, setIdentity])

  useEffect(() => {
    const orgId = activeOrganization?.id
    if (!orgId) return
    let active = true
    const timer = window.setInterval(() => {
      void cloudApi
        .activeClusters(orgId)
        .then((latest) => {
          if (active) setClusters(latest)
        })
        .catch((error) => {
          if (active && error instanceof CloudApiError && error.status === 401) {
            void navigate({ to: '/auth' })
          }
        })
    }, 10000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [activeOrganization?.id, navigate, setClusters])

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
      const requestedOrganizationId = new URLSearchParams(window.location.search).get(
        'organizationId',
      )
      const selectedOrganization = organizations.find((item) => item.id === requestedOrganizationId)
      const orderedOrganizations = selectedOrganization
        ? [
            selectedOrganization,
            ...organizations.filter((item) => item.id !== selectedOrganization.id),
          ]
        : organizations
      const clusters = await cloudApi.activeClusters(orderedOrganizations[0].id)
      return { session, organizations: orderedOrganizations, clusters }
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) throw redirect({ to: '/auth' })
      throw error
    }
  },
  component: ConsoleLayout,
})
