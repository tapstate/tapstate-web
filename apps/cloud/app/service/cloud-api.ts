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
  elasticIp?: string | null
  lastHeartbeatAt?: string | null
  createdAt?: string
  readyAt?: string | null
}

export interface Subscription {
  id: string
  orgId: string
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | string
  provisioningAllowed: boolean
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
    metadata?: Record<string, string>
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

export interface CreateClusterInput {
  region: string
  name: string
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

export const cloudApi = {
  register: (input: RegisterInput) => request<RegisteredUser>('/v1/auth/register', jsonBody(input)),
  login: (input: LoginInput) => request<LoginResult>('/v1/auth/login', jsonBody(input)),
  logout: () => request<unknown>('/v1/auth/logout', post),
  me: () => request<LoginResult>('/v1/auth/me'),
  organizations: async () => asList<Organization>(await request<unknown>('/v1/orgs')),
  createOrganization: (input: CreateOrganizationInput) =>
    request<Organization>('/v1/orgs', jsonBody(input)),
  organization: (orgId: string) => request<Organization>(`/v1/orgs/${encodeURIComponent(orgId)}`),
  regions: async () => asList<Region>(await request<unknown>('/v1/regions')),
  region: (code: string) => request<Region>(`/v1/regions/${encodeURIComponent(code)}`),
  clusters: async (orgId: string) =>
    asList<Cluster>(await request<unknown>(`/v1/orgs/${encodeURIComponent(orgId)}/clusters`)),
  cluster: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `/v1/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}`,
    ),
  createCluster: (orgId: string, input: CreateClusterInput) =>
    request<Cluster>(`/v1/orgs/${encodeURIComponent(orgId)}/clusters`, jsonBody(input)),
  retryCluster: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `/v1/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}/retry`,
      post,
    ),
  cancelCluster: (orgId: string, clusterId: string) =>
    request<Cluster>(
      `/v1/orgs/${encodeURIComponent(orgId)}/clusters/${encodeURIComponent(clusterId)}/cancel`,
      post,
    ),
  subscription: (orgId: string) =>
    request<Subscription>(`/v1/orgs/${encodeURIComponent(orgId)}/subscription`),
  cancelSubscription: (orgId: string) =>
    request<Subscription>(`/v1/orgs/${encodeURIComponent(orgId)}/subscription/cancel`, post),
  resolveCluster: (clusterId: string, orgId: string) => {
    const query = new URLSearchParams({ orgId })
    return request<ResolveResponse>(
      `/v1/clusters/${encodeURIComponent(clusterId)}/resolve?${query}`,
    )
  },
}
