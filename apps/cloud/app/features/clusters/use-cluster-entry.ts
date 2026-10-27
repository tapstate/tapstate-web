import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Cluster } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { isAllowedCloudClusterHostname } from './cluster-entry-host'
import { canEnterCluster } from './cluster-entry-state'

const activeEntryCancellations = new Set<() => void>()

export function cancelPendingClusterEntries() {
  for (const cancel of activeEntryCancellations) cancel()
}

export function useClusterEntry() {
  const navigate = useNavigate()
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const requestId = useRef(0)

  const cancelCurrentEntry = useCallback(() => {
    requestId.current += 1
    setEnteringId(null)
  }, [])

  useEffect(() => {
    activeEntryCancellations.add(cancelCurrentEntry)
    return () => {
      activeEntryCancellations.delete(cancelCurrentEntry)
      cancelCurrentEntry()
    }
  }, [cancelCurrentEntry])

  const enterCluster = async (cluster: Cluster, orgId: string) => {
    if (enteringId || !canEnterCluster(cluster.state)) return
    for (const cancel of activeEntryCancellations) if (cancel !== cancelCurrentEntry) cancel()
    const currentRequestId = ++requestId.current
    setEnteringId(cluster.id)
    setEntryError(null)

    try {
      const latestCluster = await cloudApi.cluster(orgId, cluster.id)
      if (currentRequestId !== requestId.current) return
      if (!canEnterCluster(latestCluster.state)) {
        throw new CloudApiError('This Cluster is no longer available to open.', 409)
      }

      const { baseUri, exchangeCode, success } = await cloudApi.resolveCluster(cluster.id, orgId)
      if (currentRequestId !== requestId.current) return
      const origin = new URL(baseUri)
      const localTarget = ['localhost', '127.0.0.1'].includes(origin.hostname)
      const localApp = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      const consoleHost = window.location.hostname
      const isAllowedCloudClusterHost = isAllowedCloudClusterHostname(origin.hostname, consoleHost)
      if (
        !success ||
        !exchangeCode ||
        origin.username ||
        origin.password ||
        (!isAllowedCloudClusterHost && !(localApp && localTarget)) ||
        (!localTarget && origin.port !== '') ||
        (origin.protocol !== 'https:' && !(localApp && localTarget && origin.protocol === 'http:'))
      ) {
        throw new Error('The Cluster address is unavailable. Please try again later.')
      }

      const target = new URL('/auth/exchange', origin.origin)
      target.searchParams.set('code', exchangeCode)
      window.location.assign(target.href)
    } catch (error) {
      if (currentRequestId !== requestId.current) return
      if (error instanceof CloudApiError && error.status === 401) {
        await navigate({
          to: '/auth',
          search: { organizationId: orgId, enterClusterId: cluster.id },
        })
        return
      }
      setEntryError(
        error instanceof Error ? error.message : 'Unable to enter the Cluster. Please try again.',
      )
      setEnteringId(null)
    }
  }

  return { enterCluster, enteringId, entryError, cancelEntry: cancelCurrentEntry }
}
