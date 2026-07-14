export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResult {
  token: string
}

export type AuthClientErrorKind = 'auth' | 'network' | 'protocol'

export class AuthClientError extends Error {
  readonly kind: AuthClientErrorKind
  readonly code: string | null
  readonly status: number | null

  constructor(kind: AuthClientErrorKind, message: string, code: string | null = null, status: number | null = null) {
    super(message)
    this.name = 'AuthClientError'
    this.kind = kind
    this.code = code
    this.status = status
  }
}

interface LoginResponseBody {
  token?: unknown
}

interface ApiErrorBody {
  code?: unknown
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

function endpoint(path: string) {
  return `${API_BASE_URL}${path}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  }
  catch {
    return null
  }
}

export async function login(
  credentials: LoginCredentials,
  fetcher: typeof fetch = fetch,
): Promise<LoginResult> {
  let response: Response

  try {
    response = await fetcher(endpoint('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
  }
  catch (error) {
    throw new AuthClientError(
      'network',
      error instanceof Error ? error.message : 'network request failed',
    )
  }

  const payload = await parseJson(response)

  if (!response.ok) {
    const code = isRecord(payload) && typeof (payload as ApiErrorBody).code === 'string'
      ? (payload as ApiErrorBody).code as string
      : null
    throw new AuthClientError('auth', 'authentication was refused', code, response.status)
  }

  if (!isRecord(payload) || typeof (payload as LoginResponseBody).token !== 'string' || !(payload as LoginResponseBody).token) {
    throw new AuthClientError('protocol', 'login response did not contain a token', null, response.status)
  }

  return { token: (payload as LoginResponseBody).token as string }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  token: string | null,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (token)
    headers.set('Authorization', `Bearer ${token}`)

  return fetcher(input, { ...init, headers })
}
