import { describe, expect, it } from 'vitest'

import { getWebBuildInputs } from './web-build-inputs'

describe('Web producer inputs', () => {
  it('marks the explicit local Cloud profile with the same validated browser URL', () => {
    expect(
      getWebBuildInputs('cloud', {
        TAPSTATE_LOCAL_DEVELOPMENT: 'true',
        VITE_CLOUD_CONSOLE_URL: 'http://localhost:28175',
      }),
    ).toEqual({
      schemaVersion: 1,
      profile: 'cloud',
      purpose: 'local-development',
      cloudConsoleUrl: 'http://localhost:28175/',
    })
  })

  it('keeps ordinary Cloud HTTPS and never accepts an independently supplied browser flag', () => {
    expect(getWebBuildInputs('cloud', {}).purpose).toBe('release')
    expect(() =>
      getWebBuildInputs('cloud', {
        VITE_LOCAL_DEVELOPMENT: 'true',
        VITE_CLOUD_CONSOLE_URL: 'http://localhost:28175',
      }),
    ).toThrow()
    expect(() =>
      getWebBuildInputs('cloud', {
        TAPSTATE_LOCAL_DEVELOPMENT: 'true',
        VITE_CLOUD_CONSOLE_URL: 'http://remote.example:28175',
      }),
    ).toThrow()
    expect(() => getWebBuildInputs('cloud', { TAPSTATE_LOCAL_DEVELOPMENT: 'yes' })).toThrow()
  })

  it('does not inject a Cloud URL or profile into local OP artifacts', () => {
    expect(
      getWebBuildInputs('onprem', {
        TAPSTATE_LOCAL_DEVELOPMENT: 'true',
        VITE_CLOUD_CONSOLE_URL: 'http://unused.example:28175',
      }),
    ).toEqual({ schemaVersion: 1, profile: 'op', purpose: 'local-development' })
  })
})
