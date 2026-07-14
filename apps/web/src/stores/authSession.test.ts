import {
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from './authSession.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const storage = new MemoryStorage()

if (loadStoredToken(storage) !== null) {
  throw new Error('a fresh session must not contain a token')
}

saveStoredToken(storage, 'session-token')

if (loadStoredToken(storage) !== 'session-token') {
  throw new Error('the session token must round-trip through session storage')
}

clearStoredToken(storage)

if (loadStoredToken(storage) !== null) {
  throw new Error('clearing the session must remove the token')
}
