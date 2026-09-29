import { create } from 'zustand'

import { authenticatedFetch, cloudSessionFetch, logoutCloudSession } from '@/service/auth-client'
import { cloudConsoleUrl, replaceWithCloudConsole } from '@/utils/cloud-console'
import { deploymentProfile, type DeploymentProfile } from '@/utils/deployment-profile'

import {
  browserSessionStorage,
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from './auth-session'

interface AuthState {
  profile: DeploymentProfile
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  clear: () => void
  logout: () => Promise<void>
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

interface AuthStoreOptions {
  profile?: DeploymentProfile
  storage?: Storage | null
  fetcher?: typeof fetch
  origin?: string
  cloudConsoleUrl?: string
  redirectToCloudConsole?: (url: string) => void
}

export function createAuthStore(options: AuthStoreOptions = {}) {
  const profile = options.profile ?? deploymentProfile
  const storage = options.storage === undefined ? browserSessionStorage() : options.storage
  const fetcher = options.fetcher ?? fetch
  const consoleUrl = options.cloudConsoleUrl ?? cloudConsoleUrl
  const redirectToCloud = options.redirectToCloudConsole ?? replaceWithCloudConsole
  const storedToken = profile === 'on-prem' ? loadStoredToken(storage) : null

  return create<AuthState>((set, get) => ({
    profile,
    token: storedToken,
    isAuthenticated: profile === 'cloud' || Boolean(storedToken),
    setToken: (token) => {
      if (profile === 'cloud') return
      saveStoredToken(storage, token)
      set({ token, isAuthenticated: true })
    },
    clear: () => {
      if (profile === 'on-prem') clearStoredToken(storage)
      set({ token: null, isAuthenticated: false })
    },
    logout: async () => {
      if (profile === 'cloud') {
        try {
          await logoutCloudSession(fetcher, options.origin)
        } finally {
          set({ token: null, isAuthenticated: false })
          redirectToCloud(consoleUrl)
        }
        return
      }
      get().clear()
    },
    apiFetch: async (input, init = {}) => {
      const response =
        profile === 'cloud'
          ? await cloudSessionFetch(input, init, fetcher, options.origin)
          : await authenticatedFetch(input, init, get().token, fetcher)
      if (response.status === 401) {
        get().clear()
        if (profile === 'cloud') redirectToCloud(consoleUrl)
      }
      return response
    },
  }))
}

export const useAuthStore = createAuthStore()
