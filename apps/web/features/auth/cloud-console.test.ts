import { describe, expect, it } from 'vitest'

import { getCloudConsoleUrl } from '@/utils/cloud-console'

describe('Cloud Console return URL', () => {
  it('uses the preview origin for local hosts and configured URL for custom hosts', () => {
    expect(getCloudConsoleUrl(undefined, 'localhost')).toBe('https://dev.cloud.tapstate.com/')
    expect(getCloudConsoleUrl('https://cloud.example.com/console', 'console.example.com')).toBe(
      'https://cloud.example.com/console',
    )
  })

  it('returns production clusters to production regardless of the build URL', () => {
    expect(
      getCloudConsoleUrl(
        'https://dev.cloud.tapstate.com/',
        '6acf1f5b9979e743f55b5a4b.cloud.tapstate.com',
      ),
    ).toBe('https://cloud.tapstate.com/')
  })

  it('returns dev clusters to dev regardless of the build URL', () => {
    expect(
      getCloudConsoleUrl('https://cloud.tapstate.com/', 'cluster-a.dev.cloud.tapstate.com'),
    ).toBe('https://dev.cloud.tapstate.com/')
  })

  it('rejects insecure or credential-bearing return URLs', () => {
    expect(() => getCloudConsoleUrl('http://cloud.example.com', 'localhost')).toThrow()
    expect(() => getCloudConsoleUrl('https://user:secret@cloud.example.com', 'localhost')).toThrow()
    expect(() => getCloudConsoleUrl('https://cloud.example.com/#token', 'localhost')).toThrow()
  })

  it('allows only explicit literal localhost origins in a local development bundle', () => {
    expect(getCloudConsoleUrl('http://localhost:28175', 'localhost', true)).toBe(
      'http://localhost:28175/',
    )
    expect(getCloudConsoleUrl('http://localhost:80/', 'localhost', true)).toBe(
      'http://localhost:80/',
    )
    for (const value of [
      undefined,
      'http://127.0.0.1:28175',
      'http://remote.example:28175',
      'http://localhost:0',
      'http://localhost:65536',
      'http://localhost:028175',
      'http://user:secret@localhost:28175',
      'http://localhost:28175/path',
      'http://localhost:28175?code=x',
      'http://localhost:28175#code',
    ]) {
      expect(() => getCloudConsoleUrl(value, 'localhost', true)).toThrow()
    }
    expect(() => getCloudConsoleUrl('http://localhost:28175', 'localhost', false)).toThrow()
  })
})
