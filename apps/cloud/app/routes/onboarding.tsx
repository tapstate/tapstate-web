import { createFileRoute, redirect } from '@tanstack/react-router'

import type { Organization } from '../service/cloud-api'
import type { UserProfile } from '../types'

import { useClusterEntry } from '../features/clusters/use-cluster-entry'
import { OnboardingPage } from '../features/onboarding/onboarding-page'
import {
  findProvisioningWorkspace,
  loadOnboardingWorkspace,
  startOnboardingSubscription,
  suggestedClusterName,
  type OnboardingWorkspace,
} from '../features/onboarding/onboarding-service'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

function OnboardingRoute() {
  const { user, organization, suggestedName, initialWorkspace, initialProgress, resumeError } =
    Route.useLoaderData()
  const { completeOnboarding, darkMode, setDarkMode } = useCloudAppState()
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  return (
    <OnboardingPage
      darkMode={darkMode}
      onComplete={(organization, cluster) => {
        completeOnboarding(user, organization, cluster)
        void enterCluster(cluster, organization.id)
      }}
      onCreateWorkspace={startOnboardingSubscription}
      currentOrganization={organization}
      initialWorkspace={initialWorkspace}
      initialProgress={initialProgress}
      suggestedClusterName={suggestedName}
      resumeError={resumeError}
      setDarkMode={setDarkMode}
      user={user}
      isOpeningCluster={enteringId !== null}
      entryError={entryError}
    />
  )
}

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search: Record<string, unknown>) => ({
    organizationId: typeof search.organizationId === 'string' ? search.organizationId : undefined,
    subscriptionId: typeof search.subscriptionId === 'string' ? search.subscriptionId : undefined,
  }),
  loaderDeps: ({ search }) => ({
    organizationId: search.organizationId,
    subscriptionId: search.subscriptionId,
  }),
  loader: async ({
    deps,
  }): Promise<{
    user: UserProfile
    organization: Organization | null
    suggestedName: string
    initialWorkspace: OnboardingWorkspace | null
    initialProgress: Awaited<ReturnType<typeof cloudApi.deploymentProgress>> | null
    resumeError: boolean
  }> => {
    try {
      const user = await cloudApi.me()
      let organization: Organization | null = null
      let suggestedName = ''
      let initialWorkspace: OnboardingWorkspace | null = null
      let initialProgress: Awaited<ReturnType<typeof cloudApi.deploymentProgress>> | null = null
      let resumeError = false

      const organizations = await cloudApi.organizations()
      if (deps.organizationId && !organizations.some((item) => item.id === deps.organizationId)) {
        throw redirect({ to: '/organizations', search: { organizationId: undefined } })
      }
      organization =
        organizations.find((item) => item.id === deps.organizationId) ?? organizations[0] ?? null
      if (organization) {
        const clusters = await cloudApi.clusters(organization.id)
        suggestedName = suggestedClusterName(organization, clusters)

        try {
          initialWorkspace = deps.subscriptionId
            ? await loadOnboardingWorkspace(organization.id, deps.subscriptionId)
            : await findProvisioningWorkspace(organization)
        } catch (error) {
          if (error instanceof CloudApiError && error.status === 401) throw error
          resumeError = Boolean(deps.subscriptionId)
        }
      }

      if (initialWorkspace) {
        organization = initialWorkspace.organization
        try {
          initialProgress = await cloudApi.deploymentProgress(
            initialWorkspace.organization.id,
            initialWorkspace.subscription.id,
          )
        } catch (error) {
          if (error instanceof CloudApiError && error.status === 401) throw error
        }
      }

      return {
        user,
        organization,
        suggestedName,
        initialWorkspace,
        initialProgress,
        resumeError,
      }
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        throw redirect({ to: '/auth' })
      }
      throw error
    }
  },
  component: OnboardingRoute,
})
