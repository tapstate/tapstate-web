import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createValidationClient,
  type ValidationOperation,
  type ValidationTask,
  type ValidationValue,
} from '@/service/pipelines/validation-client'

import { ValidationHistoryPanel } from './validation-history-panel'
import { ValidationReportPanel } from './validation-report-panel'
import { ValidationRunPanel } from './validation-run-panel'
import { ValidationValueView } from './validation-value-view'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined, container: HTMLDivElement | undefined, queries: QueryClient | undefined
const generation = '10000000-0000-4000-8000-000000000001',
  command = '20000000-0000-4000-8000-000000000001'
const context = {
  cluster: 'cluster',
  node: 'node',
  boot: 'boot',
  member: generation,
  incarnation: command,
}
const ref = { pipeline: 'flow', task: 'full', generation, sequence: '1', run: 'old-run' }
const original: ValidationOperation = {
  context,
  pipeline: 'flow',
  task: 'full',
  taskGeneration: generation,
  revision: '1',
  sequence: '2',
  command,
}
const task: ValidationTask = {
  pipelineId: 'flow',
  taskId: 'full',
  taskGeneration: generation,
  revision: '1',
  nextStartSequence: '2',
  closed: false,
  method: 'FULL_COLUMN',
  comparisonFingerprint: 'a'.repeat(64),
  historyLimit: 10,
  schedule: null,
  scheduleEnabled: false,
  mappings: [],
  context,
  permission: {
    phase: 'CLOSED',
    taskGeneration: generation,
    revision: '1',
    sequence: '1',
    command: '30000000-0000-4000-8000-000000000001',
    run: 'old-run',
  },
  scheduleObservation: null,
}
const table = {
  node: 'source',
  source: 'source',
  database: null,
  schema: null,
  table: 'orders',
  modelVersion: 'model',
  codecBinding: 'codec',
}
const report = {
  reference: ref,
  method: 'FULL_COLUMN',
  mappingRevision: '1',
  rulesVersion: 'direct-full-v1',
  fingerprint: 'a'.repeat(64),
  mappings: [
    {
      id: 'orders',
      outputKind: 'SYNC',
      output: 'out',
      source: table,
      target: { ...table, source: 'target', table: 'checked_orders' },
      keys: null,
    },
  ],
  closed: true,
  terminal: 'FAILED',
  terminalKnownAt: null,
  endedAt: null,
  window: null,
  failure: null,
  rootCount: '1001',
  retainedBytes: '200000',
  counts: [],
  result: 'INCOMPLETE',
  premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
  premiseVerifiedBySystem: false,
  conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
  physicalDrain: 'UNKNOWN',
}
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
async function mount(view: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root!.render(<QueryClientProvider client={queries!}>{view}</QueryClientProvider>),
  )
}
async function settled(assertion: () => void) {
  await vi.waitFor(
    async () => {
      await act(async () => {})
      assertion()
    },
    { timeout: 2000, interval: 10 },
  )
}
function button(label: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent === label,
  )
  if (!found) throw new Error(`missing button ${label}`)
  return found
}
async function click(label: string) {
  await act(async () => button(label).click())
}
afterEach(async () => {
  await act(async () => root?.unmount())
  queries?.clear()
  container?.remove()
  root = undefined
  container = undefined
  queries = undefined
})

describe('actual report and original-run presentation', () => {
  it.each(['manual', 'scheduled'] as const)(
    'does not show the prior report while a distinct %s start has no progress receipt',
    async (kind) => {
      const read = vi.fn(async (path: RequestInfo | URL) =>
        String(path).endsWith('/validation:progress')
          ? new Promise<Response>(() => {})
          : json({
              ...report,
              rootCount: '0',
              terminal: 'COMPLETED',
              result: 'COMPLETE_NO_ISSUES_OBSERVED',
            }),
      )
      await mount(
        <ValidationRunPanel
          client={createValidationClient(read)}
          task={
            kind === 'manual'
              ? task
              : {
                  ...task,
                  scheduleObservation: {
                    node: context.node,
                    boot: context.boot,
                    member: context.member,
                    context: context.incarnation,
                    observedAt: '2026-10-30T00:00:00Z',
                    nextDue: null,
                    lastDue: null,
                    state: 'START_REQUESTED',
                    reason: null,
                    command: original.command,
                    run: 'scheduled-new-run',
                    sequence: '2',
                  },
                }
          }
          original={kind === 'manual' ? original : null}
          onTerminal={() => {}}
          onReportOpen={() => {}}
        />,
      )
      await settled(() => expect(read).toHaveBeenCalled())
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      expect(
        read.mock.calls
          .map(([path]) => String(path))
          .some((path) => path.includes('/reports/old-run')),
      ).toBe(false)
      expect(document.body.textContent).not.toContain(
        'dataValidation.report.results.COMPLETE_NO_ISSUES_OBSERVED',
      )
    },
  )
  it('keeps root 1001 searchable by the literal text displayed in its typed key', async () => {
    const name = 'tail-key-a"b\\c'
    const read = vi.fn(async (path: RequestInfo | URL) => {
      const url = new URL(String(path), 'https://test.invalid')
      if (!url.pathname.endsWith('/roots')) return json(report)
      const offset = Number(url.searchParams.get('offset'))
      return json({
        total: '1001',
        offset,
        limit: 20,
        items: Array.from({ length: Math.min(20, 1001 - offset) }, (_, i) => ({
          id: (offset + i + 1).toString(16).padStart(64, '0'),
          root: {
            mappingId: 'orders',
            outputId: 'out',
            ancestors: [],
            key: [
              {
                domain: 'TEXT',
                value: {
                  type: 'text',
                  value: offset + i === 1000 ? name : `key-${offset + i}`,
                  metadata: {},
                },
              },
            ],
          },
          summary: { type: 'object', value: [], metadata: {} },
        })),
      })
    })
    await mount(<ValidationReportPanel client={createValidationClient(read)} reference={ref} />)
    await settled(() =>
      expect(read.mock.calls.some(([path]) => String(path).includes('offset=1000'))).toBe(true),
    )
    await click('dataValidation.report.records')
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="dataValidation.report.searchKey"]',
    )!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, name)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(document.body.textContent).toContain(name)
    expect(button('dataValidation.report.fields')).toBeDefined()
  })
  it('clamps nested value pagination when a cached record replaces a larger value', async () => {
    const value = (count: number): ValidationValue => ({
      type: 'array',
      metadata: {},
      value: Array.from({ length: count }, (_, i) => ({
        type: 'text',
        value: `value-${i}`,
        metadata: {},
      })),
    })
    await mount(<ValidationValueView value={value(21)} />)
    const details = document.querySelector('details')!
    await act(async () => {
      details.open = true
      details.dispatchEvent(new Event('toggle'))
    })
    const next = document.querySelector<HTMLButtonElement>('[aria-label="dataValidation.next"]')!
    await act(async () => next.click())
    expect(document.body.textContent).toContain('value-20')
    await act(async () =>
      root!.render(
        <QueryClientProvider client={queries!}>
          <ValidationValueView value={value(1)} />
        </QueryClientProvider>,
      ),
    )
    expect(document.body.textContent).toContain('value-0')
  })
  it('returns to a valid history page when retention shrinks under page two', async () => {
    let total = 11
    const item = {
      reference: ref,
      method: 'COUNT',
      closed: true,
      terminal: 'COMPLETED',
      terminalKnownAt: null,
      endedAt: null,
      window: null,
      rootCount: '0',
      retainedBytes: '1',
      countedTables: '1',
      mismatchedTables: '0',
    }
    const read = vi.fn(async (path: RequestInfo | URL) => {
      const url = new URL(String(path), 'https://test.invalid'),
        offset = Number(url.searchParams.get('offset'))
      return json({
        total: String(total),
        offset,
        limit: 10,
        items: Array.from({ length: Math.max(0, Math.min(10, total - offset)) }, (_, i) => ({
          ...item,
          reference: { ...ref, sequence: String(offset + i + 1), run: `run-${offset + i + 1}` },
        })),
      })
    })
    await mount(
      <ValidationHistoryPanel
        client={createValidationClient(read)}
        pipelineId="flow"
        taskId="full"
        onBack={() => {}}
      />,
    )
    await settled(() => expect(document.querySelectorAll('ul.space-y-2 > li')).toHaveLength(10))
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="dataValidation.next"]')!.click(),
    )
    await settled(() => expect(document.querySelectorAll('ul.space-y-2 > li')).toHaveLength(1))
    const previousReads = read.mock.calls.length
    total = 1
    await act(async () => {
      await queries!.invalidateQueries()
    })
    await settled(() => expect(read.mock.calls.length).toBeGreaterThan(previousReads))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await settled(() => expect(document.querySelectorAll('ul.space-y-2 > li')).toHaveLength(1))
    expect(document.body.textContent).not.toContain('dataValidation.history.empty')
  })
})
