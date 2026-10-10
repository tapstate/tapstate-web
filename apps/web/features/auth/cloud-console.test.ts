import { describe, expect, it } from 'vitest'

import { getCloudConsoleUrl } from '@/utils/cloud-console'

describe('Cloud Console return URL', () => {
  it('uses the Week 2 preview origin unless the package supplies another HTTPS URL', () => {
    expect(getCloudConsoleUrl(undefined)).toBe('https://dev.cloud.tapstate.com/')
    expect(getCloudConsoleUrl('https://cloud.example.com/console')).toBe(
      'https://cloud.example.com/console',
    )
  })

  it('rejects insecure or credential-bearing return URLs', () => {
    expect(() => getCloudConsoleUrl('http://cloud.example.com')).toThrow()
    expect(() => getCloudConsoleUrl('https://user:secret@cloud.example.com')).toThrow()
    expect(() => getCloudConsoleUrl('https://cloud.example.com/#token')).toThrow()
  })

  it('allows only explicit literal localhost origins in a local development bundle', () => {
    expect(getCloudConsoleUrl('http://localhost:28175', true)).toBe('http://localhost:28175/')
    expect(getCloudConsoleUrl('http://localhost:80/', true)).toBe('http://localhost:80/')
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
      expect(() => getCloudConsoleUrl(value, true)).toThrow()
    }
    expect(() => getCloudConsoleUrl('http://localhost:28175', false)).toThrow()
  })
})
