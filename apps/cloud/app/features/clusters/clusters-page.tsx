import { useNavigate } from '@tanstack/react-router'
import Badge from '@tapstate-web/ui/badge'
import { Button } from '@tapstate-web/ui/button'
import FilterEmptyState from '@tapstate-web/ui/filter-empty-state'
import { FirstEmptyActionCard } from '@tapstate-web/ui/first-empty-action-card'
import { SearchInput } from '@tapstate-web/ui/search-input'
import { StatusDot, type StatusDotStatus } from '@tapstate-web/ui/status-dot'
import { Check, Copy, LoaderCircle, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ClusterState } from '../../service/cloud-api'

import { cloudApi, type Cluster } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { useClusterEntry } from './use-cluster-entry'

function dateLabel(value: string | null | undefined, language: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(language)
}

function statusTone(status: ClusterState): StatusDotStatus {
  if (status === 'READY') return 'success'
  if (status === 'PROVISIONING_FAILED' || status === 'DEGRADED') return 'error'
  if (status === 'PROVISIONING' || status === 'PROVISIONING_PENDING' || status === 'DRAINING')
    return 'warning'
  return 'disabled'
}

export function ClustersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { activeOrganization, clusters, setClusters } = useCloudAppState()
  const activeOrganizationIdRef = useRef(activeOrganization?.id)
  activeOrganizationIdRef.current = activeOrganization?.id
  const { enterCluster, enteringId, entryError } = useClusterEntry()
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmingEgressId, setConfirmingEgressId] = useState<string | null>(null)
  const [stabilizingEgressId, setStabilizingEgressId] = useState<string | null>(null)
  const [egressError, setEgressError] = useState<string | null>(null)
  const [copiedEgressId, setCopiedEgressId] = useState<string | null>(null)
  const filteredClusters = useMemo(
    () =>
      clusters.filter(
        (cluster) =>
          cluster.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          cluster.region.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [clusters, searchQuery],
  )
  const openProvisioning = () => {
    void navigate({
      to: '/onboarding',
      search: {
        organizationId: activeOrganization?.id,
        subscriptionId: undefined,
        createOrganization: false,
      },
    })
  }

  const hasEgressOperation = clusters.some(
    (cluster) =>
      cluster.egressAddressStatus === 'STABILIZING' || cluster.egressAddressStatus === 'ATTACHING',
  )

  useEffect(() => {
    if (!activeOrganization || !hasEgressOperation) return
    let cancelled = false
    const refresh = () => {
      void cloudApi
        .activeClusters(activeOrganization.id)
        .then((nextClusters) => {
          if (!cancelled) setClusters(nextClusters)
        })
        .catch(() => undefined)
    }
    const timer = window.setInterval(refresh, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeOrganization, hasEgressOperation, setClusters])

  useEffect(() => {
    setConfirmingEgressId(null)
    setStabilizingEgressId(null)
    setEgressError(null)
  }, [activeOrganization?.id])

  async function stabilizeEgressAddress(cluster: Cluster) {
    if (!activeOrganization || stabilizingEgressId) return
    const organizationId = activeOrganization.id
    setStabilizingEgressId(cluster.id)
    setEgressError(null)
    setConfirmingEgressId(null)
    try {
      const updated = await cloudApi.stabilizeClusterEgressAddress(organizationId, cluster.id)
      if (activeOrganizationIdRef.current !== organizationId) return
      setClusters((currentClusters) =>
        currentClusters.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (error) {
      if (activeOrganizationIdRef.current !== organizationId) return
      setEgressError(
        error instanceof Error ? error.message : 'Could not start the address update. Try again.',
      )
    } finally {
      if (activeOrganizationIdRef.current === organizationId) setStabilizingEgressId(null)
    }
  }

  async function copyEgressAddress(cluster: Cluster) {
    if (!cluster.ec2PublicIp) return
    try {
      await navigator.clipboard.writeText(cluster.ec2PublicIp)
      setCopiedEgressId(cluster.id)
      window.setTimeout(
        () => setCopiedEgressId((current) => (current === cluster.id ? null : current)),
        1800,
      )
    } catch {
      setEgressError('Could not copy the address. Select and copy it manually.')
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-divider-subtle flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('sections.clusters.title')}
          </h1>
          <p className="body-sm-regular text-text-tertiary mt-1">{t('clusterList.description')}</p>
        </div>

        <Button className="shrink-0" onClick={openProvisioning} type="button" variant="primary">
          <Plus className="size-4" aria-hidden="true" />
          <span>{t('clusterList.provision')}</span>
        </Button>
      </header>

      <div className="border-divider-subtle flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5">
        <p className="system-xs-regular text-text-tertiary">
          {t('clusterList.total')}{' '}
          <span className="system-xs-medium text-text-secondary">
            {t('clusterList.count', { count: clusters.length })}
          </span>
        </p>

        <SearchInput
          className="w-50 max-w-full"
          value={searchQuery}
          onValueChange={setSearchQuery}
          aria-label={t('common.searchClusters')}
          clearLabel={t('clusterList.clearSearch')}
          placeholder={t('common.searchClusters')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {entryError && (
          <p className="system-xs-regular text-text-destructive px-6 py-3" role="alert">
            {entryError}
          </p>
        )}
        {egressError && (
          <p className="px-6 py-3 text-xs text-red-600 dark:text-red-400" role="alert">
            {egressError}
          </p>
        )}
        {clusters.length === 0 ? (
          <div className="relative min-h-130 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-8 inset-y-2 grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] grid-rows-4 gap-3">
              {Array.from({ length: 16 }, (_, index) => (
                <div key={index} className="bg-background-default-lighter rounded-xl opacity-75" />
              ))}
            </div>
            <div className="from-background-body/0 to-background-body pointer-events-none absolute inset-0 bg-linear-to-b" />
            <section className="absolute inset-0 flex items-center justify-center overflow-hidden p-2">
              <div className="flex w-full max-w-130 flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="border-divider-regular bg-components-card-bg flex size-14 items-center justify-center overflow-hidden rounded-xl border border-dashed p-1 backdrop-blur-md">
                    <span aria-hidden className="i-ri-server-line text-text-tertiary size-6" />
                  </div>
                  <h2 className="system-sm-regular text-text-tertiary text-center">
                    {t('clusterList.noClusters')}
                  </h2>
                </div>
                <FirstEmptyActionCard
                  className="max-w-130"
                  title={t('clusterList.provision')}
                  description={t('clusterList.provisionDescription')}
                  icon={<Plus className="size-4" aria-hidden="true" />}
                  onClick={openProvisioning}
                />
              </div>
            </section>
          </div>
        ) : filteredClusters.length === 0 ? (
          <div className="relative min-h-60">
            <FilterEmptyState title={t('clusterList.noMatches')} />
          </div>
        ) : (
          <table className="w-full min-w-175 border-collapse border-0 text-sm">
            <thead className="border-divider-subtle text-text-tertiary h-8 border-b text-xs/8 font-medium uppercase">
              <tr className="[&>th]:px-3 [&>th]:text-left [&>th]:font-[weight:inherit]">
                <th>{t('clusterList.name')}</th>
                <th>{t('clusterList.status')}</th>
                <th>{t('clusterList.runtimeVersion')}</th>
                <th>{t('clusterList.region')}</th>
                <th>Outbound IP</th>
                <th>{t('clusterList.plan')}</th>
                <th>{t('clusterList.created')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClusters.map((cluster) => (
                <tr
                  className="border-divider-subtle text-text-secondary hover:bg-state-base-hover border-b"
                  key={cluster.id}
                >
                  <td className="text-text-primary px-3 py-2 font-medium">
                    <button
                      className="focus-visible:outline-state-accent-solid rounded-sm text-left focus-visible:outline-2 enabled:cursor-pointer enabled:hover:underline disabled:cursor-default"
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
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot
                        className="rounded-full"
                        status={statusTone(cluster.state)}
                        size="small"
                      />
                      <span>{t(`clusterList.states.${cluster.state}`)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {cluster.runtimeVersion?.trim() || t('clusterList.runtimeVersionNotReported')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">AWS {cluster.region}</td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-52 flex-col items-start gap-1.5">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                          {cluster.ec2PublicIp ?? 'Not available'}
                        </code>
                        {cluster.ec2PublicIp && (
                          <button
                            aria-label="Copy outbound IP"
                            className="rounded p-1 text-neutral-500 hover:bg-black/[0.05] hover:text-neutral-900 dark:hover:bg-white/[0.08] dark:hover:text-white"
                            onClick={() => void copyEgressAddress(cluster)}
                            type="button"
                          >
                            {copiedEgressId === cluster.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      {cluster.egressAddressStatus === 'STABLE' ? (
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          {t('clusters.egress.sourceAllowlistHint')}
                        </span>
                      ) : cluster.egressAddressStatus === 'STABILIZING' ||
                        cluster.egressAddressStatus === 'ATTACHING' ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          Making address stable…
                        </span>
                      ) : cluster.egressAddressStatus === 'FAILED' ? (
                        <span className="text-[10px] text-red-600 dark:text-red-400">
                          Address update failed · current IP may change
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Dynamic · may change if the instance is replaced
                        </span>
                      )}
                      {cluster.egressAddressStatus !== 'STABLE' &&
                        cluster.egressAddressStatus !== 'STABILIZING' &&
                        cluster.egressAddressStatus !== 'ATTACHING' &&
                        (cluster.state === 'READY' || cluster.state === 'DEGRADED') &&
                        (confirmingEgressId === cluster.id ? (
                          <div className="grid gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                            <p className="max-w-64 text-[10px] leading-relaxed text-amber-900 dark:text-amber-100">
                              The public IP and Cluster DNS will change. Update your source firewall
                              allowlist after this finishes; the runtime will stay online.
                            </p>
                            <div className="flex gap-2">
                              <button
                                className="text-[10px] font-semibold text-amber-900 underline dark:text-amber-100"
                                onClick={() => void stabilizeEgressAddress(cluster)}
                                type="button"
                              >
                                Confirm update
                              </button>
                              <button
                                className="text-[10px] text-neutral-600 underline dark:text-neutral-300"
                                onClick={() => setConfirmingEgressId(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="text-[10px] font-medium text-blue-700 underline dark:text-blue-400"
                            disabled={stabilizingEgressId !== null}
                            onClick={() => {
                              setEgressError(null)
                              setConfirmingEgressId(cluster.id)
                            }}
                            type="button"
                          >
                            {cluster.egressAddressStatus === 'FAILED'
                              ? 'Retry address setup'
                              : 'Make IP stable'}
                          </button>
                        ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="dimm">{cluster.specKey ?? '—'}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {dateLabel(cluster.createdAt, i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
