import type { ApiFetcher } from './source-client'

export interface CloudWorkspaceContext {
  organizationId: string
  clusterId: string
  organizationName: string
  clusterName: string
  region: string
  clusterState: string | null
  userEmail?: string | null
  ec2PublicIp?: string | null
  egressAddressStatus?: string | null
}

export async function loadCloudWorkspaceContext(
  fetcher: ApiFetcher = fetch,
): Promise<CloudWorkspaceContext> {
  const response = await fetcher('/api/cluster/context')
  if (!response.ok) throw new Error('the Cloud workspace context request was refused')

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('the Cloud workspace context response was invalid')
  }

  if (!isCloudWorkspaceContext(payload)) {
    throw new Error('the Cloud workspace context response was malformed')
  }
  return {
    organizationId: payload.organizationId,
    clusterId: payload.clusterId,
    organizationName: payload.organizationName,
    clusterName: payload.clusterName,
    region: payload.region,
    clusterState: payload.clusterState,
    userEmail: payload.userEmail,
    ec2PublicIp: payload.ec2PublicIp,
    egressAddressStatus: payload.egressAddressStatus,
  }
}

function isCloudWorkspaceContext(value: unknown): value is CloudWorkspaceContext {
  return (
    isRecord(value) &&
    typeof value.organizationId === 'string' &&
    typeof value.clusterId === 'string' &&
    typeof value.organizationName === 'string' &&
    typeof value.clusterName === 'string' &&
    typeof value.region === 'string' &&
    (value.clusterState === null || typeof value.clusterState === 'string') &&
    (value.userEmail === undefined ||
      value.userEmail === null ||
      typeof value.userEmail === 'string') &&
    (value.ec2PublicIp === undefined ||
      value.ec2PublicIp === null ||
      typeof value.ec2PublicIp === 'string') &&
    (value.egressAddressStatus === undefined ||
      value.egressAddressStatus === null ||
      typeof value.egressAddressStatus === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
