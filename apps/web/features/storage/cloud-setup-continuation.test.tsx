import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import type { StorageSnapshot } from '@/service/storage-client'

import { useAuthStore } from '@/stores/auth-store'

import {
  CloudSetupContinuationProvider,
  useCloudSetupContinuation,
} from './cloud-setup-continuation'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => vi.restoreAllMocks())

it('cannot resurrect a discarded initialization handoff when its context arrives after READY', async () => {
  let finish!: (response: Response) => void
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  useAuthStore.setState({
    profile: 'cloud',
    isAuthenticated: true,
    token: null,
    sessionRevision: 0,
    apiFetch: fetcher,
  })
  let controls!: ReturnType<typeof useCloudSetupContinuation>
  function Observe() {
    controls = useCloudSetupContinuation()
    return null
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const snapshot: StorageSnapshot = {
    mode: 'CLOUD',
    clusterId: 'cluster',
    operationId: 'setup',
    setupGeneration: 1,
    bindingVersion: 1,
    authGeneration: 1,
    stateVersion: 2,
    setupPhase: 'COMPLETE',
    businessPhase: 'AUTH_READY',
    health: { CONFIG: 'AVAILABLE', CACHE: 'AVAILABLE', MASTER: 'UNKNOWN' },
    allowedActions: ['storage.status'],
    restartRequired: false,
  }
  try {
    await act(async () =>
      root.render(
        <CloudSetupContinuationProvider>
          <Observe />
        </CloudSetupContinuationProvider>,
      ),
    )
    let preparing!: Promise<void>
    await act(async () => {
      preparing = controls.prepare(snapshot)
    })
    // The storage gate has admitted the completed Cluster while the context request is still pending.
    await act(async () => controls.discard())
    await act(async () => {
      finish(
        Response.json({
          organizationId: 'org',
          clusterId: 'cluster',
          organizationName: 'Org',
          clusterName: 'Cluster',
          region: 'region',
          clusterState: 'READY',
        }),
      )
      await preparing.catch(() => {})
      useAuthStore.getState().clear()
    })
    expect(controls.intent).toBeUndefined()
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
