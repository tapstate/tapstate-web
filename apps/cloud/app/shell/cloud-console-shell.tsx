import type { ReactNode } from 'react'

import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Moon,
  Search,
  Server,
  Settings,
  Sun,
} from 'lucide-react'
import { useState } from 'react'

import type { Cluster, Organization } from '../service/cloud-api'
import type { UserProfile } from '../types'

import {
  cancelPendingClusterEntries,
  useClusterEntry,
} from '../features/clusters/use-cluster-entry'
import { TawkFeedbackWidget } from '../features/feedback/tawk-feedback-widget'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

const navigation = [
  { label: 'Overview', path: '/', icon: Home, exact: true },
  { label: 'Organizations', path: '/organizations', icon: Building2, exact: false },
  { label: 'Clusters', path: '/clusters', icon: Server, exact: false },
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
  organizations,
  clusters: loaderClusters,
  user,
}: CloudConsoleShellProps) {
  const navigate = useNavigate()
  const currentPath = useRouterState({
    select: (state) =>
      state.location.pathname as '/' | '/organizations' | '/clusters' | '/billing' | '/settings',
  })
  const {
    activeOrganization,
    clusters: stateClusters,
    darkMode,
    setDarkMode,
    setActiveOrganization,
    clearIdentity,
  } = useCloudAppState()
  const [showOrganizationMenu, setShowOrganizationMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [search, setSearch] = useState('')
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  const currentOrganization = activeOrganization ?? organization
  const currentClusters = activeOrganization ? stateClusters : loaderClusters
  const visibleClusters = currentClusters
    .filter((cluster) => cluster.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 3)
  const displayName = user.displayName?.trim() || user.email.split('@')[0]
  const initials = displayName.slice(0, 1).toUpperCase()

  const selectOrganization = (nextOrganization: Organization) => {
    setActiveOrganization(nextOrganization)
    setShowOrganizationMenu(false)
    void navigate({
      to: currentPath,
      search: { organizationId: nextOrganization.id },
    })
  }

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
      className={`app-shell flex h-screen gap-2 overflow-hidden p-2 font-sans transition-colors duration-200 select-none ${darkMode ? 'dark text-[#f0f1f3]' : 'text-[#202124]'}`}
    >
      <aside className="flex h-full w-[240px] shrink-0 flex-col px-2 py-3 text-neutral-800 dark:text-neutral-200">
        <div className="relative mb-3 px-1">
          <button
            aria-expanded={showOrganizationMenu}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            onClick={() => setShowOrganizationMenu((open) => !open)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
                <Building2 aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs leading-tight font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {currentOrganization?.name ?? 'Organization'}
                </span>
              </span>
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </button>

          {showOrganizationMenu && (
            <>
              <button
                aria-label="Close organization menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowOrganizationMenu(false)}
                type="button"
              />
              <div className="absolute top-11 right-1 left-1 z-50 space-y-0.5 rounded-xl border border-black/[0.08] bg-white p-1 text-xs shadow-lg dark:border-white/[0.08] dark:bg-[#202124]">
                <div className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Organizations
                </div>
                {organizations.map((item) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors ${item.id === currentOrganization?.id ? 'bg-black/[0.06] font-medium dark:bg-white/[0.08]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'}`}
                    key={item.id}
                    onClick={() => void selectOrganization(item)}
                    type="button"
                  >
                    <span className="truncate">{item.name}</span>
                    {item.id === currentOrganization?.id && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-neutral-700 dark:text-neutral-300" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
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
          {navigation.map(({ exact, icon: Icon, label, path }) => (
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

        <div className="shrink-0 space-y-1 border-t border-black/[0.05] px-1 pt-2 dark:border-white/[0.05]">
          <Link
            activeProps={{
              className:
                'flex h-8.5 w-full items-center gap-2.5 rounded-lg bg-white px-3 text-left text-xs font-medium text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.03)] dark:bg-[#25272a] dark:text-white',
            }}
            className="flex h-8.5 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-normal text-neutral-600 transition-all duration-150 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
            search={{ organizationId: currentOrganization?.id }}
            to="/settings"
          >
            <Settings className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            <span>Settings</span>
          </Link>

          <div className="relative mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <button
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => setShowUserMenu((open) => !open)}
              type="button"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white dark:bg-white dark:text-neutral-900">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-neutral-900 dark:text-white">
                  {displayName}
                </span>
                <span className="block truncate text-[10px] text-neutral-400">{user.email}</span>
              </span>
            </button>
            <button
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ml-1 shrink-0 rounded p-1 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
              type="button"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {showUserMenu && (
              <>
                <button
                  aria-label="Close account menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowUserMenu(false)}
                  type="button"
                />
                <div className="absolute right-0 bottom-12 left-0 z-50 space-y-2 rounded-xl border border-black/[0.08] bg-white p-2 text-xs shadow-lg dark:border-white/[0.08] dark:bg-[#202124]">
                  <div className="truncate px-1.5 py-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                    {user.email}
                  </div>
                  <div className="border-t border-black/[0.06] pt-1 dark:border-white/[0.06]">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                      onClick={() => void signOut()}
                      type="button"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
