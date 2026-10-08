import { createFileRoute, redirect } from '@tanstack/react-router'

import type { UserProfile } from '../types'

import { useClusterEntry } from '../features/clusters/use-cluster-entry'
import { OnboardingPage } from '../features/onboarding/onboarding-page'
import { createOnboardingWorkspace } from '../features/onboarding/onboarding-service'
import { CloudApiError, cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

function OnboardingRoute() {
  const { user } = Route.useLoaderData()
  const { completeOnboarding, darkMode, setDarkMode } = useCloudAppState()
  const { enterCluster, enteringId, entryError } = useClusterEntry()

  return (
    <OnboardingPage
      darkMode={darkMode}
      onComplete={(organization, cluster) => {
        completeOnboarding(user, organization, cluster)
        void enterCluster(cluster, organization.id)
      }}
      onCreateWorkspace={createOnboardingWorkspace}
      setDarkMode={setDarkMode}
      user={user}
      isOpeningCluster={enteringId !== null}
      entryError={entryError}
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
