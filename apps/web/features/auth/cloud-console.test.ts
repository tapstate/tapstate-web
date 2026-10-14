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
})
