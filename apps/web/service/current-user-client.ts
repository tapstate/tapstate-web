import type { ApiFetcher } from './source-client'

export interface CurrentUserView {
  mode: string
  principal: string
  scopes: string[]
  username: string | null
  email: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getCurrentUser(fetcher: ApiFetcher = fetch): Promise<CurrentUserView> {
  const response = await fetcher('/api/auth/me', { cache: 'no-store' })
  if (!response.ok) throw new Error('Current user could not be loaded.')

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Current user response was invalid.')
  }

  if (
    !isRecord(payload) ||
    typeof payload.mode !== 'string' ||
    typeof payload.principal !== 'string' ||
    (payload.username != null && typeof payload.username !== 'string') ||
    (payload.email != null && typeof payload.email !== 'string') ||
    !Array.isArray(payload.scopes) ||
    !payload.scopes.every((scope) => typeof scope === 'string')
  ) {
    throw new Error('Current user response was invalid.')
  }

  return {
    mode: payload.mode,
    principal: payload.principal,
    scopes: payload.scopes,
    username: payload.username ?? null,
    email: payload.email ?? null,
  }
}
