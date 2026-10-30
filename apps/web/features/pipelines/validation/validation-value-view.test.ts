import { describe, expect, it } from 'vitest'

import { validationScalarText } from './validation-value-view'
describe('exact human-readable validation scalar values', () => {
  it('keeps decimal trailing zeroes, sign, scale and large integers without floating point', () => {
    expect(validationScalarText({ type: 'decimal', value: '2990', metadata: { scale: '2' } })).toBe(
      '29.90',
    )
    expect(validationScalarText({ type: 'decimal', value: '-1', metadata: { scale: '3' } })).toBe(
      '-0.001',
    )
    expect(validationScalarText({ type: 'decimal', value: '0', metadata: { scale: '2' } })).toBe(
      '0.00',
    )
    expect(validationScalarText({ type: 'decimal', value: '12', metadata: { scale: '-2' } })).toBe(
      '1200',
    )
    expect(validationScalarText({ type: 'int64', value: '9007199254740993', metadata: {} })).toBe(
      '9007199254740993',
    )
  })
  it('does not allocate huge scale expansions or discard the exact unscaled value', () => {
    expect(
      validationScalarText({
        type: 'decimal',
        value: '123456789012345678901234567890',
        metadata: { scale: '2147483647' },
      }),
    ).toBe('123456789012345678901234567890 × 10^(-2147483647)')
  })
  it('separates actual null, empty text, spaces, control text and literal null', () => {
    expect(validationScalarText({ type: 'null', value: null, metadata: {} })).toBe('null')
    expect(validationScalarText({ type: 'text', value: 'null', metadata: {} })).toBe('"null"')
    expect(validationScalarText({ type: 'text', value: '', metadata: {} })).toBe('""')
    expect(validationScalarText({ type: 'text', value: '  ', metadata: {} })).toBe('"  "')
    expect(validationScalarText({ type: 'text', value: 'a\u0000\t\r\n', metadata: {} })).toBe(
      '"a\\u0000\\t\\r\\n"',
    )
  })
})
