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

export interface Spec {
  key: string
  displayName: string
  cpuCores: number
  memoryGb: number
  trialDays: number
  mdbSizeGb: number
  currency: string
  unitPriceCents: number
  stripePriceId: string
  paymentMethod: string
}

export interface CheckoutSession {
  subscriptionId: string
  status: string
  checkoutUrl: string
}

export interface CreateCheckoutInput {
  specKey: string
  clientRequestId: string
}

export interface FinalizeProvisioningInput {
  region: string
  clusterName: string
}

export interface DeploymentProgressSummary {
  overallStatus: string
  percent: number
}

export interface Subscription {
  id: string
  orgId: string
  status:
    | 'PENDING_PAYMENT'
    | 'TRIAL'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'PENDING_CANCEL'
    | 'CANCELLED'
    | string
  provisioningAllowed: boolean
  resourceState?: 'PROVISIONING' | 'READY' | string | null
  installProgress?: DeploymentProgressSummary | null
  uninstallProgress?: DeploymentProgressSummary | null
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

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface PlatformEvent {
  id: string
  orgId?: string | null
  source: string
  type: string
  severity: EventSeverity
  subject: string
  actor?: string | null
  occurredAt: string
  dedupeKey: string
  schemaVersion: number
  payload?: Record<string, unknown> | null
  createdAt?: string
}

export interface EventPage {
  items: PlatformEvent[]
  nextCursor?: string | null
}

export interface EventFilters {
  type?: string
  severity?: EventSeverity | ''
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

export interface AlertPolicy {
  id: string
  name: string
  enabled: boolean
  eventTypes: string[]
  minSeverity: EventSeverity
  recipients: string[]
  channel: string
  cooldownSeconds: number
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  timezone: string
  createdAt?: string
  updatedAt?: string
}

export interface AlertPolicyInput {
  name: string
  enabled: boolean
  eventTypes: string[]
  minSeverity: EventSeverity
  recipients: string[]
  channel: 'EMAIL'
  cooldownSeconds: number
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  timezone: string
}

export interface AlertRecord {
  id: string
  orgId?: string | null
  policyId?: string | null
  policyName?: string | null
  eventId?: string | null
  eventType: string
  severity: EventSeverity
  subject: string
  actor?: string | null
  status: 'PENDING' | 'SUPPRESSED'
  createdAt?: string
}

export interface NotificationDelivery {
  id: string
  orgId?: string | null
  alertId?: string | null
  channel: string
  recipient: string
  subject: string
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'DEAD'
  attempts: number
  lastError?: string | null
  nextAttemptAt?: string | null
  createdAt?: string
  sentAt?: string | null
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
const putJson = (body: unknown): Pick<RequestInit, 'method' | 'body'> => ({
  method: 'PUT',
  body: JSON.stringify(body),
})
const deleteRequest: Pick<RequestInit, 'method'> = { method: 'DELETE' }
const apiPrefix = '/v1/api'

export const cloudApi = {
  register: (input: RegisterInput) =>
    request<RegisteredUser>(`${apiPrefix}/auth/register`, jsonBody(input)),
  login: (input: LoginInput) => request<LoginResult>(`${apiPrefix}/auth/login`, jsonBody(input)),
  logout: () => request<unknown>(`${apiPrefix}/auth/logout`, post),
  me: () => request<LoginResult>(`${apiPrefix}/auth/me`),
  notifyTawkOfflineSubmission: (eventId: string, propertyId: string) =>
    request<{ queued: boolean }>(`${apiPrefix}/feedback/tawk/offline-submissions`, {
      ...jsonBody({ eventId, propertyId }),
      keepalive: true,
    }),
  organizations: async () => asList<Organization>(await request<unknown>(`${apiPrefix}/orgs`)),
  createOrganization: (input: CreateOrganizationInput) =>
    request<Organization>(`${apiPrefix}/orgs`, jsonBody(input)),
  organization: (orgId: string) =>
    request<Organization>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}`),
  regions: async () => asList<Region>(await request<unknown>(`${apiPrefix}/regions`)),
  region: (code: string) => request<Region>(`${apiPrefix}/regions/${encodeURIComponent(code)}`),
  specs: async () => asList<Spec>(await request<unknown>(`${apiPrefix}/specs`)),
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
  createCheckout: (orgId: string, input: CreateCheckoutInput) =>
    request<CheckoutSession>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/checkout`,
      jsonBody(input),
    ),
  finalizeProvisioning: (orgId: string, subscriptionId: string, input: FinalizeProvisioningInput) =>
    request<Subscription>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/finalize-provisioning`,
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
  cancelAtPeriodEnd: (orgId: string, subscriptionId: string) =>
    request<Subscription>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel-at-period-end`,
      post,
    ),
  events: (orgId: string, filters: EventFilters = {}) => {
    const query = new URLSearchParams()
    if (filters.type) query.set('type', filters.type)
    if (filters.severity) query.set('severity', filters.severity)
    if (filters.from) query.set('from', filters.from)
    if (filters.to) query.set('to', filters.to)
    if (filters.limit) query.set('limit', String(filters.limit))
    if (filters.cursor) query.set('cursor', filters.cursor)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<EventPage>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/events${suffix}`)
  },
  event: (orgId: string, eventId: string) =>
    request<PlatformEvent>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/events/${encodeURIComponent(eventId)}`,
    ),
  alerts: async (orgId: string) =>
    asList<AlertRecord>(
      await request<unknown>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/alerts`),
    ),
  alertPolicies: async (orgId: string) =>
    asList<AlertPolicy>(
      await request<unknown>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/alert-policies`),
    ),
  createAlertPolicy: (orgId: string, input: AlertPolicyInput) =>
    request<AlertPolicy>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/alert-policies`,
      jsonBody(input),
    ),
  updateAlertPolicy: (orgId: string, policyId: string, input: AlertPolicyInput) =>
    request<AlertPolicy>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/alert-policies/${encodeURIComponent(policyId)}`,
      putJson(input),
    ),
  deleteAlertPolicy: (orgId: string, policyId: string) =>
    request<unknown>(
      `${apiPrefix}/orgs/${encodeURIComponent(orgId)}/alert-policies/${encodeURIComponent(policyId)}`,
      deleteRequest,
    ),
  deliveries: async (orgId: string) =>
    asList<NotificationDelivery>(
      await request<unknown>(`${apiPrefix}/orgs/${encodeURIComponent(orgId)}/deliveries`),
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
