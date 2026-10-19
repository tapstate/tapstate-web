import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { AuthPage } from '../features/auth/auth-page'
import { cloudApi } from '../service/cloud-api'
import { useCloudAppState } from '../state/cloud-app-state'

function AuthRoute() {
  const navigate = useNavigate()
  const { darkMode, setDarkMode, setIdentity } = useCloudAppState()
  const [authContext] = useState(() => {
    if (typeof window === 'undefined') return { invitationToken: null, oauthOutcome: undefined }
    const url = new URL(window.location.href)
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
    const invitationToken =
      fragment.get('invite') ??
      url.searchParams.get('invite') ??
      url.searchParams.get('invitationToken')
    const oauthOutcome = url.searchParams.get('oauth') ?? undefined
    return { invitationToken, oauthOutcome }
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    if (
      url.searchParams.has('invite') ||
      url.searchParams.has('invitationToken') ||
      url.searchParams.has('oauth') ||
      url.hash.startsWith('#invite=')
    ) {
      url.searchParams.delete('invite')
      url.searchParams.delete('invitationToken')
      url.searchParams.delete('oauth')
      if (url.hash.startsWith('#invite=')) url.hash = ''
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      )
    }
  }, [])

  return (
    <AuthPage
      darkMode={darkMode}
      invitationToken={authContext.invitationToken}
      oauthOutcome={authContext.oauthOutcome}
      onAuthenticated={async (user) => {
        setIdentity(user, [])
        await navigate({ to: '/', search: { organizationId: undefined } })
      }}
      onAcceptInvitation={cloudApi.acceptInvitation}
      onAccessType={cloudApi.accessType}
      onCurrentSession={cloudApi.me}
      onLogin={(input) => cloudApi.login(input)}
      onOAuth={async (provider, mode, invitationToken, organizationName) => {
        const authorizationUrl = await cloudApi.oauthStart(
          provider,
          mode === 'register' ? 'signup' : 'login',
          invitationToken ?? undefined,
          organizationName,
        )
        window.location.assign(authorizationUrl)
      }}
      onRegisterWithEmail={cloudApi.registerWithEmailCode}
      onRequestCode={(email, token) => cloudApi.requestEmailCode(email, token)}
      setDarkMode={setDarkMode}
    />
  )
}

export const Route = createFileRoute('/auth')({ component: AuthRoute })
