import { expect, it } from 'vitest'

import { formatValidationInstant } from './validation-presentation'
it('keeps repeated DST wall times distinguishable by offset', () => {
  const first = formatValidationInstant('2026-11-01T05:30:00Z', 'en', 'America/New_York')
  const second = formatValidationInstant('2026-11-01T06:30:00Z', 'en', 'America/New_York')
  expect(first.text).toContain('01:30:00')
  expect(second.text).toContain('01:30:00')
  expect(first.text).toContain('GMT-4')
  expect(second.text).toContain('GMT-5')
  expect(first.zone).toBe('America/New_York')
})
it('does not invent an instant from malformed or unqualified timestamp text', () => {
  for (const value of ['not-a-time', '2026-10-31T08:00:00'])
    expect(formatValidationInstant(value, 'en', 'Asia/Shanghai')).toEqual({
      text: value,
      zone: null,
    })
})
