import { describe, expect, it } from 'vitest'
import { AUTH_TOKEN_KEY, clearStoredToken, loadStoredToken, saveStoredToken } from './auth-session'

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value),
  }
}

describe('auth session storage', () => {
  it('persists and clears the auth token', () => {
    const storage = memoryStorage()

    expect(loadStoredToken(storage)).toBeNull()
    saveStoredToken(storage, 'token-123')

    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('token-123')
    expect(loadStoredToken(storage)).toBe('token-123')

    clearStoredToken(storage)
    expect(loadStoredToken(storage)).toBeNull()
  })
})
