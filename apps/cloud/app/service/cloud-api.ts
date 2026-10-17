import type { UserProfile } from '../types'

import { cloudApiOrigin } from './cloud-api-origin'

export interface ApiEnvelope<T> {
  opId?: string
  code?: string
  msg?: string
  data?: T | null
}

export interface RegisteredUser extends UserProfile {
  id: string
  status?: 'ACTIVE' | 'PENDING_EMAIL' | 'SUSPENDED' | string
  createdAt?: string
  lastLoginAt?: string | null
}

export interface LoginResult {
  email: string
  displayName?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  ownerEmail?: string
  status?: 'ACTIVE' | 'SUSPENDED' | string
}

export interface Region {
  code: string
  name: string
  open: boolean
  defaultSpecKey?: string
}

export interface ResolveResponse {
  success: true
  baseUri: string
  exchangeCode: string
  expiresAt: string
}

export type ClusterState =
  | 'PROVISIONING_PENDING'
  | 'PROVISIONING'
  | 'READY'
  | 'PROVISIONING_FAILED'
  | 'DEGRADED'
  | 'DRAINING'
  | 'DRAINED'
  | 'TERMINATED'

export type ClusterEgressAddressStatus =
  | 'DYNAMIC'
  | 'STABILIZING'
  | 'ATTACHING'
  | 'STABLE'
  | 'FAILED'

export interface Cluster {
  id: string
  orgId: string
  region: string
  name: string
  specKey?: string
  state: ClusterState
  provisionErrorCode?: string | null
  runtimeId?: string | null
  publicDns?: string | null
  ec2PublicIp?: string | null
  egressAddressStatus?: ClusterEgressAddressStatus | null
  lastHeartbeatAt?: string | null
  createdAt?: string
  readyAt?: string | null
}

export interface Subscription {
  id: string
  orgId: string
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | string
  provisioningAllowed: boolean
  resourceState?: 'PROVISIONING' | 'READY' | string | null
  resourcesReadyAt?: string | null
  clusterId?: string | null
  mdbAllocationId?: string | null
  currentPeriodStart?: string
  currentPeriodEnd?: string
  createdAt?: string
  updatedAt?: string
  items?: Array<{
    id: string
    itemType: string
    itemTypeDisplayName?: string
    billingUnit?: string
    includedQuantity?: number
    unitPriceCents?: number
    clusterId?: string | null
    mdbAllocationId?: string | null
    metadata?: Record<string, string>
  }>
}

export interface DeploymentProgress {
  overallStatus: 'PENDING' | 'IN_PROGRESS' | 'FAILED' | 'SUCCEEDED'
  percent: number
  message?: string | null
  operations: Array<{
    operation: string
    displayName: string
    sequence: number
    status: 'PENDING' | 'RUNNING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'
    message?: string | null
  }>
}

export interface RegisterInput {
  email: string
  password: string
  displayName?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface CreateOrganizationInput {
  name: string
  slug: string
}

export interface CreateSubscriptionInput {
  region: string
  clusterName: string
  specKey?: string
}

export class CloudApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly opId?: string,
  ) {
    super(message)
    this.name = 'CloudApiError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function unwrap<T>(value: unknown): T {
  if (isRecord(value) && 'data' in value) {
    if (value.code && value.code !== 'ok') {
      throw new CloudApiError(
        typeof value.msg === 'string' ? value.msg : 'The Cloud API request failed.',
        200,
        typeof value.code === 'string' ? value.code : undefined,
        typeof value.opId === 'string' ? value.opId : undefined,
      )
    }
    return value.data as T
  }
  return value as T
}

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return isRecord(value) ? [value as T] : []
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${cloudApiOrigin}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    throw new CloudApiError(
      error instanceof Error ? error.message : 'Unable to reach the Cloud API.',
      0,
    )
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined
  if (!response.ok) {
    const envelope = isRecord(payload) ? payload : undefined
    throw new CloudApiError(
      typeof envelope?.msg === 'string'
        ? envelope.msg
        : `Cloud API request failed (${response.status}).`,
      response.status,
      typeof envelope?.code === 'string' ? envelope.code : undefined,
      typeof envelope?.opId === 'string' ? envelope.opId : undefined,
    )
  }
  if (payload === undefined) {
    throw new CloudApiError('Cloud API returned an unreadable response.', response.status)
  }
  return unwrap<T>(payload)
}

function jsonBody(body: unknown): Pick<RequestInit, 'body' | 'method'> {
  return { method: 'POST', body: JSON.stringify(body) }
}

const post: Pick<RequestInit, 'method'> = { method: 'POST' }
const apiPrefix = '/v1/api'

export const cloudApi = {
  register: (input: RegisterInput) =>
    request<RegisteredUser>(`${apiPrefix}/auth/register`, jsonBody(input)),
  login: (input: LoginInput) => request<LoginResult>(`${apiPrefix}/auth/login`, jsonBody(input)),
  logout: () => request<unknown>(`${apiPrefix}/auth/logout`, post),
  me: () => request<LoginResult>(`${apiPrefix}/auth/me`),
  organizations: async () => asList<Organization>(await request<unknown>(`${apiPrefix}/orgs`)),
  createOrganization: (input: CreateOrganizationInput) =>
    request<Organization>(`${apiPrefix}/orgs`, jsonBody(input)),
  organization: (orgId: string) =>
    request<Organization>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}`),
  regions: async () => asList<Region>(await request<unknown>(`${apiPrefix}/regions`)),
  region: (code: string) => request<Region>(`${apiPrefix}/regions/${encodeURIComponent(code)}`),
  clusters: async (orgId: string) =>
    asList<Cluster>(
      await request<unknown>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/clusters`),
    ),
  cluster: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}`,
    ),
  createSubscription: (orgId: string, input: CreateSubscriptionInput) =>
    request<Subscription>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions`,
      jsonBody(input),
    ),
  subscriptions: async (orgId: string) =>
    asList<Subscription>(
      await request<unknown>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions`),
    ),
  activeClusters: async (orgId: string) => {
    const [clusters, subscriptions] = await Promise.all([
      cloudApi.clusters(orgId),
      cloudApi.subscriptions(orgId),
    ])
    const cancelledClusterIds = new Set(
      subscriptions
        .filter((subscription) => subscription.status === 'CANCELLED')
        .flatMap((subscription) => [
          subscription.clusterId,
          ...(subscription.items?.map((item) => item.clusterId) ?? []),
        ])
        .filter((id): id is string => Boolean(id)),
    )
    return clusters.filter(
      (cluster) => cluster.state !== 'TERMINATED' && !cancelledClusterIds.has(cluster.id),
    )
  },
  subscriptionById: (orgId: string, subscriptionId: string) =>
    request<Subscription>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    ),
  deploymentProgress: (orgId: string, subscriptionId: string) =>
    request<DeploymentProgress>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/progress?opType=INSTALL`,
    ),
  retryCluster: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}/retry`,
      post,
    ),
  stabilizeClusterEgressAddress: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}/egress-address:stabilize`,
      post,
    ),
  subscription: async (orgId: string) => (await cloudApi.subscriptions(orgId))[0] ?? null,
  cancelSubscription: (orgId: string, subscriptionId: string) =>
    request<Subscription>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      post,
    ),
  resolveCluster: async (clusterId: string, orgId: string) => {
    const query = new URLSearchParams({ orgId })
    const result = await request<unknown>(
      `${apiPrefix}/clusters/${encodeURIComponent(clusterId)}/resolve?${query}`,
    )
    if (
      !isRecord(result) ||
      result.success !== true ||
      typeof result.baseUri !== 'string' ||
      typeof result.exchangeCode !== 'string' ||
      typeof result.expiresAt !== 'string'
    ) {
      throw new CloudApiError('Cloud API returned an invalid Cluster handoff.', 502)
    }
    return {
      success: true,
      baseUri: result.baseUri,
      exchangeCode: result.exchangeCode,
      expiresAt: result.expiresAt,
    }
  },
}
