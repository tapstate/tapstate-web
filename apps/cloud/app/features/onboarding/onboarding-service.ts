import type { OnboardingInput } from './onboarding-types'

import {
  CloudApiError,
  cloudApi,
  type Cluster,
  type Organization,
  type Subscription,
} from '../../service/cloud-api'
import { newClientRequestId, rememberCheckoutAttempt } from '../billing/checkout-attempt'

export interface OnboardingWorkspace {
  organization: Organization
  subscription: Subscription
  cluster: Cluster
}

export interface OnboardingCheckout {
  checkoutUrl: string
  organization: Organization
  specKey: string
  subscriptionId: string
}

export type OnboardingStart = OnboardingWorkspace | OnboardingCheckout

function subscriptionClusterId(subscription: Subscription) {
  return (
    subscription.clusterId ?? subscription.items?.find((item) => item.clusterId)?.clusterId ?? null
  )
}

async function findExistingWorkspace(
  organization: Organization,
  input: OnboardingInput,
): Promise<OnboardingWorkspace | null> {
  const [clusters, subscriptions] = await Promise.all([
    cloudApi.clusters(organization.id),
    cloudApi.subscriptions(organization.id),
  ])
  const subscription = subscriptions.find((item) => {
    if (item.status === 'CANCELLED') return false
    const clusterId = subscriptionClusterId(item)
    return clusters.some(
      (cluster) =>
        cluster.id === clusterId &&
        cluster.state !== 'TERMINATED' &&
        cluster.region === input.region.code &&
        cluster.name === input.clusterName,
    )
  })
  if (!subscription) return null

  const clusterId = subscriptionClusterId(subscription)
  if (!clusterId) return null
  const cluster = await cloudApi.cluster(organization.id, clusterId)
  return { organization, subscription, cluster }
}

export function suggestedClusterName(organization: Organization, clusters: Cluster[]) {
  const base = `${organization.slug}-stream`.slice(0, 100)
  const names = new Set(clusters.map((cluster) => cluster.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${organization.slug}-stream-${suffix}`.slice(0, 100)
    if (!names.has(candidate.toLowerCase())) return candidate
  }

  return `${organization.slug.slice(0, 88)}-stream-${Date.now().toString(36)}`
}

export async function loadOnboardingWorkspace(
  organizationId: string,
  subscriptionId: string,
): Promise<OnboardingWorkspace> {
  const [organization, subscription] = await Promise.all([
    cloudApi.organization(organizationId),
    cloudApi.subscriptionById(organizationId, subscriptionId),
  ])
  const clusterId = subscriptionClusterId(subscription)
  if (!clusterId) {
    throw new CloudApiError('Subscription exists, but its Cluster record is not visible yet.', 202)
  }

  const cluster = await cloudApi.cluster(organizationId, clusterId)
  return { organization, subscription, cluster }
}

export async function findProvisioningWorkspace(
  organization: Organization,
): Promise<OnboardingWorkspace | null> {
  const [clusters, subscriptions] = await Promise.all([
    cloudApi.clusters(organization.id),
    cloudApi.subscriptions(organization.id),
  ])
  const clustersById = new Map(clusters.map((cluster) => [cluster.id, cluster]))
  const candidates = subscriptions
    .filter((subscription) => subscription.status !== 'CANCELLED')
    .sort((left, right) =>
      (right.updatedAt ?? right.createdAt ?? '').localeCompare(
        left.updatedAt ?? left.createdAt ?? '',
      ),
    )

  for (const subscription of candidates) {
    const clusterId = subscriptionClusterId(subscription)
    const cluster = clusterId ? clustersById.get(clusterId) : undefined
    if (!cluster) continue
    if (
      cluster.state === 'PROVISIONING_PENDING' ||
      cluster.state === 'PROVISIONING' ||
      cluster.state === 'PROVISIONING_FAILED' ||
      (cluster.state === 'READY' && subscription.resourceState !== 'READY')
    ) {
      return { organization, subscription, cluster }
    }
  }

  return null
}

async function findOrCreateOrganization(input: OnboardingInput) {
  let organizations = await cloudApi.organizations()
  if (organizations.length > 0) return organizations[0]
  let organization: Organization | undefined

  if (!organization) {
    try {
      organization = await cloudApi.createOrganization({
        name: input.organizationName,
        slug: input.organizationSlug,
      })
    } catch (error) {
      if (!(error instanceof CloudApiError) || error.status !== 409) throw error
      organizations = await cloudApi.organizations()
      organization = organizations.find((item) => item.slug === input.organizationSlug)
      if (!organization) throw error
    }
  }

  return organization
}

export async function startOnboardingSubscription(
  input: OnboardingInput,
  existingOrganization?: Organization | null,
  onOrganizationResolved?: (organization: Organization) => void,
): Promise<OnboardingStart> {
  const organization = existingOrganization ?? (await findOrCreateOrganization(input))
  onOrganizationResolved?.(organization)
  const existing = await findExistingWorkspace(organization, input)
  if (existing) return existing

  const clientRequestId = newClientRequestId()
  try {
    const session = await cloudApi.createCheckout(organization.id, {
      specKey: input.specKey,
      clientRequestId,
    })
    rememberCheckoutAttempt({
      orgId: organization.id,
      subscriptionId: session.subscriptionId,
      specKey: input.specKey,
      clientRequestId,
      startedAt: new Date().toISOString(),
      region: input.region.code,
      clusterName: input.clusterName,
    })
    return {
      checkoutUrl: session.checkoutUrl,
      organization,
      specKey: input.specKey,
      subscriptionId: session.subscriptionId,
    }
  } catch (error) {
    if (!(error instanceof CloudApiError) || error.status !== 409) throw error
    const recovered = await findExistingWorkspace(organization, input)
    if (!recovered) throw error
    return recovered
  }
}
