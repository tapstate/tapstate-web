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
})
