import { describe, expect, it, vi } from 'vitest'

import {
  acceptSnapshot,
  storageCandidate,
  storageRequest,
  StorageClientError,
  type StorageSnapshot,
} from './storage-client'

export function snapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  return {
    mode: 'OP',
    clusterId: 'cluster-a',
    operationId: 'setup-a',
    setupGeneration: 1,
    bindingVersion: 1,
    authGeneration: 1,
    stateVersion: 10,
    setupPhase: 'COMPLETE',
    businessPhase: 'READY',
    health: { CONFIG: 'AVAILABLE', CACHE: 'AVAILABLE', MASTER: 'UNKNOWN' },
    allowedActions: ['storage.status'],
    restartRequired: false,
    ...overrides,
  }
}
describe('storage wire and snapshot admission', () => {
  it('classifies a non-JSON gateway timeout as an unavailable response', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('<html>Gateway timeout</html>', { status: 504 }),
    )
    await expect(storageRequest(fetcher, 'storage.setup.commit', {})).rejects.toMatchObject({
      code: 'unavailable',
      status: 504,
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  const initialization = (): NonNullable<StorageSnapshot['initializationProgress']> => ({
    operationId: 'setup-a',
    generation: 1,
    attemptId: 'attempt-1',
    state: 'RUNNING',
    observedAt: '2026-10-27T00:00:00Z',
    elapsedMillis: 6000,
    restored: true,
    milestones: [
      { id: 'SAVE_SETTINGS', state: 'COMPLETE', elapsedMillis: null, errorCode: null },
      { id: 'PREPARE_STORAGE', state: 'COMPLETE', elapsedMillis: null, errorCode: null },
      { id: 'START_RUNTIME', state: 'RUNNING', elapsedMillis: 6000, errorCode: null },
      { id: 'PUBLISH_READY', state: 'PENDING', elapsedMillis: null, errorCode: null },
    ],
    connectionChecks: [],
  })
  it('accepts unknown historical timings but refuses mismatched and regressing initialization evidence', () => {
    const before = snapshot({ initializationProgress: initialization() })
    expect(acceptSnapshot(undefined, before)).toBe(before)
    for (const changed of [{ operationId: 'other' }, { generation: 2 }, { elapsedMillis: -1 }])
      expect(() =>
        acceptSnapshot(
          undefined,
          snapshot({ initializationProgress: { ...initialization(), ...changed } }),
        ),
      ).toThrow(StorageClientError)
    expect(() =>
      acceptSnapshot(
        before,
        snapshot({ initializationProgress: { ...initialization(), elapsedMillis: 5000 } }),
      ),
    ).toThrow(StorageClientError)
    expect(
      acceptSnapshot(
        before,
        snapshot({
          initializationProgress: {
            ...initialization(),
            attemptId: 'new-process',
            elapsedMillis: 0,
          },
        }),
      ).initializationProgress?.restored,
    ).toBe(true)
  })
  it('does not accept a fabricated completed count or duplicate connection-check layer', () => {
    const wrong = initialization()
    wrong.milestones[3] = { ...wrong.milestones[3], state: 'COMPLETE' }
    expect(() => acceptSnapshot(undefined, snapshot({ initializationProgress: wrong }))).toThrow(
      StorageClientError,
    )
    const duplicated = initialization()
    duplicated.connectionChecks = [
      { layer: 'CACHE', checkedAt: duplicated.observedAt },
      { layer: 'CACHE', checkedAt: duplicated.observedAt },
    ]
    expect(() =>
      acceptSnapshot(undefined, snapshot({ initializationProgress: duplicated })),
    ).toThrow(StorageClientError)
  })
  it('retains the real report time and accepts a newer failure at the same configuration version', () => {
    const verification = {
      status: 'PASSED' as const,
      checkedAt: '2026-10-26T02:00:00Z',
      validUntil: '2026-10-26T02:10:00Z',
    }
    const before = snapshot({ applicationDataVerification: verification })
    const after = snapshot({
      applicationDataVerification: {
        ...verification,
        status: 'FAILED',
        checkedAt: '2026-10-26T02:01:00Z',
        validUntil: '2026-10-26T02:11:00Z',
      },
    })
    expect(acceptSnapshot(before, after)).toBe(after)
  })
  it.each([
    { status: 'PASSED', checkedAt: null, validUntil: null },
    { status: 'PASSED', checkedAt: 'invalid', validUntil: '2026-10-26T02:10:00Z' },
    { status: 'PASSED', checkedAt: '2026-10-26T02:11:00Z', validUntil: '2026-10-26T02:10:00Z' },
    { status: 'UNKNOWN', checkedAt: '2026-10-26T02:00:00Z', validUntil: null },
  ])('refuses malformed verification timestamps %j', (value) => {
    expect(() =>
      acceptSnapshot(
        undefined,
        snapshot({
          applicationDataVerification: value as StorageSnapshot['applicationDataVerification'],
        }),
      ),
    ).toThrow(StorageClientError)
  })
  it('accepts current degraded health without rolling back completion', () => {
    const next = snapshot({
      businessPhase: 'UNAVAILABLE',
      health: { CONFIG: 'AVAILABLE', CACHE: 'UNAVAILABLE', MASTER: 'UNKNOWN' },
    })
    expect(acceptSnapshot(snapshot(), next)).toBe(next)
  })
  it.each([
    { stateVersion: 9 },
    { authGeneration: 0 },
    { bindingVersion: 0 },
    { clusterId: 'other' },
    { setupPhase: 'STORAGE_BOUND' as const },
  ])('rejects a stale or mismatched snapshot %j', (value) => {
    expect(() => acceptSnapshot(snapshot(), snapshot(value))).toThrow()
  })
  it('permits a new recovery operation at a newer generation', () => {
    expect(
      acceptSnapshot(
        snapshot(),
        snapshot({ operationId: 'recovery', authGeneration: 2, stateVersion: 11 }),
      ).operationId,
    ).toBe('recovery')
  })
  it('omits platform CONFIG and master custom trust from Cloud input', () => {
    const candidate = storageCandidate(
      {
        kind: 'MONGODB',
        uri: 'mongodb+srv://user:secret@host/admin',
        configDatabase: 'config',
        cacheDatabase: 'cache',
        masterDatabase: 'master',
        configCaPem: 'config pem',
        cacheCaPem: 'cache pem',
      },
      'CLOUD',
    )
    expect(candidate).not.toHaveProperty('configuration')
    expect(candidate.cache).toMatchObject({ kind: 'ATLAS', caPem: 'cache pem' })
    expect(candidate.master).not.toHaveProperty('caPem')
  })
  it('retains the dependency code but never arbitrary diagnostic text', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { code: 'control.storage-unavailable', message: 'mongodb://user:secret@host' },
        { status: 503 },
      ),
    )
    await expect(storageRequest(fetcher, 'storage.status')).rejects.toMatchObject({
      code: 'control.storage-unavailable',
      status: 503,
      message: 'control.storage-unavailable',
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/storage/status',
      expect.objectContaining({ method: 'POST', body: '{}', cache: 'no-store' }),
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('discards a late successful response after query cancellation', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>(async () => {
      controller.abort()
      return Response.json(snapshot())
    })
    await expect(
      storageRequest(fetcher, 'storage.status', {}, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('storage connection diagnostics', () => {
  it.each(['io.store-unauthorized', 'store.unreachable', 'store.database-access-failed'])(
    'retains the safe database failure category %s without arbitrary server details',
    async (causeCode) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json(
          {
            code: 'control.storage-test-failed',
            params: { causeCode, layer: 'CACHE', uri: 'mongodb://user:secret@host' },
            message: 'unsafe-secret-message',
          },
          { status: 400 },
        ),
      )
      const failure = await storageRequest(fetcher, 'storage.test').catch((error) => error)
      expect(failure).toBeInstanceOf(StorageClientError)
      if (!(failure instanceof StorageClientError))
        throw new Error('Expected a typed storage failure')
      expect(failure.causeCode).toBe(causeCode)
      expect(JSON.stringify(failure)).not.toMatch(/user:secret|unsafe-secret-message|mongodb/)
    },
  )
  it.each([
    ['control.storage-test-failed', 'mongodb://user:secret@host'],
    ['control.storage-test-failed', 'vendor.unverified-error'],
    ['control.storage-unavailable', 'io.store-unauthorized'],
  ])('drops unrecognized or unrelated cause metadata %s', async (code, causeCode) => {
    const failure = await storageRequest(
      async () => Response.json({ code, params: { causeCode } }, { status: 400 }),
      'storage.test',
    ).catch((error) => error)
    expect(failure).toBeInstanceOf(StorageClientError)
    if (!(failure instanceof StorageClientError))
      throw new Error('Expected a typed storage failure')
    expect(failure.causeCode).toBeUndefined()
  })
})
