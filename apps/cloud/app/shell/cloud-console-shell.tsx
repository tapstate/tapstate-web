import type { ReactNode } from 'react'

import { Link, useNavigate } from '@tanstack/react-router'
import { BellRing, ChevronRight, CreditCard, Home, Inbox, Search, Server } from 'lucide-react'
import { useState } from 'react'

import type { Cluster, Organization } from '../service/cloud-api'
import type { UserProfile } from '../types'

import { AccountMenu } from '../features/account/account-menu'
import {
  cancelPendingClusterEntries,
  useClusterEntry,
} from '../features/clusters/use-cluster-entry'
import { HelpMenu } from '../features/feedback/help-menu'
import { TawkFeedbackWidget } from '../features/feedback/tawk-feedback-widget'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

const navigation = [
  { label: 'Overview', path: '/', icon: Home, exact: true },
  { label: 'Clusters', path: '/clusters', icon: Server, exact: false },
  { label: 'Events', path: '/events', icon: BellRing, exact: false },
  { label: 'Alert policies', path: '/alert-policies', icon: BellRing, exact: false },
  { label: 'Deliveries', path: '/deliveries', icon: Inbox, exact: false },
  { label: 'Billing', path: '/billing', icon: CreditCard, exact: false },
] as const

interface CloudConsoleShellProps {
  children: ReactNode
  organization: Organization | null
  organizations: Organization[]
  clusters: Cluster[]
  user: UserProfile
}

export function CloudConsoleShell({
  children,
  organization,
  clusters: loaderClusters,
  user,
}: CloudConsoleShellProps) {
  const navigate = useNavigate()
  const {
    activeOrganization,
    clusters: stateClusters,
    darkMode,
    clearIdentity,
  } = useCloudAppState()
  const [search, setSearch] = useState('')
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  const currentOrganization = activeOrganization ?? organization
  const currentClusters = activeOrganization ? stateClusters : loaderClusters
  const visibleClusters = currentClusters
    .filter((cluster) => cluster.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 3)
  const canManageAlertPolicies =
    !currentOrganization?.ownerEmail ||
    currentOrganization.ownerEmail.toLowerCase() === user.email.toLowerCase()
  const visibleNavigation = navigation.filter(
    (item) => item.path !== '/alert-policies' || canManageAlertPolicies,
  )

  const signOut = async () => {
    cancelPendingClusterEntries()
    try {
      await cloudApi.logout()
    } catch (error) {
      if (!(error instanceof CloudApiError) || error.status !== 401) return
    }
    clearIdentity()
    await navigate({ to: '/auth' })
  }

  return (
    <div
      className={`app-shell flex h-screen gap-2 overflow-hidden p-2 font-sans transition-colors duration-200 ${darkMode ? 'dark text-[#f0f1f3]' : 'text-[#202124]'}`}
    >
      <aside className="flex h-full w-[240px] shrink-0 flex-col px-2 py-3 text-neutral-800 dark:text-neutral-200">
        <div className="mb-3 px-2 py-1">
          <Link
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-85"
            search={{ organizationId: currentOrganization?.id }}
            to="/"
          >
            <img alt="Tapstate" className="h-6 w-6 shrink-0 dark:hidden" src="/tapstate-mark.svg" />
            <img
              alt="Tapstate"
              className="hidden h-6 w-6 shrink-0 dark:block"
              src="/tapstate-mark-light.svg"
            />
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
              Tapstate Cloud
            </span>
          </Link>
        </div>

        <div className="mb-3 px-1">
          <label className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-black/[0.04] dark:text-neutral-400 dark:hover:bg-white/[0.05]">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              aria-label="Search clusters"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              value={search}
            />
            <span className="font-mono text-[10px] opacity-60">⌘K</span>
          </label>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-1">
          {visibleNavigation.map(({ exact, icon: Icon, label, path }) => (
            <Link
              activeOptions={{ exact }}
              activeProps={{
                className:
                  'flex h-8.5 w-full items-center gap-2.5 rounded-lg bg-white px-3 text-left text-xs font-medium text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.03)] dark:bg-[#25272a] dark:text-white',
              }}
              className="flex h-8.5 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-normal text-neutral-600 transition-all duration-150 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              key={path}
              search={{ organizationId: currentOrganization?.id }}
              to={path}
            >
              <Icon className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="truncate">{label}</span>
            </Link>
          ))}

          <div className="flex items-center justify-between px-2.5 pt-3 pb-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            <span>Clusters</span>
            <Link
              className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              search={{ organizationId: currentOrganization?.id }}
              to="/clusters"
            >
              <ChevronRight aria-label="View all clusters" className="h-3 w-3" />
            </Link>
          </div>
          {visibleClusters.map((cluster) => (
            <button
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-600 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 disabled:cursor-wait dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              disabled={enteringId !== null}
              key={cluster.id}
              onClick={() => {
                if (cluster.state === 'READY' && currentOrganization) {
                  void enterCluster(cluster, currentOrganization.id)
                } else {
                  void navigate({
                    to: '/clusters',
                    search: { organizationId: currentOrganization?.id },
                  })
                }
              }}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${cluster.state === 'READY' ? 'bg-emerald-500' : 'bg-neutral-400'}`}
                />
                <span className="truncate font-mono">{cluster.name}</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-neutral-400 opacity-60" />
            </button>
          ))}
          {entryError && (
            <p className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {entryError}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-black/[0.05] pt-2 dark:border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <AccountMenu
                onLogout={signOut}
                organizationId={currentOrganization?.id}
                user={user}
              />
            </div>
            <div className="flex shrink-0 items-center justify-center rounded-full p-1">
              <HelpMenu />
            </div>
          </div>
        </div>
      </aside>

      <main className="main-surface relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
      <TawkFeedbackWidget />
    </div>
  )
}
