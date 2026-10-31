import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import type {
  createValidationClient,
  ValidationOperation,
  ValidationTask,
} from '@/service/pipelines/validation-client'

import { ValidationHistoryPanel } from './validation-history-panel'
import { ValidationRunPanel } from './validation-run-panel'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const generation = '10000000-0000-4000-8000-000000000001'
const operation: ValidationOperation = {
  context: {
    cluster: 'cluster',
    node: 'node',
    boot: 'boot',
    member: generation,
    incarnation: generation,
  },
  pipeline: 'flow',
  task: 'full',
  taskGeneration: generation,
  revision: '1',
  sequence: '1',
  command: generation,
}
const task: ValidationTask = {
  pipelineId: 'flow',
  taskId: 'full',
  taskGeneration: generation,
  revision: '1',
  nextStartSequence: '2',
  closed: false,
  method: 'COUNT',
  comparisonFingerprint: 'a'.repeat(64),
  historyLimit: 10,
  schedule: null,
  scheduleEnabled: false,
  mappings: [
    {
      mappingId: 'orders',
      outputId: 'out',
      sourceId: 'mysql',
      sourceTable: 'orders',
      targetSourceId: 'mongo',
      targetTable: 'checked_orders',
      keys: null,
    },
  ],
  context: operation.context,
  permission: null,
  scheduleObservation: null,
}
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, queries: QueryClient
async function mount(view: React.ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(<QueryClientProvider client={queries}>{view}</QueryClientProvider>),
  )
}
function button(label: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (n) => n.textContent === label,
  )
  if (!node) throw new Error('Missing ' + label)
  return node
}
async function click(label: string) {
  await act(async () => button(label).click())
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
afterEach(async () => {
  await act(async () => root?.unmount())
  queries?.clear()
  host?.remove()
  vi.restoreAllMocks()
})
it('confirms the exact original Stop and keeps Cancel and refresh read-only', async () => {
  const progress = vi.fn(async () => ({
    original: operation,
    run: 'run',
    outcome: 'ACCEPTED',
    state: 'RUNNING',
    admitted: true,
    waiting: false,
    controlUnknown: false,
    retired: false,
    drain: 'NOT_DRAINED',
    reason: null,
    tables: [{ mapping: 'orders', phase: 'READ_COMPLETE' }],
    premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
    conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
  }))
  const stop = vi.fn(async () => undefined),
    start = vi.fn()
  const client = { progress, stop, start } as unknown as ReturnType<typeof createValidationClient>
  await mount(
    <ValidationRunPanel
      client={client}
      task={task}
      original={operation}
      onTerminal={() => {}}
      onReportOpen={() => {}}
    />,
  )
  await wait(() => expect(progress).toHaveBeenCalledTimes(1))
  await click('dataValidation.run.stop')
  expect(stop).not.toHaveBeenCalled()
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
  await click('dataValidation.cancel')
  expect(stop).not.toHaveBeenCalled()
  await click('dataValidation.run.refresh')
  await wait(() => expect(progress).toHaveBeenCalledTimes(2))
  await click('dataValidation.run.stop')
  await click('dataValidation.run.confirmStop')
  await wait(() => expect(stop).toHaveBeenCalledExactlyOnceWith(operation))
  expect(start).not.toHaveBeenCalled()
  expect(document.querySelector('table')?.textContent).toContain('checked_orders')
  expect(document.body.textContent).toContain('dataValidation.run.phases.READ_COMPLETE')
})
it('shows the actual end time and restores focus from report to its history row', async () => {
  const reference = {
    pipeline: 'flow',
    task: 'full',
    generation,
    sequence: '1',
    run: 'retained-run',
  }
  const client = {
    history: vi.fn(async () => ({
      total: '1',
      items: [
        {
          reference,
          method: 'COUNT',
          closed: true,
          terminal: 'COMPLETED',
          terminalKnownAt: '2026-10-30T03:00:00Z',
          endedAt: '2026-10-30T02:00:00Z',
          window: { startedAt: '2026-10-30T01:00:00Z', finishedAt: '2026-10-30T02:00:00Z' },
          rootCount: '0',
          retainedBytes: '0',
          countedTables: '1',
          mismatchedTables: '1',
        },
      ],
    })),
    report: vi.fn(async () => null),
  } as unknown as ReturnType<typeof createValidationClient>
  await mount(
    <ValidationHistoryPanel client={client} pipelineId="flow" taskId="full" onBack={() => {}} />,
  )
  await wait(() => expect(document.querySelector('table')).not.toBeNull())
  expect(document.querySelector('table')?.textContent).toContain('2026-10-30T02:00:00Z')
  expect(document.querySelector('table')?.textContent).not.toContain('2026-10-30T01:00:00Z')
  await click('dataValidation.history.open')
  await click('dataValidation.history.backList')
  await wait(() => expect(document.activeElement).toBe(button('dataValidation.history.open')))
})

it('does not redirect an open Stop confirmation to a successor operation', async () => {
  const next = { ...operation, command: '20000000-0000-4000-8000-000000000002' }
  const stop = vi.fn(async () => undefined)
  const client = {
    progress: async (original: ValidationOperation) => ({
      original,
      run: 'run',
      outcome: 'ACCEPTED',
      state: 'RUNNING',
      admitted: true,
      waiting: false,
      controlUnknown: false,
      retired: false,
      drain: 'NOT_DRAINED',
      reason: null,
      tables: [],
      premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
      conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
    }),
    stop,
  } as unknown as ReturnType<typeof createValidationClient>
  const view = (original: ValidationOperation) => (
    <ValidationRunPanel
      client={client}
      task={task}
      original={original}
      onTerminal={() => {}}
      onReportOpen={() => {}}
    />
  )
  await mount(view(operation))
  await wait(() => expect(document.body.textContent).toContain('dataValidation.run.states.RUNNING'))
  await click('dataValidation.run.stop')
  await act(async () =>
    root.render(<QueryClientProvider client={queries}>{view(next)}</QueryClientProvider>),
  )
  expect(button('dataValidation.run.confirmStop').disabled).toBe(true)
  await click('dataValidation.run.confirmStop')
  expect(stop).not.toHaveBeenCalled()
  await click('dataValidation.cancel')
  await click('dataValidation.run.stop')
  await click('dataValidation.run.confirmStop')
  await wait(() => expect(stop).toHaveBeenCalledExactlyOnceWith(next))
})

it('distinguishes filtered history emptiness and supports date search over retained summaries', async () => {
  const reference = {
    pipeline: 'flow',
    task: 'full',
    generation,
    sequence: '1',
    run: 'retained-run',
  }
  const client = {
    history: async () => ({
      total: '1',
      items: [
        {
          reference,
          method: 'COUNT',
          closed: true,
          terminal: 'COMPLETED',
          endedAt: '2026-10-30T02:00:00Z',
          terminalKnownAt: null,
          window: null,
          rootCount: '0',
          retainedBytes: '0',
          countedTables: '1',
          mismatchedTables: '0',
        },
      ],
    }),
  } as unknown as ReturnType<typeof createValidationClient>
  await mount(
    <ValidationHistoryPanel client={client} pipelineId="flow" taskId="full" onBack={() => {}} />,
  )
  await wait(() => expect(document.querySelectorAll('table tbody tr')).toHaveLength(1))
  const search = document.querySelector<HTMLInputElement>(
    '[aria-label="dataValidation.history.search"]',
  )!
  const change = async (value: string) =>
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, value)
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
  await change('2026-10-30')
  expect(document.querySelectorAll('table tbody tr')).toHaveLength(1)
  await change('no-match')
  expect(document.body.textContent).toContain('dataValidation.history.noMatches')
  expect(document.body.textContent).not.toContain('dataValidation.history.empty')
  await click('dataValidation.history.clearFilters')
  expect(document.querySelectorAll('table tbody tr')).toHaveLength(1)
})
