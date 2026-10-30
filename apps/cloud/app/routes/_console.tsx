import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { SkeletonRectangle } from '@tapstate-web/ui/skeleton'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { AutomaticClusterEntry } from '../features/clusters/automatic-cluster-entry'
import { clusterEntrySearch } from '../features/clusters/cluster-entry-intent'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { CloudConsoleShell } from '../shell/cloud-console-shell'
import { useCloudAppState } from '../state/cloud-app-state'

function ConsolePending() {
  const { t } = useTranslation()
  return (
    <div
      className="app-shell flex min-h-screen gap-2 p-2 font-sans"
      role="status"
      aria-label={t('app.loading')}
    >
      <span className="sr-only">{t('app.loading')}</span>
      <aside
        aria-hidden="true"
        className="hidden w-[240px] shrink-0 flex-col gap-4 px-4 py-5 md:flex"
      >
        <SkeletonRectangle className="h-6 w-28 rounded-lg" />
        <SkeletonRectangle className="h-9 w-full rounded-lg" />
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonRectangle key={index} className="h-7 w-36 rounded-lg" />
        ))}
      </aside>
      <main
        aria-hidden="true"
        className="bg-background-default min-w-0 flex-1 rounded-xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <SkeletonRectangle className="h-6 w-36 rounded-md" />
          <SkeletonRectangle className="h-8 w-28 rounded-lg" />
        </div>
        <SkeletonRectangle className="mt-8 h-4 w-44 rounded-md" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="border-divider-subtle rounded-xl border p-5">
              <SkeletonRectangle className="h-4 w-40 max-w-full rounded-md" />
              <SkeletonRectangle className="mt-3 h-3 w-56 max-w-full rounded-md" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function ConsoleLayout() {
  const navigate = useNavigate()
  const { session, organizations, clusters } = Route.useLoaderData()
  const { enterClusterId, organizationId } = Route.useSearch()
  const {
    activeOrganization,
    user,
    clusters: currentClusters,
    setClusters,
    setIdentity,
  } = useCloudAppState()

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
            void navigate({ to: '/auth', search: { organizationId, enterClusterId } })
          }
        })
    }, 10000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [activeOrganization?.id, organizationId, enterClusterId, navigate, setClusters])

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
          cluster={(activeOrganization?.id === organizationId ? currentClusters : clusters).find(
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
          search: {
            organizationId: undefined,
            subscriptionId: undefined,
            createOrganization: false,
          },
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
  pendingComponent: ConsolePending,
  pendingMs: 0,
  pendingMinMs: 0,
})
