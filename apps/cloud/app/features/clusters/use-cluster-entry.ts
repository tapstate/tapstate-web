import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import type { Cluster } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'

export function useClusterEntry() {
  const navigate = useNavigate()
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)

  const enterCluster = async (cluster: Cluster, orgId: string) => {
    if (enteringId || cluster.state !== 'READY') return
    setEnteringId(cluster.id)
    setEntryError(null)

    try {
      const { baseUri, exchangeCode, success } = await cloudApi.resolveCluster(cluster.id, orgId)
      const origin = new URL(baseUri)
      const localTarget = ['localhost', '127.0.0.1'].includes(origin.hostname)
      const localApp = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      if (
        !success ||
        !exchangeCode ||
        !cluster.publicDns ||
        origin.hostname !== cluster.publicDns ||
        origin.username ||
        origin.password ||
        (origin.protocol !== 'https:' && !(localApp && localTarget && origin.protocol === 'http:'))
      ) {
        throw new Error('The Cluster address is unavailable. Please try again later.')
      }

      const target = new URL('/auth/exchange', origin.origin)
      target.searchParams.set('code', exchangeCode)
      window.location.assign(target.href)
    } catch (error) {
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
