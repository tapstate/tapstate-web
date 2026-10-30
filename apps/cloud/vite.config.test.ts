import type { ProxyOptions } from 'vite'

// @vitest-environment node
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import config from './vite.config'

let envDir: string
beforeEach(() => {
  envDir = mkdtempSync(join(tmpdir(), 'cloud-origin-proxy-test-'))
  vi.stubEnv('TAPSTATE_LOCAL_PREVIEW_ENV_DIR', envDir)
  vi.stubEnv('CLOUD_PROXY_TARGET', 'https://backend.example.invalid')
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(envDir, { recursive: true, force: true })
})

describe.each(['/v1/api', '/v2/api'])('Cloud proxy %s', (prefix) => {
  const proxy = async () => {
    if (typeof config !== 'function') throw new Error('Expected a config factory')
    const resolved = await config({ command: 'serve', mode: 'test' })
    const options = resolved.server?.proxy?.[prefix] as ProxyOptions
    expect(options.target).toBe('https://backend.example.invalid')
    const emitter = new EventEmitter()
    options.configure?.(emitter as never, options)
    return emitter
  }

  it('rewrites only the matching local browser origin', async () => {
    const emitter = await proxy()
    const setHeader = vi.fn()
    emitter.emit(
      'proxyReq',
      { setHeader },
      {
        headers: { host: 'localhost:5174', origin: 'http://localhost:5174' },
        socket: {},
      },
    )
    expect(setHeader).toHaveBeenCalledExactlyOnceWith('origin', 'https://backend.example.invalid')
  })

  it('preserves a foreign origin for backend rejection', async () => {
    const emitter = await proxy()
    const setHeader = vi.fn()
    emitter.emit(
      'proxyReq',
      { setHeader },
      {
        headers: { host: 'localhost:5174', origin: 'https://foreign.example.invalid' },
        socket: {},
      },
    )
    expect(setHeader).not.toHaveBeenCalled()
  })

  it('does not invent a missing origin', async () => {
    const emitter = await proxy()
    const setHeader = vi.fn()
    emitter.emit('proxyReq', { setHeader }, { headers: { host: 'localhost:5174' }, socket: {} })
    expect(setHeader).not.toHaveBeenCalled()
  })
})
