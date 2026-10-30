import { describe, expect, it } from 'vitest'

import type { ValidationValue } from '@/service/pipelines/validation-client'

import {
  storedValidationValue,
  validationCell,
  validationRecordObservation,
  validationSampleCell,
} from './validation-record-view'
const text = (value: string): ValidationValue => ({ type: 'text', value, metadata: {} })
const integer = (value: string): ValidationValue => ({ type: 'int64', value, metadata: {} })
const nullValue: ValidationValue = { type: 'null', value: null, metadata: {} }
const array = (value: readonly ValidationValue[]): ValidationValue => ({
  type: 'array',
  value,
  metadata: {},
})
const object = (value: Record<string, ValidationValue>): ValidationValue => ({
  type: 'object',
  value: Object.entries(value).map(([name, value]) => ({ name, value })),
  metadata: {},
})
const stored = (kind: string, value?: ValidationValue): ValidationValue =>
  object({ kind: text(kind), ...(value === undefined ? {} : { value }) })
const row = (fields: Record<string, ValidationValue>): ValidationValue =>
  object({
    kind: text('OBJECT'),
    entries: array(
      Object.entries(fields).map(([name, value]) => object({ name: text(name), value })),
    ),
  })
const scope = object({
  mappingId: text('orders'),
  outputId: text('out'),
  key: array([
    object({
      kind: text('TEXT'),
      binarySubtype: integer('-1'),
      value: stored('TEXT', text('key')),
    }),
  ]),
  ancestors: array([]),
})
const finding = (occurrences: string | null = null): ValidationValue =>
  object({
    kind: text(occurrences === null ? 'TARGET_VALUE' : 'TARGET_DUPLICATE'),
    location: object({ scope, fieldPath: array([text('amount')]) }),
    multiplicity:
      occurrences === null
        ? nullValue
        : object({
            occurrences: integer(occurrences),
            exact: { type: 'boolean', value: true, metadata: {} },
          }),
  })
const side = (amount: string): ValidationValue =>
  object({
    identity: object({
      sourceId: text('input'),
      database: nullValue,
      schema: nullValue,
      table: text('orders'),
      keyFields: array([text('id')]),
      actualKey: array([]),
    }),
    readId: text('read-1'),
    row: row({ amount: stored('LONG', integer(amount)) }),
  })

describe('read-only stored record projection', () => {
  it('keeps 2^53 neighbours and decimal unscaled/scale without a Number conversion', () => {
    expect(storedValidationValue(stored('LONG', integer('9007199254740993')))).toEqual({
      type: 'int64',
      value: '9007199254740993',
      metadata: {},
    })
    expect(
      storedValidationValue(
        object({ kind: text('DECIMAL'), unscaled: text('2990'), scale: integer('2') }),
      ),
    ).toEqual({ type: 'decimal', value: '2990', metadata: { scale: '2' } })
    expect(
      storedValidationValue(
        object({
          kind: text('DECIMAL'),
          unscaled: text('123456789012345678901234567890'),
          scale: integer('28'),
        }),
      )?.value,
    ).toBe('123456789012345678901234567890')
  })
  it('retains PDK codec origin, unknown binary subtype, NaN bits and nanosecond instant facts', () => {
    const typed = object({
      kind: text('TYPED'),
      logicalType: text('DATETIME'),
      nativeType: text('timestamp(9)'),
      codecBinding: text('source-custom-v1'),
      conversionOrigin: text('CUSTOM'),
      value: object({
        kind: text('INSTANT'),
        value: object({ seconds: integer('-31557014167219200'), nanos: integer('999999999') }),
      }),
    })
    const decoded = storedValidationValue(typed)
    expect(decoded?.metadata).toEqual({
      logicalType: 'DATETIME',
      nativeType: 'timestamp(9)',
      codecBinding: 'source-custom-v1',
      conversionOrigin: 'CUSTOM',
    })
    if (decoded?.type !== 'typed') throw new Error('typed value was lost')
    expect(decoded.value).toEqual({
      type: 'object',
      metadata: { observedType: 'INSTANT' },
      value: [
        { name: 'epochSeconds', value: integer('-31557014167219200') },
        { name: 'nanoseconds', value: integer('999999999') },
      ],
    })
    expect(
      storedValidationValue(
        object({
          kind: text('BINARY'),
          subtype: integer('-1'),
          value: { type: 'binary', value: 'AAE=', metadata: { encoding: 'base64', subtype: '0' } },
        }),
      ),
    ).toEqual({ type: 'binary', value: 'AAE=', metadata: { encoding: 'base64', subtype: '-1' } })
    expect(
      storedValidationValue(stored('DOUBLE_BITS', integer('9221120237041090561')))?.value,
    ).toBe('7ff8000000000001')
  })
  it('separates missing fields, actual nulls and unavailable samples, preserving literal names and ordinals', () => {
    const decoded = storedValidationValue(
      row({
        'a.b': stored('TEXT', text('literal')),
        n: stored('NULL'),
        items: object({
          kind: text('ARRAY'),
          values: array([row({ '0': stored('TEXT', text('zero')) })]),
        }),
      }),
    )
    expect(validationCell(decoded, ['a.b'])).toEqual({ state: 'PRESENT', value: text('literal') })
    expect(validationCell(decoded, ['a', 'b'])).toEqual({ state: 'MISSING_FIELD' })
    expect(validationCell(decoded, ['n'])).toEqual({ state: 'PRESENT', value: nullValue })
    expect(validationCell(decoded, ['items', 0, '0'])).toEqual({
      state: 'PRESENT',
      value: text('zero'),
    })
    expect(validationCell(decoded, ['items', '0', '0'])).toEqual({ state: 'MISSING_FIELD' })
    expect(validationCell(null, ['n'])).toEqual({ state: 'NOT_RETAINED' })
  })
  it('preserves both duplicate samples and does not attach another multiplicity to a finding', () => {
    const wanted = finding('2'),
      other = finding('3'),
      observation = object({
        findings: array([
          object({
            ...(wanted.type === 'object'
              ? Object.fromEntries(wanted.value.map((entry) => [entry.name, entry.value]))
              : {}),
            count: integer('1'),
          }),
        ]),
        samples: array([
          object({
            finding: wanted,
            source: side('9007199254740993'),
            target: side('9007199254740994'),
          }),
          object({
            finding: wanted,
            source: side('9007199254740993'),
            target: side('9007199254740995'),
          }),
          object({ finding: other, source: side('999'), target: side('1000') }),
        ]),
        samplesTruncated: { type: 'boolean', value: true, metadata: {} },
        notCompared: array([]),
        reads: array([]),
      })
    const parsed = validationRecordObservation(observation)
    expect(parsed?.samplesTruncated).toBe(true)
    expect(parsed?.findings).toHaveLength(1)
    const actual = parsed!.findings[0]!
    expect(actual.multiplicity).toEqual({ occurrences: '2', exact: true })
    expect(actual.samples).toHaveLength(2)
    expect(
      actual.samples.map((sample) => validationCell(sample.target?.row ?? null, ['amount'])),
    ).toEqual([
      { state: 'PRESENT', value: integer('9007199254740994') },
      { state: 'PRESENT', value: integer('9007199254740995') },
    ])
  })
  it('keeps mandatory findings when every sample is absent, without inventing missing or equal values', () => {
    const base = finding(),
      value = object({
        findings: array([base]),
        samples: array([]),
        samplesTruncated: { type: 'boolean', value: true, metadata: {} },
        notCompared: array([]),
        reads: array([]),
      })
    const parsed = validationRecordObservation(value)
    expect(parsed?.findings).toHaveLength(1)
    expect(parsed?.findings[0]?.samples).toHaveLength(0)
    expect(storedValidationValue(stored('UNKNOWN_NATIVE_KIND', text('raw')))).toBeNull()
    expect(validationRecordObservation(object({}))).toBeNull()
  })
})

it('keeps each retained side identity and read boundary attached to that exact sample', () => {
  const base = finding(),
    source = side('1'),
    target = side('2'),
    observation = object({
      findings: array([base]),
      samples: array([object({ finding: base, source, target })]),
      samplesTruncated: { type: 'boolean', value: false, metadata: {} },
      notCompared: array([]),
      reads: array([]),
    })
  const actual = validationRecordObservation(observation)?.findings[0]?.samples[0]
  expect(actual?.source).toMatchObject({
    identity:
      source.type === 'object'
        ? source.value.find((entry) => entry.name === 'identity')?.value
        : null,
    readId: 'read-1',
  })
  expect(actual?.target).toMatchObject({ readId: 'read-1' })
})

it('associates semantically equal retained findings despite location and scope member order', () => {
  const base = finding(),
    reverse = (value: ValidationValue): ValidationValue =>
      value.type === 'object'
        ? {
            ...value,
            value: [...value.value]
              .reverse()
              .map((entry) => ({ ...entry, value: reverse(entry.value) })),
          }
        : value.type === 'array'
          ? { ...value, value: value.value.map(reverse) }
          : value
  const reordered = reverse(base),
    observation = object({
      findings: array([base]),
      samples: array([object({ finding: reordered, source: side('1'), target: side('2') })]),
      samplesTruncated: { type: 'boolean', value: false, metadata: {} },
      notCompared: array([]),
      reads: array([]),
    })
  expect(validationRecordObservation(observation)?.findings[0]?.samples).toHaveLength(1)
})

it('distinguishes absent sides from retained rows that cannot be decoded', () => {
  const base = finding(),
    encodedRow = row({ amount: stored('FUTURE_KIND', text('retained-raw')) }),
    retained = object({
      identity: object({ sourceId: text('input') }),
      readId: text('original-read'),
      row: encodedRow,
    }),
    observation = object({
      findings: array([base]),
      samples: array([object({ finding: base, source: nullValue, target: retained })]),
      samplesTruncated: { type: 'boolean', value: true, metadata: {} },
      notCompared: array([]),
      reads: array([]),
    })
  const sample = validationRecordObservation(observation)!.findings[0]!.samples[0]!
  expect(validationSampleCell(sample.source, ['amount'])).toEqual({ state: 'NOT_RETAINED' })
  expect(validationSampleCell(sample.target, ['amount'])).toEqual({
    state: 'UNAVAILABLE',
    raw: encodedRow,
  })
  expect(sample.target?.readId).toBe('original-read')
})
