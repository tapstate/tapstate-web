import type { ApiFetcher } from './source-client'

export interface AlarmRow {
  key: string
  episode: number
  typeId: string
  resource: { kind: string; id: string; incarnation: string }
  severity: string
  silenced?: boolean
  inhibited?: boolean
  status: string
  quality?: string
  firedAt: string
  observedAt?: string
  endedAt?: string
  endReason?: string
  recoveredAt?: string
  condition?: string
  recovery?: string
  guidance?: string
  durationSeconds?: number
  thresholds?: Record<string, number> | null
  basis?: Record<string, string | number | null>
  diagnostics?: { status: string; text?: string; truncated?: boolean; observedAt?: string }
}
export interface DeliveryRow {
  candidateId?: string
  id: string
  etag: string
  channel: string
  outcome: string
  target?: string | null
  title?: string | null
  resources?: string[]
  createdAt?: string
  displayState: string
  deadline: string
  nextAttemptAt?: string
  stopped: boolean
  canRetry?: boolean
  attempts: number
  source?: string
  eventId?: string
  diagnostic?: { phase: string; action: string; status: number } | null
  attemptHistory?: {
    number: number
    outcome: string
    endedAt?: string
    phase?: string
    status?: number
  }[]
}
export interface AlertPage<T> {
  rows: T[]
  total?: number
  nextCursor?: string | null
  isolated?: boolean
  refreshedAt?: string
}
export interface AlertType {
  kind?: 'STATEFUL' | 'EVENT'
  id: string
  version: number
  resourceKinds: string[]
  severity: string
  enabledByDefault: boolean
  inputAvailable: boolean
  condition?: string
  recovery?: string
  guidance?: string
  parameters: {
    name: string
    kind?: 'DURATION_SECONDS' | 'DECIMAL'
    unit: string
    minimum: number
    maximum: number
    defaultValue: number
  }[]
}
export interface AlertChannelDescriptor {
  id: string
  version: number
  label: string
  transportFamily: 'EMAIL' | 'HTTPS_JSON'
  transportVersion: number
  fields: {
    key: string
    label: string
    maximumBytes: number
    required: boolean
    defaultValue?: string | null
  }[]
}
export const defaultExternalChannels: AlertChannelDescriptor[] = [
  {
    id: 'email',
    version: 1,
    label: 'Email',
    transportFamily: 'EMAIL',
    transportVersion: 1,
    fields: [],
  },
  {
    id: 'webhook',
    version: 1,
    label: 'Webhook',
    transportFamily: 'HTTPS_JSON',
    transportVersion: 1,
    fields: [],
  },
]
export interface Catalog {
  channels?: AlertChannelDescriptor[]
  clusterId?: string
  refreshedAt?: string
  channelPolicies?: Record<
    string,
    {
      timeoutSeconds: number
      attempts: number
      maximumAgeSeconds: number
      retryDelaysSeconds: number[]
    }
  >
  deployment: string
  types: AlertType[]
}
export interface MaintenanceHealth {
  available: boolean
  degraded: boolean
  warning: boolean
  capacitySampleStale: boolean
  capacityMeasuredAt?: string
  logicalBytes?: number
  admissionReservedBytes?: number
  capacityBytes: number
  pending?: number
  oldestPendingAgeSeconds?: number
  failed?: number
  exhausted?: number
  pressure: 'NORMAL' | 'WARNING' | 'PAUSED' | 'FULL'
  lastSuccess?: string
  cadenceSeconds: number
  changed: number
  failures: number
  oldestCandidateAgeSeconds: number
  skipped: Record<string, number>
}
export interface Health {
  deployment?: string
  degraded: boolean
  closed: boolean
  code?: string
  coverage: string[]
  cleanupAvailable: boolean
  evaluationLagMillis?: number
  lastEvaluatedAt?: string
  maintenance?: MaintenanceHealth
  refreshedAt: string
  rejected: number
  queuedInputs: number
}
export interface Messages {
  titlePrefix: string
  titleSuffix: string
  messageNote: string
  footerText: string
}
export interface Channel {
  channelType: string
  receivers: string[]
  messages: Messages
}
export interface AlertForm {
  id: string
  etag?: string
  kind: string
  name?: string
  enabled?: boolean
  active?: boolean
  typeId?: string
  typeVersion?: number
  resourceKinds?: string[]
  allResources?: boolean
  resources?: { kind: string; id: string; incarnation: string }[]
  parameters?: Record<string, number>
  severity?: string
  typeIds?: string[]
  severities?: string[]
  groupBy?: string[]
  initialWaitSeconds?: number
  changeIntervalSeconds?: number
  repeatIntervalSeconds?: number
  channels?: Channel[]
  inhibition?: { rootType: string; dependentType: string }[]
  transport?: {
    channelType: string
    family?: 'HTTPS_JSON'
    transportVersion?: number
    parameters?: Record<string, string>
    host?: string
    port?: number
    encryption?: string
    authentication: string
    trust: string
    username?: string | null
    from?: string
    recipients?: string[]
    principal?: string | null
    origin?: string
  }
  endpoint?: string
  secret?: string
  privateCa?: string
  retainMaterial?: boolean
  reason?: string
  startsAt?: string
  durationSeconds?: number
  periodSeconds?: number | null
  endsAt?: string | null
}
export class AlertClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}
export async function alertCall<T>(
  apiFetch: ApiFetcher,
  path: string,
  input: object = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiFetch(`/api/alerts/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: string }
    throw new AlertClientError(body.code ?? 'request-failed', response.status)
  }
  return response.json() as Promise<T>
}
export const emptyMessages = (): Messages => ({
  titlePrefix: '',
  titleSuffix: '',
  messageNote: '',
  footerText: '',
})
export function testCommandId(now = Date.now()) {
  return `act1.${Math.floor(now / 1000)}.${crypto.randomUUID().replaceAll('-', '')}`
}
