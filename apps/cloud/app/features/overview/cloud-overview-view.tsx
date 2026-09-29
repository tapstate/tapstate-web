import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'

import type { Cluster, Organization } from '../../service/cloud-api'

interface CloudOverviewViewProps {
  organization: Organization | null
  subscriptionLabel?: string
  clusters: Cluster[]
  onNavigate: (tab: 'clusters') => void
  onOpenProvisionModal: () => void
  onEnterCluster: (cluster: Cluster) => void
  enteringClusterId: string | null
  entryError: string | null
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function dateLabel(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export function CloudOverviewView({
  organization,
  subscriptionLabel,
  clusters,
  onNavigate,
  onOpenProvisionModal,
  onEnterCluster,
  enteringClusterId,
  entryError,
}: CloudOverviewViewProps) {
  const activeRegions = new Set(
    clusters.filter((cluster) => cluster.state === 'READY').map((cluster) => cluster.region),
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Cloud Overview
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Organization:{' '}
            <span className="font-mono text-neutral-800 dark:text-neutral-200">
              {organization?.name ?? '—'}
            </span>
            {subscriptionLabel && ` (${subscriptionLabel})`}
          </p>
        </div>

        <button
          onClick={onOpenProvisionModal}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Provision Cluster</span>
        </button>
      </div>

      <div className="max-w-5xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-black/[0.06] bg-neutral-50/40 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Total Clusters</div>
            <div className="mt-1 font-mono text-lg font-semibold text-neutral-900 dark:text-white">
              {clusters.length}
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-400">
              Active in {activeRegions.size} {activeRegions.size === 1 ? 'region' : 'regions'}
            </div>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-neutral-50/40 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Active Pipelines
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-neutral-900 dark:text-white">
              —
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-400">Usage data unavailable</div>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-neutral-50/40 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Total Synced Rows (7d)
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-neutral-900 dark:text-white">
              —
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-400">Usage data unavailable</div>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-neutral-50/40 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Monthly Active Rows
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-neutral-900 dark:text-white">
              —
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-400">Usage data unavailable</div>
          </div>
        </div>

        <div className="space-y-2">
          {entryError && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {entryError}
            </p>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
              Managed Clusters
            </h2>
            <button
              onClick={() => onNavigate('clusters')}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              type="button"
            >
              <span>View all clusters</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-black/[0.05] overflow-hidden rounded-xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.06]">
            {clusters.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-neutral-400">
                No clusters yet. Use “Provision Cluster” to create one.
              </div>
            ) : (
              clusters.map((cluster) => (
                <button
                  key={cluster.id}
                  onClick={() => onEnterCluster(cluster)}
                  className="group flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.02] dark:disabled:hover:bg-transparent"
                  disabled={cluster.state !== 'READY' || enteringClusterId !== null}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${cluster.state === 'READY' ? 'bg-emerald-500' : cluster.state === 'PROVISIONING_FAILED' || cluster.state === 'DEGRADED' ? 'bg-red-500' : 'bg-neutral-400'}`}
                    />
                    <span>
                      <span className="flex items-center gap-2 font-mono text-xs font-semibold text-neutral-900 group-hover:text-neutral-700 dark:text-white dark:group-hover:text-neutral-200">
                        <span>{cluster.name}</span>
                        <span className="py-0.2 rounded bg-black/[0.04] px-1.5 font-sans text-[10px] font-normal text-neutral-500 capitalize dark:bg-white/[0.06]">
                          {statusLabel(cluster.state)}
                        </span>
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        AWS {cluster.region}
                        {cluster.specKey ? ` · ${cluster.specKey}` : ''}
                      </span>
                    </span>
                  </span>

                  <span className="flex items-center gap-4 text-xs">
                    <span className="text-right font-mono text-neutral-500">
                      <span className="block">— MAR</span>
                      <span className="block text-[10px] text-neutral-400">
                        {dateLabel(cluster.createdAt)}
                      </span>
                    </span>
                    {cluster.state === 'READY' && (
                      <ArrowUpRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-800 dark:group-hover:text-white" />
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
