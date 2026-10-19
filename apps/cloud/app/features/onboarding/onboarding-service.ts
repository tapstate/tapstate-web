import type { OnboardingInput } from './onboarding-types'

import {
  CloudApiError,
  cloudApi,
  type Cluster,
  type Organization,
  type Subscription,
} from '../../service/cloud-api'

export interface OnboardingWorkspace {
  organization: Organization
  subscription: Subscription
  cluster: Cluster
}

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
  organization: Organization,
  subscriptionId: string,
): Promise<OnboardingWorkspace> {
  const subscription = await cloudApi.subscriptionById(organization.id, subscriptionId)
  const clusterId = subscriptionClusterId(subscription)
  if (!clusterId) {
    throw new CloudApiError('Subscription exists, but its Cluster record is not visible yet.', 202)
  }

  const cluster = await cloudApi.cluster(organization.id, clusterId)
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

export async function createOnboardingWorkspace(
  input: OnboardingInput,
  existingOrganization?: Organization | null,
  onOrganizationResolved?: (organization: Organization) => void,
): Promise<OnboardingWorkspace> {
  const organization = existingOrganization ?? (await findOrCreateOrganization(input))
  onOrganizationResolved?.(organization)
  const existing = await findExistingWorkspace(organization, input)
  if (existing) return existing

  try {
    const subscription = await cloudApi.createSubscription(organization.id, {
      region: input.region.code,
      clusterName: input.clusterName,
      specKey: input.region.defaultSpecKey,
    })
    const clusterId = subscriptionClusterId(subscription)
    const cluster = clusterId
      ? await cloudApi.cluster(organization.id, clusterId)
      : (await cloudApi.clusters(organization.id)).find(
          (item) => item.region === input.region.code && item.name === input.clusterName,
        )

    if (!cluster) {
      throw new CloudApiError(
        'Subscription was created, but its Cluster record is not visible yet.',
        202,
      )
    }

    return {
      organization,
      subscription: { ...subscription, clusterId: subscription.clusterId ?? cluster.id },
      cluster,
    }
  } catch (error) {
    if (!(error instanceof CloudApiError) || error.status !== 409) throw error
    const recovered = await findExistingWorkspace(organization, input)
    if (!recovered) throw error
    return recovered
  }
}
