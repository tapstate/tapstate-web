import { describe, expect, it } from 'vitest'

import { parseWizardFilter, wizardFilterExpression } from './wizard-filter-conditions'

describe('Wizard visual filter round trips', () => {
  it('preserves integer IDs beyond JavaScript number precision', () => {
    const expr = 'after.customer_id == 9007199254740993'
    expect(wizardFilterExpression(parseWizardFilter(expr)!)).toBe(expr)
  })
  it('keeps empty drafts out of the generated expression', () => {
    expect(
      wizardFilterExpression([{ field: 'status', op: '==', value: '', valueConfigured: false }]),
    ).toBe('')
  })
  it('preserves literal types, empty strings and conjunctions inside quoted values', () => {
    const expr = 'after.status == "A && B" && after.count >= 3 && op != "d" && after.name == ""'
    const rows = parseWizardFilter(expr)
    expect(rows).toHaveLength(4)
    expect(wizardFilterExpression(rows!)).toBe(expr)
  })
  it('round trips the string methods exposed by the condition editor', () => {
    const expr = 'after.name.startsWith("a") && after.email.contains("@")'
    expect(wizardFilterExpression(parseWizardFilter(expr)!)).toBe(expr)
  })
  it('preserves simple single quoted conditions when switching from raw CEL', () => {
    expect(parseWizardFilter("after.status == 'ACTIVE'")).toMatchObject([
      { field: 'status', value: 'ACTIVE', valueConfigured: true },
    ])
  })
  it.each([
    'after.a == 1 || after.b == 2',
    'size(after.items) > 3',
    'after.a == "x" && invalid()',
    'after.a in [1, 2]',
  ])('refuses a lossy conversion: %s', (expr) => {
    expect(parseWizardFilter(expr)).toBeNull()
  })
})
