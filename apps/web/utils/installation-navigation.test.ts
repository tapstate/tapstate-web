import { describe, expect, it } from 'vitest'

import { installationLoginUrl } from './installation-navigation'

describe('installation login navigation', () => {
  it('accepts the ordinary listener login address without moving credentials', () => {
    expect(installationLoginUrl('http://127.0.0.1:50690/login', 'http://127.0.0.1:62787')).toBe(
      'http://127.0.0.1:50690/login',
    )
  })
  it.each([
    'javascript:alert(1)',
    'http://user:password@localhost:50690/login',
    'http://localhost:50690/login?token=secret',
    'http://localhost:50690/login#secret',
    'http://localhost:50690/overview',
    'http://127.0.0.1:62787/login',
  ])('rejects unsafe or looping targets %s', (value) => {
    expect(installationLoginUrl(value, 'http://127.0.0.1:62787')).toBeUndefined()
  })
})
