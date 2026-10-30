import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import type { Organization } from '../service/cloud-api'
import type { UserProfile } from '../types'

import {
  cancelPendingClusterEntries,
  useClusterEntry,
} from '../features/clusters/use-cluster-entry'
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
  const {
    user,
    organization,
    suggestedName,
    initialWorkspace,
    initialProgress,
    resumeError,
    createOrganization,
    consoleOrganizationId,
  } = Route.useLoaderData()
  const navigate = useNavigate()
  const { completeOnboarding, darkMode, clearIdentity } = useCloudAppState()
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  return (
    <OnboardingPage
      darkMode={darkMode}
      consoleOrganizationId={consoleOrganizationId}
      onLogout={async () => {
        cancelPendingClusterEntries()
        try {
          await cloudApi.logout()
        } catch (error) {
          if (!(error instanceof CloudApiError) || error.status !== 401) return
        }
        clearIdentity()
        await navigate({ to: '/auth' })
      }}
      onComplete={(organization, cluster) => {
        completeOnboarding(user, organization, cluster)
        void enterCluster(cluster, organization.id)
      }}
      onCreateWorkspace={startOnboardingSubscription}
      currentOrganization={organization}
      createOrganization={createOrganization}
      initialWorkspace={initialWorkspace}
      initialProgress={initialProgress}
      suggestedClusterName={suggestedName}
      resumeError={resumeError}
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
    createOrganization: search.createOrganization === true,
  }),
  loaderDeps: ({ search }) => ({
    organizationId: search.organizationId,
    subscriptionId: search.subscriptionId,
    createOrganization: search.createOrganization,
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
    createOrganization: boolean
    consoleOrganizationId?: string
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
      organization = deps.createOrganization
        ? null
        : (organizations.find((item) => item.id === deps.organizationId) ??
          organizations[0] ??
          null)
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
        createOrganization: deps.createOrganization,
        consoleOrganizationId: organization?.id ?? organizations[0]?.id,
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
