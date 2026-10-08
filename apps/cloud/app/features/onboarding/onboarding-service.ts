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
  const match = clusters.find(
    (item) => item.region === input.region.code && item.name === input.clusterName,
  )
  if (!match) return null

  const subscription = subscriptions.find((item) => subscriptionClusterId(item) === match.id)
  if (!subscription) return null

  const cluster = await cloudApi.cluster(organization.id, match.id)
  return { organization, subscription, cluster }
}

async function findOrCreateOrganization(input: OnboardingInput) {
  let organizations = await cloudApi.organizations()
  let organization = organizations.find((item) => item.slug === input.organizationSlug)

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
): Promise<OnboardingWorkspace> {
  const organization = await findOrCreateOrganization(input)
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
