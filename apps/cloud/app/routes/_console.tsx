import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { AutomaticClusterEntry } from '../features/clusters/automatic-cluster-entry'
import { clusterEntrySearch } from '../features/clusters/cluster-entry-intent'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { CloudConsoleShell } from '../shell/cloud-console-shell'
import { useCloudAppState } from '../state/cloud-app-state'

function ConsoleLayout() {
  const navigate = useNavigate()
  const { session, organizations, clusters } = Route.useLoaderData()
  const { enterClusterId, organizationId } = Route.useSearch()
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
      {enterClusterId && organizationId ? (
        <AutomaticClusterEntry
          key={`${organizationId}:${enterClusterId}`}
          organizationId={organizationId}
          cluster={clusters.find(
            (cluster) => cluster.id === enterClusterId && cluster.orgId === organizationId,
          )}
          onBack={() => void navigate({ to: '/', search: { organizationId }, replace: true })}
        />
      ) : (
        <Outlet />
      )}
    </CloudConsoleShell>
  )
}

export const Route = createFileRoute('/_console')({
  validateSearch: clusterEntrySearch,
  loaderDeps: ({ search }) => ({
    organizationId: search.organizationId,
    enterClusterId: search.enterClusterId,
  }),
  loader: async ({ deps }) => {
    try {
      const [session, organizations] = await Promise.all([cloudApi.me(), cloudApi.organizations()])
      if (organizations.length === 0) {
        if (deps.enterClusterId)
          throw new CloudApiError('The requested Cluster is unavailable to this account.', 403)
        throw redirect({
          to: '/onboarding',
          search: { organizationId: undefined, subscriptionId: undefined },
        })
      }
      const selectedOrganization = organizations.find((item) => item.id === deps.organizationId)
      if (deps.enterClusterId && !selectedOrganization)
        throw new CloudApiError('The requested Cluster is unavailable to this account.', 403)
      const orderedOrganizations = selectedOrganization
        ? [
            selectedOrganization,
            ...organizations.filter((item) => item.id !== selectedOrganization.id),
          ]
        : organizations
      const clusters = await cloudApi.activeClusters(orderedOrganizations[0].id)
      return { session, organizations: orderedOrganizations, clusters }
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401)
        throw redirect({ to: '/auth', search: deps })
      throw error
    }
  },
  component: ConsoleLayout,
})
