import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { useClusterEntry } from '../clusters/use-cluster-entry'
import { CloudOverviewView } from './cloud-overview-view'

export function OverviewPage() {
  const navigate = useNavigate()
  const { activeOrganization, clusters, setClusters } = useCloudAppState()
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  const hasEgressAddressOperation = clusters.some(
    (cluster) =>
      cluster.egressAddressStatus === 'STABILIZING' || cluster.egressAddressStatus === 'ATTACHING',
  )

  useEffect(() => {
    const organizationId = activeOrganization?.id
    if (!organizationId || !hasEgressAddressOperation) return

    let current = true
    const refreshClusters = () => {
      void cloudApi
        .activeClusters(organizationId)
        .then((nextClusters) => {
          if (current) setClusters(nextClusters)
        })
        .catch(() => undefined)
    }
    const timer = window.setInterval(refreshClusters, 4000)

    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [activeOrganization?.id, hasEgressAddressOperation, setClusters])

  return (
    <CloudOverviewView
      clusters={clusters}
      onNavigate={() =>
        void navigate({ to: '/clusters', search: { organizationId: activeOrganization?.id } })
      }
      onOpenProvisionModal={() =>
        void navigate({
          to: '/onboarding',
          search: { organizationId: activeOrganization?.id, subscriptionId: undefined },
        })
      }
      onEnterCluster={(cluster) => {
        if (activeOrganization) void enterCluster(cluster, activeOrganization.id)
      }}
      enteringClusterId={enteringId}
      entryError={entryError}
    />
  )
}
