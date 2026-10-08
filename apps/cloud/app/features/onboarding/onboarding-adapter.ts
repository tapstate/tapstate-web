import type { Cluster, Subscription } from '../../service/cloud-api'

export function provisioningStage(cluster: Cluster, subscription: Subscription) {
  if (cluster.state === 'READY') {
    return subscription.resourceState === 'READY' ? 3 : 2
  }
  if (cluster.state === 'PROVISIONING') return 1
  return 0
}

export function isWorkspaceReady(cluster: Cluster, subscription: Subscription) {
  return cluster.state === 'READY' && subscription.resourceState === 'READY'
}

export function isProvisioningFailed(cluster: Cluster) {
  return cluster.state === 'PROVISIONING_FAILED'
}

export function isProvisioningCancelled(cluster: Cluster, subscription: Subscription) {
  return (
    subscription.status === 'CANCELLED' ||
    cluster.state === 'DRAINING' ||
    cluster.state === 'DRAINED' ||
    cluster.state === 'TERMINATED'
  )
}
