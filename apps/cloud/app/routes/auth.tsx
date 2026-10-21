import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AuthPage } from '../features/auth/auth-page'
import { cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

function AuthRoute() {
  const navigate = useNavigate()
  const { darkMode, setDarkMode, setIdentity } = useCloudAppState()

  return (
    <AuthPage
      darkMode={darkMode}
      onAuthenticated={async (user) => {
        setIdentity(user, [])
        await navigate({ to: '/', search: { organizationId: undefined } })
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

export const Route = createFileRoute('/auth')({ component: AuthRoute })
