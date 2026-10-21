import { describe, expect, it, vi } from 'vitest'

import {
  acceptSnapshot,
  storageCandidate,
  storageRequest,
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
