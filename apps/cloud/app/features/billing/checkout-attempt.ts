export interface CheckoutAttempt {
  orgId: string
  subscriptionId: string
  specKey: string
  clientRequestId: string
  startedAt: string
  region?: string
  clusterName?: string
}

const STORAGE_KEY = 'tapstate.cloud.checkout-attempt'

export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function isAttempt(value: unknown): value is CheckoutAttempt {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.orgId === 'string' &&
    typeof candidate.subscriptionId === 'string' &&
    typeof candidate.specKey === 'string' &&
    typeof candidate.clientRequestId === 'string' &&
    typeof candidate.startedAt === 'string' &&
    (candidate.region === undefined || typeof candidate.region === 'string') &&
    (candidate.clusterName === undefined || typeof candidate.clusterName === 'string')
  )
}

export function rememberCheckoutAttempt(attempt: CheckoutAttempt): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt))
  } catch {
    // Session storage is optional: checkout still works, only reload recovery is lost.
  }
}

export function readCheckoutAttempt(): CheckoutAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAttempt(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearCheckoutAttempt(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
