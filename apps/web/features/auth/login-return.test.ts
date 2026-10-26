import { describe, expect, it } from 'vitest'

import { safeLoginReturn } from './login-return'

describe('login return destinations', () => {
  it('keeps workbench deep links and rejects external or authentication destinations', () => {
    expect(safeLoginReturn('/pipelines/orders/edit?tab=logs')).toBe(
      '/pipelines/orders/edit?tab=logs',
    )
    for (const target of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      '/login',
      '/auth/browser/login',
      '/%2f%2fevil.example',
    ])
      expect(safeLoginReturn(target)).toBe('/overview')
  })
})
