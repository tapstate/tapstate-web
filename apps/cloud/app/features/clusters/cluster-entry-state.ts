import type { Cluster } from '../../service/cloud-api'

export function canEnterCluster(state: Cluster['state']) {
  return state === 'READY' || state === 'DEGRADED'
}
