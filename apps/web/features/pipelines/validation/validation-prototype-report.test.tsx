import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import type {
  createValidationClient,
  ValidationReport,
  ValidationValue,
} from '@/service/pipelines/validation-client'

import { ValidationReportPanel } from './validation-report-panel'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const reference = {
  pipeline: 'flow',
  task: 'full',
  generation: '10000000-0000-4000-8000-000000000001',
  sequence: '1',
  run: 'report',
}
const table = {
  node: 'input',
  source: 'source',
  database: 'db',
  schema: null,
  table: 'orders',
  modelVersion: null,
  codecBinding: null,
}
const component = {
  path: ['id'],
  domain: 'EXACT_NUMBER',
  logicalTypes: ['exact-number'],
  numericPolicy: 'EXACT',
}
const mapping = {
  id: 'orders',
  outputKind: 'SYNC',
  output: 'out',
  source: table,
  target: { ...table, node: 'out', source: 'target', table: 'checked_orders' },
  keys: {
    confirmation: '10000000-0000-4000-8000-000000000002',
    source: [component],
    target: [component],
  },
}
const report: ValidationReport = {
  reference,
  method: 'FULL_COLUMN',
  mappingRevision: '1',
  rulesVersion: 'rules',
  fingerprint: 'a'.repeat(64),
  mappings: [mapping],
  closed: true,
  terminal: 'COMPLETED',
  terminalKnownAt: null,
  endedAt: null,
  window: null,
  failure: null,
  rootCount: '1',
  retainedBytes: '1',
  counts: [],
  result: 'COMPLETE_WITH_OBSERVATIONS',
  premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
  premiseVerifiedBySystem: false,
  conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
  physicalDrain: 'UNKNOWN',
}
const atom = (type: ValidationValue['type'], value: unknown): ValidationValue =>
  ({ type, value, metadata: {} }) as ValidationValue
const object = (fields: Record<string, ValidationValue>): ValidationValue => ({
  type: 'object',
  value: Object.entries(fields).map(([name, value]) => ({ name, value })),
  metadata: {},
})
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, queries: QueryClient
async function mount(
  data: ValidationReport,
  counts: Record<string, ValidationValue> = { TARGET_VALUE: atom('int64', '3') },
) {
  const summary = object({
    counts: object(counts),
    samplesTruncated: atom('boolean', false),
  })
  const client = {
    report: vi.fn(async () => data),
    roots: vi.fn(async () => ({
      total: data.rootCount,
      items:
        data.rootCount === '0'
          ? []
          : [
              {
                id: 'b'.repeat(64),
                root: {
                  mappingId: 'orders',
                  outputId: 'out',
                  key: [{ domain: 'EXACT_NUMBER', value: atom('int64', '9007199254740993') }],
                  ancestors: [],
                },
                summary,
              },
            ],
    })),
    root: vi.fn(async () => null),
  } as unknown as ReturnType<typeof createValidationClient>
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queries}>
        <ValidationReportPanel client={client} reference={reference} />
      </QueryClientProvider>,
    ),
  )
  return client
}
async function wait(check: () => void) {
  await vi.waitFor(
    async () => {
      await act(async () => {})
      check()
    },
    { timeout: 2000, interval: 10 },
  )
}
function button(text: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (n) => n.textContent === text || n.getAttribute('aria-label') === text,
  )
  if (!node) throw new Error(`missing ${text}`)
  return node
}
afterEach(async () => {
  await act(async () => root?.unmount())
  queries?.clear()
  host?.remove()
  vi.restoreAllMocks()
})
it('shows table findings and problem-first named-key rows from retained facts', async () => {
  await mount(report)
  await wait(() => expect(document.body.textContent).toContain('orders'))
  await wait(() =>
    expect(document.body.textContent).toContain('dataValidation.report.problemSummary'),
  )
  expect(document.body.textContent).toContain('dataValidation.record.kinds.TARGET_VALUE')
  await act(async () => button('dataValidation.report.records').click())
  await wait(() =>
    expect(document.querySelector('th')?.textContent).toContain('dataValidation.report.problem'),
  )
  expect([...document.querySelectorAll('th')].some((n) => n.textContent === 'id')).toBe(true)
  expect(document.body.textContent).toContain('9007199254740993')
  expect(document.body.textContent).toContain('dataValidation.record.categories.values')
})
it('does not describe mixed row and field presence summaries as row-only facts', async () => {
  await mount(report, { TARGET_MISSING: atom('int64', '2'), TARGET_EXTRA: atom('int64', '1') })
  await wait(() =>
    expect(document.body.textContent).toContain(
      'dataValidation.report.summaryKinds.TARGET_MISSING',
    ),
  )
  expect(document.body.textContent).toContain('dataValidation.report.summaryKinds.TARGET_EXTRA')
  expect(document.body.textContent).not.toContain('dataValidation.record.kinds.TARGET_MISSING')
})
it('keeps an absent retained stack explicit and non-copyable', async () => {
  await mount({
    ...report,
    rootCount: '0',
    terminal: 'FAILED',
    result: 'INCOMPLETE',
    failure: {
      code: 'validation.read-failed',
      params: {},
      exceptionType: 'ReadFailure',
      message: 'Read failed',
      technical: null,
      fatal: false,
    },
  })
  await wait(() => expect(document.body.textContent).toContain('Read failed'))
  expect(button('dataValidation.failure.copy').disabled).toBe(true)
  expect(document.body.textContent).toContain('dataValidation.failure.unavailable')
})
it('copies the exact bounded retained text while its stack is folded', async () => {
  const text = 'ReadFailure\n\tat source.read(Source.java:10)\n\n    nested'
  const write = vi.fn(async () => {})
  const old = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } })
  try {
    await mount({
      ...report,
      rootCount: '0',
      terminal: 'FAILED',
      result: 'INCOMPLETE',
      failure: {
        code: 'validation.read-failed',
        params: {},
        exceptionType: 'ReadFailure',
        message: 'Read failed',
        technical: text,
        fatal: false,
      },
    })
    await wait(() => expect(document.body.textContent).toContain('Read failed'))
    expect(document.querySelector('details')?.open).toBe(false)
    await act(async () => button('dataValidation.failure.copy').click())
    expect(write).toHaveBeenCalledWith(text)
  } finally {
    if (old) Object.defineProperty(navigator, 'clipboard', old)
    else Reflect.deleteProperty(navigator, 'clipboard')
  }
})

it('loads concrete previews only for the visible page and serializes detail requests', async () => {
  const calls: string[] = []
  let active = 0,
    maximum = 0
  const records = Array.from({ length: 25 }, (_, index) => ({
    id: String(index).padStart(64, '0'),
    root: {
      mappingId: 'orders',
      outputId: 'out',
      key: [{ domain: 'EXACT_NUMBER', value: atom('int64', String(index)) }],
      ancestors: [],
    },
    summary: object({ counts: object({ TARGET_VALUE: atom('int64', '1') }) }),
  }))
  const client = {
    report: async () => ({ ...report, rootCount: '25' }),
    roots: async (_ref: unknown, page: { offset: number; limit: number }) => ({
      total: '25',
      items: records.slice(page.offset, page.offset + page.limit),
    }),
    root: async (_ref: unknown, id: string) => {
      calls.push(id)
      active++
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active--
      return null
    },
  } as unknown as ReturnType<typeof createValidationClient>
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queries}>
        <ValidationReportPanel client={client} reference={reference} />
      </QueryClientProvider>,
    ),
  )
  await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
  await act(async () => button('dataValidation.report.records').click())
  await wait(() => expect(new Set(calls).size).toBe(20))
  expect(maximum).toBe(1)
  expect(calls).not.toContain(records[20].id)
})

it('clears the inspector when search has no matching retained root', async () => {
  await mount(report)
  await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
  await act(async () => button('dataValidation.report.records').click())
  await wait(() => expect(button('dataValidation.report.selectRecord')).toBeDefined())
  await act(async () => button('dataValidation.report.selectRecord').click())
  const input = document.querySelector<HTMLInputElement>(
    '[aria-label="dataValidation.report.searchKey"]',
  )!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'does-not-match',
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await wait(() =>
    expect(document.body.textContent).toContain('dataValidation.report.noRetainedRecords'),
  )
  expect(document.querySelector('h4')).toBeNull()
})
it('distinguishes a retained undecodable sample from an unretained one', async () => {
  const client = await mount(report)
  const finding = object({
    kind: atom('text', 'TARGET_VALUE'),
    location: object({ scope: object({}), fieldPath: atom('array', [atom('text', 'a.b')]) }),
    count: atom('int64', '1'),
    multiplicity: atom('null', null),
  })
  const observation = object({
    findings: atom('array', [finding]),
    samples: atom('array', [
      object({
        finding,
        source: object({
          identity: object({}),
          readId: atom('text', 'source-read'),
          row: object({ kind: atom('text', 'FUTURE_ENCODING'), value: atom('text', 'retained') }),
        }),
        target: atom('null', null),
      }),
    ]),
    samplesTruncated: atom('boolean', false),
  })
  client.root = vi.fn(async () => ({
    id: 'b'.repeat(64),
    revision: '1',
    root: { mappingId: 'orders', outputId: 'out', key: [], ancestors: [] },
    observation,
  })) as typeof client.root
  await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
  await act(async () => button('dataValidation.report.records').click())
  await wait(() =>
    expect(document.body.textContent).toContain('dataValidation.record.valueUnavailable'),
  )
  const preview = document.querySelector('[data-validation-record] td')!
  expect(preview.textContent).toContain('dataValidation.record.valueUnavailable')
  expect(preview.textContent).toContain('["a.b"]')
})

it('cancels obsolete preview work before reading the next page', async () => {
  let aborted = false
  const calls: string[] = []
  const records = Array.from({ length: 25 }, (_, index) => ({
    id: String(index).padStart(64, '0'),
    root: {
      mappingId: 'orders',
      outputId: 'out',
      key: [{ domain: 'EXACT_NUMBER', value: atom('int64', String(index)) }],
      ancestors: [],
    },
    summary: object({ counts: object({ TARGET_VALUE: atom('int64', '1') }) }),
  }))
  const client = {
    report: async () => ({ ...report, rootCount: '25' }),
    roots: async (_ref: unknown, page: { offset: number; limit: number }) => ({
      total: '25',
      items: records.slice(page.offset, page.offset + page.limit),
    }),
    root: async (_ref: unknown, id: string, signal: AbortSignal) => {
      calls.push(id)
      if (id === records[1].id)
        return await new Promise((resolve) => {
          signal.addEventListener(
            'abort',
            () => {
              aborted = true
              resolve(null)
            },
            { once: true },
          )
        })
      return null
    },
  } as unknown as ReturnType<typeof createValidationClient>
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queries}>
        <ValidationReportPanel client={client} reference={reference} />
      </QueryClientProvider>,
    ),
  )
  await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
  await act(async () => button('dataValidation.report.records').click())
  await wait(() => expect(calls).toContain(records[1].id))
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[aria-label="dataValidation.next"]')!.click(),
  )
  await wait(() => expect(calls).toContain(records[20].id))
  expect(aborted).toBe(true)
})

it('hands a prefetched record to the selected inspector without aborting it', async () => {
  let aborted = false
  let release!: () => void
  const calls: string[] = []
  const records = Array.from({ length: 3 }, (_, index) => ({
    id: String(index).padStart(64, '0'),
    root: {
      mappingId: 'orders',
      outputId: 'out',
      key: [{ domain: 'EXACT_NUMBER', value: atom('int64', String(index)) }],
      ancestors: [],
    },
    summary: object({ counts: object({ TARGET_VALUE: atom('int64', '1') }) }),
  }))
  const client = {
    report: async () => ({ ...report, rootCount: '3' }),
    roots: async () => ({ total: '3', items: records }),
    root: async (_ref: unknown, id: string, signal: AbortSignal) => {
      calls.push(id)
      if (id === records[1].id)
        return await new Promise((resolve, reject) => {
          release = () =>
            resolve({
              id,
              revision: '1',
              root: records[1].root,
              observation: atom('text', 'SELECTED_RECORD_READY'),
            })
          signal.addEventListener(
            'abort',
            () => {
              aborted = true
              reject(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
          )
        })
      return null
    },
  } as unknown as ReturnType<typeof createValidationClient>
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={queries}>
        <ValidationReportPanel client={client} reference={reference} />
      </QueryClientProvider>,
    ),
  )
  try {
    await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
    await act(async () => button('dataValidation.report.records').click())
    await wait(() => expect(calls).toContain(records[1].id))
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(`[data-validation-record="${records[1].id}"] button`)!
        .click(),
    )
    await act(async () => release())
    await wait(() => expect(document.body.textContent).toContain('SELECTED_RECORD_READY'))
    expect(aborted).toBe(false)
    expect(calls.filter((id) => id === records[1].id)).toHaveLength(1)
  } finally {
    release?.()
  }
})

it('makes missing retained diagnostics explicit for a failed legacy report', async () => {
  await mount({
    ...report,
    rootCount: '0',
    terminal: 'FAILED',
    result: 'INCOMPLETE',
    failure: null,
  })
  await wait(() =>
    expect(document.body.textContent).toContain('dataValidation.failure.missingDetails'),
  )
  expect(button('dataValidation.failure.copy').disabled).toBe(true)
})

it('uses a record drawer at compact widths instead of squeezing a second pane', async () => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  })
  try {
    await mount(report)
    await wait(() => expect(button('dataValidation.report.records')).toBeDefined())
    await act(async () => button('dataValidation.report.records').click())
    await wait(() => expect(button('dataValidation.report.selectRecord')).toBeDefined())
    expect(document.querySelector('h4')).toBeNull()
    await act(async () => button('dataValidation.report.selectRecord').click())
    await wait(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())
  } finally {
    if (original) Object.defineProperty(window, 'matchMedia', original)
    else Reflect.deleteProperty(window, 'matchMedia')
  }
})
