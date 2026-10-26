import { AuthClientError, type LoginCredentials } from './auth-client'

export interface BrowserAccessGrant {
  token: string
  accessExpiresAt: string
  principal: string
  issuer: string
  sessionId: string
  scopes: string[]
}

export async function browserAuthRequest(
  action: 'login' | 'session' | 'logout',
  fetcher: typeof fetch,
  credentials?: LoginCredentials,
): Promise<BrowserAccessGrant | null> {
  const controller = new AbortController()
  const timeout = action === 'session' ? setTimeout(() => controller.abort(), 15_000) : null
  try {
    return await request(action, fetcher, credentials, controller.signal)
  } finally {
    if (timeout !== null) clearTimeout(timeout)
  }
}

async function request(
  action: 'login' | 'session' | 'logout',
  fetcher: typeof fetch,
  credentials: LoginCredentials | undefined,
  signal: AbortSignal,
): Promise<BrowserAccessGrant | null> {
  let response: Response
  try {
    response = await fetcher(`/auth/browser/${action}`, {
      method: 'POST',
      signal,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Tapstate-Browser-Request': '1' },
      ...(credentials ? { body: JSON.stringify(credentials) } : {}),
    })
  } catch (error) {
    throw new AuthClientError(
      'network',
      error instanceof Error ? error.message : 'session unavailable',
    )
  }
  if (action === 'logout' && response.status === 204) return null
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code =
      payload &&
      typeof payload === 'object' &&
      'code' in payload &&
      typeof payload.code === 'string'
        ? payload.code
        : null
    throw new AuthClientError('auth', 'session request refused', code, response.status)
  }
  if (!payload || typeof payload !== 'object')
    throw new AuthClientError('protocol', 'invalid session response')
  const grant = payload as Record<string, unknown>
  if (
    !['token', 'principal', 'issuer', 'sessionId', 'accessExpiresAt'].every(
      (key) => typeof grant[key] === 'string' && grant[key],
    ) ||
    !Number.isFinite(Date.parse(String(grant.accessExpiresAt))) ||
    !Array.isArray(grant.scopes) ||
    !grant.scopes.every((scope) => typeof scope === 'string')
  ) {
    throw new AuthClientError('protocol', 'invalid session response')
  }
  return grant as unknown as BrowserAccessGrant
}
