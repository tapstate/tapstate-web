import { describe, expect, it } from 'vitest'

import type { AlertForm } from '@/service/alert-client'

import { silenceStatus } from './silence-status'

const start = Date.parse('2026-10-31T08:45:05.917Z')
const row: AlertForm = {
  id: 'window',
  kind: 'SILENCE',
  active: true,
  startsAt: new Date(start).toISOString(),
  durationSeconds: 10,
}
describe('silence temporal status', () => {
  it.each([
    [-1, 'scheduled'],
    [0, 'silenceActive'],
    [9999, 'silenceActive'],
    [10000, 'silenceEnded'],
  ])('uses inclusive start and exclusive duration at %ims', (offset, expected) => {
    expect(silenceStatus(row, start + offset)).toBe(expected)
  })
  it('clips a window at its exclusive explicit end', () => {
    const clipped = { ...row, endsAt: new Date(start + 5000).toISOString() }
    expect(silenceStatus(clipped, start + 4999)).toBe('silenceActive')
    expect(silenceStatus(clipped, start + 5000)).toBe('silenceEnded')
  })
  it('distinguishes recurring gaps from a final gap with no remaining occurrence', () => {
    const repeating = { ...row, periodSeconds: 20 }
    expect(silenceStatus(repeating, start + 10000)).toBe('scheduled')
    expect(silenceStatus(repeating, start + 20000)).toBe('silenceActive')
    expect(
      silenceStatus({ ...repeating, endsAt: new Date(start + 20000).toISOString() }, start + 10000),
    ).toBe('silenceEnded')
    expect(
      silenceStatus({ ...repeating, endsAt: new Date(start + 20001).toISOString() }, start + 10000),
    ).toBe('scheduled')
  })
  it('keeps configuration retirement separate from elapsed windows', () => {
    expect(silenceStatus({ ...row, active: false }, start)).toBe('disabled')
    expect(silenceStatus({ ...row, startsAt: undefined }, start)).toBe('silenceUnknown')
  })
})
