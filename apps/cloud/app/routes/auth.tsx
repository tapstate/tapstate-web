import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AuthPage } from '../features/auth/auth-page'
import { clusterEntrySearch } from '../features/clusters/cluster-entry-intent'
import { cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

function AuthRoute() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { darkMode, setDarkMode, setIdentity } = useCloudAppState()

  return (
    <AuthPage
      darkMode={darkMode}
      onAuthenticated={async (user) => {
        setIdentity(user, [])
        await navigate({ to: '/', search })
      }}
      onLogin={(input) => cloudApi.login(input)}
      onRegister={async (input) => {
        await cloudApi.register(input)
        return cloudApi.login(input)
      }}
      setDarkMode={setDarkMode}
    />
  )
}

export const Route = createFileRoute('/auth')({
  validateSearch: clusterEntrySearch,
  component: AuthRoute,
})
