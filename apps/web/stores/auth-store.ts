import { create } from 'zustand'

import { authenticatedFetch } from '@/service/auth-client'

import {
  browserSessionStorage,
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from './auth-session'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  clear: () => void
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const storage = browserSessionStorage()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: loadStoredToken(storage),
  isAuthenticated: Boolean(loadStoredToken(storage)),
  setToken: (token) => {
    saveStoredToken(storage, token)
    set({ token, isAuthenticated: true })
  },
  clear: () => {
    clearStoredToken(storage)
    set({ token: null, isAuthenticated: false })
  },
  apiFetch: async (input, init = {}) => {
    const response = await authenticatedFetch(input, init, get().token)
    if (response.status === 401) {
      get().clear()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login')
        window.location.assign('/login')
    }
    return response
  },
}))
