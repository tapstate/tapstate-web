import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { Cluster } from '../../service/cloud-api'

import { canEnterCluster } from './cluster-entry-state'
import { useClusterEntry } from './use-cluster-entry'

export function AutomaticClusterEntry({
  cluster,
  organizationId,
  onBack,
}: {
  cluster?: Cluster
  organizationId: string
  onBack: () => void
}) {
  const { t } = useTranslation()
  const { enterCluster, enteringId, entryError, cancelEntry } = useClusterEntry()
  const selection = useRef({ cluster, enterCluster })
  selection.current = { cluster, enterCluster }
  const started = useRef(false)
  const clusterId = cluster?.id
  useEffect(() => {
    const selected = selection.current
    if (
      !started.current &&
      selected.cluster &&
      selected.cluster.orgId === organizationId &&
      canEnterCluster(selected.cluster.state)
    ) {
      started.current = true
      void selected.enterCluster(selected.cluster, organizationId)
    }
    return () => {
      started.current = false
    }
  }, [clusterId, organizationId])
  const available = cluster && cluster.orgId === organizationId && canEnterCluster(cluster.state)
  return (
    <section className="mx-auto max-w-xl space-y-4 p-6" aria-label={t('clusterEntry.title')}>
      <h1 className="text-xl font-semibold">{t('clusterEntry.title')}</h1>
      {entryError || !available ? (
        <div role="alert" className="space-y-3">
          <p>{entryError ?? t('clusterEntry.unavailable')}</p>
          {available && (
            <button
              type="button"
              className="min-h-11 rounded-lg border px-4 py-2"
              disabled={Boolean(enteringId)}
              onClick={() => void enterCluster(cluster, organizationId)}
            >
              {t('clusterEntry.retry')}
            </button>
          )}
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2">
          <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          {t('clusterEntry.continuing')}
        </p>
      )}
      <button
        type="button"
        className="min-h-11 rounded-lg border px-4 py-2"
        onClick={() => {
          cancelEntry()
          onBack()
        }}
      >
        {t('clusterEntry.back')}
      </button>
    </section>
  )
}
