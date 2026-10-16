import { useNavigate } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCloudAppState } from '../../state/cloud-app-state'
import { useClusterEntry } from './use-cluster-entry'

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function statusColor(status: string) {
  if (status === 'READY') return 'bg-emerald-500'
  if (status === 'PROVISIONING_FAILED' || status === 'DEGRADED') return 'bg-red-500'
  if (status === 'PROVISIONING' || status === 'PROVISIONING_PENDING') return 'bg-amber-500'
  return 'bg-neutral-400'
}

export function ClustersPage() {
  const navigate = useNavigate()
  const { activeOrganization, clusters } = useCloudAppState()
  const { enterCluster, enteringId, entryError } = useClusterEntry()
  const [searchQuery, setSearchQuery] = useState('')
  const filteredClusters = useMemo(
    () =>
      clusters.filter(
        (cluster) =>
          cluster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cluster.region.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [clusters, searchQuery],
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Clusters
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Manage Tapstate clusters across AWS regions.
          </p>
        </div>

        <button
          className="flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          onClick={() =>
            void navigate({
              to: '/onboarding',
              search: { organizationId: activeOrganization?.id, subscriptionId: undefined },
            })
          }
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Provision Cluster</span>
        </button>
      </header>

      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] bg-neutral-50/50 px-6 py-2.5 dark:border-white/[0.05] dark:bg-black/10">
        <div className="text-xs text-neutral-500">
          Total:{' '}
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {clusters.length} clusters
          </span>
        </div>

        <label className="relative">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            className="w-48 rounded-lg border border-black/[0.08] bg-white py-1 pr-3 pl-8 text-xs text-neutral-800 focus:outline-none dark:border-white/[0.08] dark:bg-[#202124] dark:text-neutral-200"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search clusters..."
            type="search"
            value={searchQuery}
          />
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        {entryError && (
          <p className="px-6 py-3 text-xs text-red-600 dark:text-red-400" role="alert">
            {entryError}
          </p>
        )}
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-black/[0.05] font-medium text-neutral-400 dark:border-white/[0.05] dark:text-neutral-500">
              <th className="px-6 py-3">Cluster Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Region</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {filteredClusters.map((cluster) => (
              <tr
                className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                key={cluster.id}
              >
                <td className="px-6 py-3.5 font-mono font-semibold text-neutral-900 dark:text-white">
                  <button
                    className="text-left enabled:cursor-pointer enabled:hover:underline disabled:cursor-default"
                    disabled={
                      cluster.state !== 'READY' || enteringId !== null || !activeOrganization
                    }
                    onClick={() => {
                      if (activeOrganization) void enterCluster(cluster, activeOrganization.id)
                    }}
                    type="button"
                  >
                    {cluster.name}
                  </button>
                </td>
                <td className="px-6 py-3.5">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColor(cluster.state)}`} />
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {statusLabel(cluster.state)}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-3.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                  AWS {cluster.region}
                </td>
                <td className="px-6 py-3.5">
                  <span className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
                    {cluster.specKey ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-300">
                  {dateLabel(cluster.createdAt)}
                </td>
              </tr>
            ))}
            {filteredClusters.length === 0 && (
              <tr>
                <td className="px-6 py-12 text-center text-xs text-neutral-400" colSpan={5}>
                  {clusters.length === 0 ? 'No clusters yet.' : 'No clusters match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
