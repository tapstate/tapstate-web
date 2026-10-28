import type { ReactNode } from 'react'

import { Link, useNavigate } from '@tanstack/react-router'
import Badge from '@tapstate-web/ui/badge'
import {
  BellRing,
  Building2,
  ChevronRight,
  CreditCard,
  Home,
  LifeBuoy,
  Server,
  Settings,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  { label: 'Alerts', path: '/alerts', icon: BellRing, exact: false },
  { label: 'Plans & billing', path: '/billing', icon: CreditCard, exact: false },
  { label: 'Support', path: '/support', icon: LifeBuoy, exact: false },
  { label: 'Settings', path: '/settings', icon: Settings, exact: false },
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
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  const currentOrganization = activeOrganization ?? organization
  const { t } = useTranslation()
  const currentClusters = activeOrganization ? stateClusters : loaderClusters
  const visibleClusters = currentClusters.slice(0, 3)
  const visibleNavigation = navigation

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
            className="inline-flex items-center gap-2 rounded-lg transition-opacity hover:opacity-85"
            search={{ organizationId: currentOrganization?.id }}
            to="/"
          >
            <img
              alt="Tapstate"
              className="w-[120px] shrink-0 dark:hidden"
              src="/tapstate-lockup-light.svg"
            />
            <img
              alt="Tapstate"
              className="hidden w-[120px] shrink-0 dark:block"
              src="/tapstate-lockup-dark.svg"
            />
            <Badge
              as="span"
              uppercase={false}
              className="bg-state-accent-hover text-text-accent border-transparent"
            >
              {t('support.organizationBadge')}
            </Badge>
          </Link>
        </div>

        <div
          className="mx-1 mb-4 flex min-w-0 items-center gap-1.5 rounded-xl border border-white bg-[#fcfcfd] p-1.5 pr-3 shadow-[0_1px_2px_0_rgb(16_24_40_/_5%)] dark:border-white/[0.03] dark:bg-[#222225]"
          aria-label={`${t('support.organization')}: ${currentOrganization?.name ?? t('events.organizationFallback')}`}
        >
          <span
            className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-500/[0.08] text-neutral-500 dark:text-neutral-400"
            aria-hidden="true"
          >
            <Building2 className="size-4" />
          </span>
          <span
            className="min-w-0 truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100"
            title={currentOrganization?.name}
          >
            {currentOrganization?.name ?? t('events.organizationFallback')}
          </span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-1">
          {visibleNavigation.map(({ exact, icon: Icon, label, path }) => (
            <Link
              activeOptions={{ exact, includeSearch: false }}
              activeProps={{
                className:
                  'bg-white font-medium text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.03)] hover:bg-white dark:bg-[#25272a] dark:text-white dark:hover:bg-[#25272a]',
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-all duration-150"
              inactiveProps={{
                className:
                  'font-normal text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white',
              }}
              key={path}
              search={{ organizationId: currentOrganization?.id }}
              to={path}
            >
              <Icon className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="truncate">
                {path === '/support'
                  ? t('support.nav')
                  : path === '/alerts'
                    ? t('sections.alerts.title')
                    : path === '/settings'
                      ? t('sections.settings.title')
                      : path === '/billing'
                        ? t('sections.billing.title')
                        : path === '/clusters'
                          ? t('sections.clusters.title')
                          : path === '/'
                            ? t('sections.overview.title')
                            : label}
              </span>
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
