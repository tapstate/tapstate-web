import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authenticatedFetch } from '@/services/authClient'
import {
  browserSessionStorage,
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from './authSession'

export const useAuthStore = defineStore('auth', () => {
  const storage = browserSessionStorage()
  const token = ref<string | null>(loadStoredToken(storage))
  const isAuthenticated = computed(() => Boolean(token.value))

  function setToken(nextToken: string) {
    saveStoredToken(storage, nextToken)
    token.value = nextToken
  }

  function clear() {
    clearStoredToken(storage)
    token.value = null
  }

  async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const response = await authenticatedFetch(input, init, token.value)
    if (response.status === 401) {
      clear()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login')
        window.location.assign('/login')
    }
    return response
  }

  return { token, isAuthenticated, setToken, clear, apiFetch }
})
