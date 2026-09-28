import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import type { UserProfile } from '../types'

import { OnboardingPage, type OnboardingInput } from '../features/onboarding/onboarding-page'
import { CloudApiError, cloudApi, type Cluster, type Organization } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

async function createWorkspace(input: OnboardingInput): Promise<{
  organization: Organization
  cluster: Cluster
}> {
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

  const clusters = await cloudApi.clusters(organization.id)
  let cluster = clusters.find(
    (item) => item.region === input.region.code && item.name === input.clusterName,
  )

  if (!cluster) {
    try {
      cluster = await cloudApi.createCluster(organization.id, {
        region: input.region.code,
        name: input.clusterName,
        specKey: input.region.defaultSpecKey,
      })
    } catch (error) {
      if (!(error instanceof CloudApiError) || error.status !== 409) throw error
      const latestClusters = await cloudApi.clusters(organization.id)
      cluster = latestClusters.find(
        (item) => item.region === input.region.code && item.name === input.clusterName,
      )
      if (!cluster) throw error
    }
  }

  return { organization, cluster }
}

function OnboardingRoute() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  const { completeOnboarding, darkMode, setDarkMode } = useCloudAppState()

  return (
    <OnboardingPage
      darkMode={darkMode}
      onComplete={(organization, cluster) => {
        completeOnboarding(user, organization, cluster)
        void navigate({ to: '/' })
      }}
      onCreateWorkspace={createWorkspace}
      setDarkMode={setDarkMode}
      user={user}
    />
  )
}

export const Route = createFileRoute('/onboarding')({
  loader: async (): Promise<{ user: UserProfile }> => {
    try {
      return { user: await cloudApi.me() }
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        throw redirect({ to: '/auth' })
      }
      throw error
    }
  },
  component: OnboardingRoute,
})
