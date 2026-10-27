import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Cluster } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { isAllowedCloudClusterOrigin } from './cluster-entry-host'

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
    }
  }, [cancelCurrentEntry])

  const enterCluster = async (cluster: Cluster, orgId: string) => {
    if (enteringId || cluster.state !== 'READY') return
    const currentRequestId = ++requestId.current
    setEnteringId(cluster.id)
    setEntryError(null)

    try {
      const latestCluster = await cloudApi.cluster(orgId, cluster.id)
      if (currentRequestId !== requestId.current) return
      if (latestCluster.state !== 'READY') {
        throw new CloudApiError('This Cluster is no longer ready to open.', 409)
      }

      const { baseUri, exchangeCode, success } = await cloudApi.resolveCluster(cluster.id, orgId)
      if (currentRequestId !== requestId.current) return
      const origin = new URL(baseUri)
      const localTarget = ['localhost', '127.0.0.1'].includes(origin.hostname)
      const localApp = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      const consoleHost = window.location.hostname
      const localClusterProxyOrigin = import.meta.env.VITE_LOCAL_CLUSTER_PROXY_ORIGIN
      const usesLocalClusterProxy =
        import.meta.env.DEV &&
        localApp &&
        typeof localClusterProxyOrigin === 'string' &&
        origin.protocol === 'https:' &&
        origin.origin === localClusterProxyOrigin
      const allowedCloudOrigin = isAllowedCloudClusterOrigin(
        origin,
        consoleHost,
        import.meta.env.DEV,
      )
      if (
        !success ||
        !exchangeCode ||
        origin.username ||
        origin.password ||
        (!allowedCloudOrigin && !(localApp && localTarget) && !usesLocalClusterProxy) ||
        (origin.protocol !== 'https:' && !(localApp && localTarget && origin.protocol === 'http:'))
      ) {
        throw new Error('The Cluster address is unavailable. Please try again later.')
      }

      const targetOrigin = usesLocalClusterProxy ? 'http://localhost:5173' : origin.origin
      const target = new URL('/auth/exchange', targetOrigin)
      target.searchParams.set('code', exchangeCode)
      if (usesLocalClusterProxy) window.location.replace(target.href)
      else window.location.assign(target.href)
    } catch (error) {
      if (currentRequestId !== requestId.current) return
      if (error instanceof CloudApiError && error.status === 401) {
        await navigate({ to: '/auth' })
        return
      }
      setEntryError(
        error instanceof Error ? error.message : 'Unable to enter the Cluster. Please try again.',
      )
      setEnteringId(null)
    }
  }

  return { enterCluster, enteringId, entryError }
}
