import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import type {
  ValidationValue,
  ValidationRootDetail,
  ValidationReport,
} from '@/service/pipelines/validation-client'

import { ValidationRecordDetails } from './validation-record-details'
import { ValidationValueView } from './validation-value-view'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'dataValidation.record.findingCount' ? `Finding count: ${values?.value}` : key,
  }),
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined, container: HTMLDivElement | undefined
const text = (value: string): ValidationValue => ({ type: 'text', value, metadata: {} })
const number = (value: string): ValidationValue => ({ type: 'int64', value, metadata: {} })
const array = (value: readonly ValidationValue[]): ValidationValue => ({
  type: 'array',
  value,
  metadata: {},
})
const object = (values: Record<string, ValidationValue>): ValidationValue => ({
  type: 'object',
  value: Object.entries(values).map(([name, value]) => ({ name, value })),
  metadata: {},
})
const nil: ValidationValue = { type: 'null', value: null, metadata: {} }
const stored = (value: string) => object({ kind: text('LONG'), value: number(value) })
const key = object({
  kind: text('EXACT_NUMBER'),
  binarySubtype: number('-1'),
  value: object({ kind: text('DECIMAL'), unscaled: text('1'), scale: number('0') }),
})
const scope = object({
  mappingId: text('orders'),
  outputId: text('out'),
  key: array([key]),
  ancestors: array([]),
})
const finding = object({
  kind: text('TARGET_VALUE'),
  location: object({ scope, fieldPath: array([text('amount')]) }),
  multiplicity: nil,
})
const side = (value: string) =>
  object({
    identity: object({
      sourceId: text('input'),
      database: nil,
      schema: nil,
      table: text('orders'),
      keyFields: array([text('id')]),
      actualKey: array([key]),
    }),
    readId: text('read-1'),
    row: object({
      kind: text('OBJECT'),
      entries: array([object({ name: text('amount'), value: stored(value) })]),
    }),
  })
const mappings: ValidationReport['mappings'] = [
  {
    id: 'orders',
    outputKind: 'SYNC',
    output: 'out',
    source: {
      node: 'input',
      source: 'input',
      database: null,
      schema: null,
      table: 'orders',
      modelVersion: 'm',
      codecBinding: 'c',
    },
    target: {
      node: 'out',
      source: 'target',
      database: null,
      schema: null,
      table: 'checked_orders',
      modelVersion: 'm',
      codecBinding: 'c',
    },
    keys: null,
  },
]
const detail = (count: string): ValidationRootDetail => ({
  id: 'a'.repeat(64),
  revision: '1',
  root: {
    mappingId: 'orders',
    outputId: 'out',
    key: [{ domain: 'EXACT_NUMBER', value: number('1') }],
    ancestors: [],
  },
  observation: object({
    findings: array([
      object({
        ...(finding.type === 'object'
          ? Object.fromEntries(finding.value.map((entry) => [entry.name, entry.value]))
          : {}),
        count: number(count),
      }),
    ]),
    samples: array([object({ finding, source: side('1'), target: side('2') })]),
    samplesTruncated: { type: 'boolean', value: true, metadata: {} },
    notCompared: array([]),
    reads: array([]),
  }),
})
async function mount(view: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root!.render(view))
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})
it('distinguishes missing paths from missing rows without inventing absent samples', async () => {
  const basis = detail('1')
  const item = (kind: string, path: ValidationValue[]) =>
    object({
      kind: text(kind),
      location: object({ scope, fieldPath: array(path) }),
      multiplicity: nil,
      count: number('1'),
    })
  const current = {
    ...basis,
    observation: object({
      targetPresence: text('PRESENT'),
      findings: array([
        item('TARGET_MISSING', [text('nullable_text')]),
        item('TARGET_MISSING', []),
        item('TARGET_EXTRA', [
          text('items'),
          { type: 'int32', value: '0', metadata: {} },
          text('optional'),
        ]),
      ]),
      samples: array([]),
      samplesTruncated: { type: 'boolean', value: true, metadata: {} },
      notCompared: array([]),
      reads: array([]),
    }),
  }
  await mount(
    <ValidationRecordDetails detail={current} pending={false} error={null} mappings={mappings} />,
  )
  const rows = [...container!.querySelector('tbody')!.querySelectorAll('tr')]
  expect(rows).toHaveLength(3)
  expect(rows[0].textContent).toContain('dataValidation.record.pathKinds.TARGET_MISSING')
  expect(rows[1].textContent).toContain('dataValidation.record.kinds.TARGET_MISSING')
  expect(rows[2].textContent).toContain('dataValidation.record.pathKinds.TARGET_EXTRA')
  expect(
    rows.every((row) => row.textContent?.includes('dataValidation.record.cells.NOT_RETAINED')),
  ).toBe(true)
})
it('shows exact mandatory finding counts independently of the one retained sample', async () => {
  await mount(
    <ValidationRecordDetails
      detail={detail('7')}
      pending={false}
      error={null}
      mappings={mappings}
    />,
  )
  expect(document.body.textContent).toContain('Finding count: 7')
  await act(async () =>
    root!.render(
      <ValidationRecordDetails
        detail={detail('1')}
        pending={false}
        error={null}
        mappings={mappings}
      />,
    ),
  )
  expect(document.body.textContent).toContain('Finding count: 1')
  expect(document.body.textContent).not.toContain('Finding count: 7')
})
it('keeps exact object member names distinct from array ordinals', async () => {
  const names = ['', ' ', 'a\nb', '0', 'a\u200bb']
  await mount(
    <ValidationValueView
      value={{
        type: 'object',
        metadata: {},
        value: names.map((name) => ({ name, value: text('same') })),
      }}
    />,
  )
  const details = document.querySelector('details')!
  await act(async () => {
    details.open = true
    details.dispatchEvent(new Event('toggle'))
  })
  const labels = [...document.querySelectorAll('p')].map((node) => node.textContent)
  for (const name of ['""', '" "', '"a\\nb"', '"0"', '"a\\u200bb"']) expect(labels).toContain(name)
  await act(async () => root!.render(<ValidationValueView value={array([text('same')])} />))
  expect([...document.querySelectorAll('p')].map((node) => node.textContent)).toContain('0')
})
