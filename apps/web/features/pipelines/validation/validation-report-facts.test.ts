import { expect, it } from 'vitest'

import type { ValidationValue, ValidationRootSummary } from '@/service/pipelines/validation-client'

import {
  validationFindingCounts,
  validationRootKinds,
  validationRootMatchesCategory,
  validationFieldPath,
} from './validation-report-facts'
const value = (type: ValidationValue['type'], value: unknown) =>
  ({ type, value, metadata: {} }) as ValidationValue
const object = (props: Record<string, ValidationValue>): ValidationValue => ({
  type: 'object',
  value: Object.entries(props).map(([name, value]) => ({ name, value })),
  metadata: {},
})
const root = (summary: ValidationValue) =>
  ({
    id: 'a'.repeat(64),
    root: { mappingId: 'orders', outputId: 'out', key: [], ancestors: [] },
    summary,
  }) as ValidationRootSummary
it('retains exact per-kind totals without turning absent facts into zero', () => {
  const source = root(
    object({ counts: object({ TARGET_VALUE: value('int64', '9007199254740993') }) }),
  )
  expect(validationRootKinds([source, source]).get('TARGET_VALUE')).toBe(18014398509481986n)
  expect(validationFindingCounts(object({}))).toBeNull()
  expect(
    validationFindingCounts(
      object({ counts: object({ TARGET_VALUE: value('text', 'not-a-count') }) }),
    ),
  ).toBeNull()
})
it('matches all observed categories of a record and leaves unknown kinds unclassified', () => {
  const source = root(
    object({
      counts: object({
        SOURCE_DUPLICATE: value('int64', '1'),
        TARGET_TYPE: value('int64', '2'),
        TARGET_MISSING: value('int64', '1'),
      }),
    }),
  )
  expect(validationRootMatchesCategory(source, 'source')).toBe(true)
  expect(validationRootMatchesCategory(source, 'values')).toBe(true)
  expect(validationRootMatchesCategory(source, 'presence')).toBe(true)
  const unknown = root(object({ counts: object({ FUTURE_KIND: value('int64', '1') }) }))
  expect(validationRootMatchesCategory(unknown, 'identity')).toBe(false)
  expect(validationRootMatchesCategory(unknown, 'all')).toBe(true)
})

it.each([
  'TARGET_DUPLICATE',
  'TARGET_ROW_DUPLICATE',
  'TARGET_IDENTITY',
  'TARGET_KEY_INVALID',
  'TARGET_STRUCTURE',
])('keeps current identity kind %s in its category', (kind) => {
  const item = root(object({ counts: object({ [kind]: value('int64', '1') }) }))
  expect(validationRootMatchesCategory(item, 'identity')).toBe(true)
})

it('keeps literal and nested paths distinct', () => {
  expect(validationFieldPath(['a.b'])).toBe('["a.b"]')
  expect(validationFieldPath(['a', 'b'])).toBe('a.b')
  expect(validationFieldPath(['items', 1])).toBe('items[1]')
  expect(validationFieldPath(['items', '1'])).toBe('items["1"]')
})
