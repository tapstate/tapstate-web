export type StorageLayer = 'CONFIG' | 'CACHE' | 'MASTER'
export type StorageHealth = 'UNKNOWN' | 'AVAILABLE' | 'UNAVAILABLE' | 'AUTH_READY'
export type BusinessPhase =
  | 'NOT_CONFIGURED'
  | 'PREPARING'
  | 'RESTART_REQUIRED'
  | 'FIRST_ADMIN_REQUIRED'
  | 'AUTH_READY'
  | 'READY'
  | 'UNAVAILABLE'
  | 'AWAITING_REBUILD_CONFIRMATION'
  | 'RECOVERING'
  | 'CLEANUP_REQUIRED'
export interface StorageSnapshot {
  mode: 'OP' | 'CLOUD'
  clusterId: string
  operationId: string
  setupGeneration: number
  bindingVersion: number
  authGeneration: number
  stateVersion: number
  setupPhase: 'LOCAL_SETUP' | 'CONFIG_PREPARED' | 'STORAGE_BOUND' | 'COMPLETE'
  businessPhase: BusinessPhase
  health: Record<StorageLayer, StorageHealth>
  allowedActions: string[]
  restartRequired: boolean
}
export interface StorageConnection {
  kind: 'MONGODB' | 'ATLAS'
  uri: string
  database: string
  caPem?: string
}
export interface StorageCandidate {
  configuration?: StorageConnection
  cache: StorageConnection
  master: StorageConnection
}
export interface StorageTest {
  layer: StorageLayer
  testStamp: string
  expiresAt: string
  checks: string[]
}
export interface RecoveryPlan {
  operationId: string
  previousOperationId: string | null
  phase: string
  scope: 'CLUSTER' | 'PIPELINE'
  pipelineIds: string[]
  affectedPipelineIds: string[]
  controlRevision: number
  planHash: string
  preflightCurrent?: boolean
  targetPolicies?: { node: string; source: string; policy: 'APPEND' | 'CLEAR' | 'FAIL' }[]
  executionErrorCode?: string | null
  authGeneration?: number
}
export interface ImportReceipt {
  id: string
  resourceHashes: Record<string, string>
  usernames: string[]
  layoutIds: string[]
}
export interface ImportStatus {
  importId?: string
  phase: string
  ticket: { id: string; expiresAt: string } | null
  receipt: ImportReceipt | null
}
export interface ImportPreflight {
  operation: ImportStatus
  preparedTransfer: string
}
export interface ImportSubmission {
  transfer: string
  transferKey: string
  defaultSourceMapping: Record<string, string>
}

/** Only safe catalog identifiers leave the transport; arbitrary server messages can contain secrets. */
export class StorageClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly causeCode?: string,
  ) {
    super(code)
    this.name = 'StorageClientError'
  }
}

export async function storageRequest<T>(
  fetcher: typeof fetch,
  operation: string,
  body: object = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetcher(`/api/${operation.replaceAll('.', '/')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new StorageClientError('protocol', response.status)
  }
  if (signal?.aborted) throw new DOMException('Request superseded', 'AbortError')
  if (!response.ok) {
    const code =
      typeof result === 'object' &&
      result !== null &&
      'code' in result &&
      typeof result.code === 'string' &&
      /^[a-z]+\.[a-z-]+$/.test(result.code)
        ? result.code
        : 'unavailable'
    const cause =
      response.status === 400 &&
      code === 'control.storage-test-failed' &&
      typeof result === 'object' &&
      result !== null &&
      'params' in result &&
      typeof result.params === 'object' &&
      result.params !== null &&
      'causeCode' in result.params
        ? result.params.causeCode
        : undefined
    const causeCode =
      typeof cause === 'string' &&
      ['io.store-unauthorized', 'store.unreachable', 'store.database-access-failed'].includes(cause)
        ? cause
        : undefined
    throw new StorageClientError(code, response.status, causeCode)
  }
  return result as T
}

const phases: BusinessPhase[] = [
  'NOT_CONFIGURED',
  'PREPARING',
  'RESTART_REQUIRED',
  'FIRST_ADMIN_REQUIRED',
  'AUTH_READY',
  'READY',
  'UNAVAILABLE',
  'AWAITING_REBUILD_CONFIRMATION',
  'RECOVERING',
  'CLEANUP_REQUIRED',
]
export function validateSnapshot(value: StorageSnapshot): StorageSnapshot {
  if (
    !value ||
    !['OP', 'CLOUD'].includes(value.mode) ||
    !value.clusterId ||
    !value.operationId ||
    ![value.setupGeneration, value.bindingVersion, value.authGeneration, value.stateVersion].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    !['LOCAL_SETUP', 'CONFIG_PREPARED', 'STORAGE_BOUND', 'COMPLETE'].includes(value.setupPhase) ||
    !phases.includes(value.businessPhase) ||
    typeof value.restartRequired !== 'boolean' ||
    !Array.isArray(value.allowedActions) ||
    !value.allowedActions.every((a) => typeof a === 'string') ||
    !['CONFIG', 'CACHE', 'MASTER'].every((layer) =>
      ['UNKNOWN', 'AVAILABLE', 'UNAVAILABLE', 'AUTH_READY'].includes(
        value.health?.[layer as StorageLayer],
      ),
    )
  ) {
    throw new StorageClientError('protocol', 200)
  }
  return value
}

export function snapshotScope(value: StorageSnapshot): string {
  return JSON.stringify([
    value.clusterId,
    value.setupGeneration,
    value.bindingVersion,
    value.authGeneration,
    value.operationId,
  ])
}

/** Requests are serialized/cancelled by QueryClient. Reject regression but retain current health. */
export function acceptSnapshot(
  previous: StorageSnapshot | undefined,
  value: StorageSnapshot,
): StorageSnapshot {
  validateSnapshot(value)
  if (!previous) return value
  if (
    previous.clusterId !== value.clusterId ||
    previous.mode !== value.mode ||
    value.setupGeneration < previous.setupGeneration ||
    value.bindingVersion < previous.bindingVersion ||
    value.authGeneration < previous.authGeneration ||
    value.stateVersion < previous.stateVersion ||
    (previous.setupPhase === 'COMPLETE' && value.setupPhase !== 'COMPLETE')
  ) {
    throw new StorageClientError('stale', 409)
  }
  return value
}

export interface StorageForm {
  kind: 'MONGODB' | 'ATLAS'
  uri: string
  configDatabase: string
  cacheDatabase: string
  masterDatabase: string
  configCaPem: string
  cacheCaPem: string
}
export function storageCandidate(
  form: StorageForm,
  mode: StorageSnapshot['mode'],
): StorageCandidate {
  const kind = mode === 'CLOUD' ? 'ATLAS' : form.kind
  const connection = (database: string, caPem = ''): StorageConnection => ({
    kind,
    uri: form.uri,
    database,
    ...(caPem.trim() ? { caPem } : {}),
  })
  return {
    ...(mode === 'OP' ? { configuration: connection(form.configDatabase, form.configCaPem) } : {}),
    cache: connection(form.cacheDatabase, form.cacheCaPem),
    master: connection(form.masterDatabase),
  }
}
