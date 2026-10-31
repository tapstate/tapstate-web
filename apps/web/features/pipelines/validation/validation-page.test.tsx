import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createValidationClient,
  type ValidationSelection,
  type ValidationTask,
} from '@/service/pipelines/validation-client'
import { useAuthStore } from '@/stores/auth-store'

import { ValidationBulkSettings } from './validation-bulk-settings'
import { ValidationPage } from './validation-page'
import { ValidationRunPanel } from './validation-run-panel'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/service/pipelines/pipeline-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/pipelines/pipeline-client')>()),
  getPipeline: async () => ({
    id: 'flow',
    contentHash: 'hash',
    sources: [{ id: 'source', metadata: null, connector: 'mysql' }],
    transforms: [],
    serve: { id: 'serve', from: ['source.orders'], sync: [{ id: 'out', source: 'target' }] },
    dag: {
      nodes: [
        { id: 'orders', type: 'source', label: 'orders', detail: 'source' },
        { id: 'target', type: 'target', label: 'target', detail: 'target' },
      ],
      edges: [{ id: 'e', source: 'orders', target: 'target', label: 'out' }],
    },
  }),
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined, container: HTMLDivElement | undefined, queries: QueryClient | undefined
const generation = '10000000-0000-4000-8000-000000000001',
  fingerprint = 'a'.repeat(64),
  comparison = 'b'.repeat(64)
const context = {
  cluster: 'cluster',
  node: 'node',
  boot: 'boot',
  member: generation,
  incarnation: '20000000-0000-4000-8000-000000000001',
}
const mapping = {
  mappingId: 'orders',
  outputId: 'out',
  sourceId: 'source',
  sourceTable: 'orders',
  targetSourceId: 'target',
  targetTable: 'checked_orders',
  keys: null,
}
const saved: ValidationTask = {
  pipelineId: 'flow',
  taskId: 'full',
  taskGeneration: generation,
  revision: '1',
  nextStartSequence: '1',
  closed: false,
  method: 'COUNT',
  comparisonFingerprint: comparison,
  historyLimit: 10,
  schedule: null,
  scheduleEnabled: false,
  mappings: [mapping],
  context,
  permission: null,
  scheduleObservation: null,
}
const side = {
  nodeId: 'source',
  sourceId: 'source',
  database: null,
  schema: null,
  table: 'orders',
  modelVersion: 'model',
  codecBinding: 'codec',
  countOperation: 'native-count',
  fields: [],
  candidates: [],
  pipelineWriteKeyUnknown: true,
}
const evaluate = (input: ValidationSelection) => ({
  method: input.method,
  configurationRevision: input.expectedRevision,
  mappingRevision: '1',
  fingerprint,
  comparisonFingerprint: comparison,
  mappings: input.mappings.map((choice) => ({
    id: choice.mappingId,
    source: side,
    target: { ...side, nodeId: 'out', sourceId: 'target', table: 'checked_orders' },
  })),
  premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
  conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
  context,
})
const json = (value: unknown, status = 200) =>
  new Response(value === null ? '' : JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
function noLoadedModels(read: typeof fetch): typeof fetch {
  return (path, init) =>
    String(path).endsWith('/schema') ? Promise.resolve(json(null, 404)) : read(path, init)
}
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
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('real validation page mutation boundaries', () => {
  it.each(['save-precheck', 'disable', 'preview'] as const)(
    'keeps one visible schedule error after %s failure',
    async (stage) => {
      const scheduled: ValidationTask = {
        ...saved,
        scheduleEnabled: true,
        schedule: {
          kind: 'INTERVAL',
          every: '1',
          unit: 'MINUTES',
          anchor: '2026-10-31T00:00:00Z',
          expression: null,
          zoneId: 'UTC',
        },
      }
      const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
        const action = String(path),
          body = init?.body ? JSON.parse(String(init.body)) : null
        if (
          action.endsWith(':evaluate') ||
          (action.endsWith(':schedule-preview') && stage === 'preview')
        )
          return json(
            {
              code: 'validation.value-limit-exceeded',
              params: { limit: 'validation.metadataFrames' },
              message: 'Metadata busy.',
            },
            429,
          )
        if (action.endsWith(':schedule-disable')) throw new TypeError('disable reply lost')
        if (action.endsWith(':schedule-preview'))
          return json({
            base: '2026-10-31T00:00:00Z',
            inputRevision: body.inputRevision,
            zoneId: 'UTC',
            rulesVersion: 'validation-unix-v1',
            occurrences: Array.from({ length: 5 }, (_, i) => ({
              at: `2026-10-31T00:0${i + 1}:00Z`,
              local: `2026-10-31T00:0${i + 1}:00`,
              offset: 'Z',
              weekday: 'SATURDAY',
            })),
          })
        return json(scheduled)
      })
      useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 91 })
      await mount(<ValidationPage pipelineId="flow" />)
      await settled(() => expect(button('dataValidation.schedule.title')).toBeDefined())
      await click('dataValidation.schedule.title')
      if (stage === 'save-precheck') {
        await settled(() => expect(button('dataValidation.schedule.save').disabled).toBe(false))
        await click('dataValidation.schedule.save')
      } else if (stage === 'disable') await click('dataValidation.schedule.disable')
      await settled(() => expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1))
      if (stage === 'preview') expect(button('dataValidation.schedule.save').disabled).toBe(true)
      if (stage === 'disable')
        expect(button('dataValidation.retryOriginalOff').disabled).toBe(false)
    },
  )
  it.each(['evaluate', 'save', 'readback', 'network', 'replay-capacity'] as const)(
    'shows one error and preserves the correct recovery after %s failure',
    async (stage) => {
      let recover = false,
        accepted = false
      let current: ValidationTask = { ...saved, method: 'FULL_COLUMN' }
      const saves: unknown[] = []
      const capacity = () =>
        json(
          {
            code: 'validation.value-limit-exceeded',
            params: { limit: 'validation.metadataFrames' },
            message: 'Validation metadata frames are busy.',
          },
          429,
        )
      const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
        const action = String(path),
          body = init?.body ? JSON.parse(String(init.body)) : null
        if (action.endsWith(':evaluate'))
          return stage === 'evaluate' && !recover ? capacity() : json(evaluate(body))
        if (action.endsWith(':save')) {
          saves.push(body)
          if (!recover && stage === 'save') return capacity()
          if (!recover && stage === 'network') throw new TypeError('save reply lost')
          const outcome = accepted ? 'DUPLICATE' : 'APPLIED'
          accepted = true
          current = { ...saved, method: 'COUNT', revision: '2' }
          if (!recover && stage === 'replay-capacity') {
            if (saves.length === 1) throw new TypeError('committed save reply lost')
            return capacity()
          }
          return json({ outcome, fingerprint, taskGeneration: generation })
        }
        if (accepted && stage === 'readback' && !recover) return capacity()
        return json(current)
      })
      useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 90 })
      await mount(<ValidationPage pipelineId="flow" />)
      await settled(() => expect(button('dataValidation.bulk.save')).toBeDefined())
      await click('dataValidation.methods.COUNT')
      await click('dataValidation.bulk.save')
      if (stage === 'save') expect(button('dataValidation.bulk.save').disabled).toBe(false)
      await settled(() => expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1))
      if (stage === 'evaluate' || stage === 'save') {
        expect(button('dataValidation.bulk.save').disabled).toBe(false)
        expect(document.body.textContent).not.toContain('dataValidation.unknownSave')
        expect(document.body.textContent).not.toContain('dataValidation.retryOriginalSave')
        expect(
          document.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')
            ?.textContent,
        ).toContain('dataValidation.methods.COUNT')
        if (stage === 'evaluate') expect(saves).toHaveLength(0)
        else expect(saves).toHaveLength(1)
        recover = true
        await click('dataValidation.bulk.save')
        await settled(() => expect(document.body.textContent).toContain('dataValidation.saved'))
        if (stage === 'save') {
          expect(saves).toHaveLength(2)
          expect((saves[1] as { commandId: string }).commandId).not.toBe(
            (saves[0] as { commandId: string }).commandId,
          )
          expect((saves[1] as { input: unknown }).input).toEqual(
            (saves[0] as { input: unknown }).input,
          )
        }
      } else {
        expect(button('dataValidation.bulk.save').disabled).toBe(true)
        expect(document.body.textContent).toContain('dataValidation.unknownSave')
        if (stage === 'replay-capacity') {
          await click('dataValidation.retryOriginalSave')
          await settled(() => expect(saves).toHaveLength(2))
          expect(saves[1]).toEqual(saves[0])
          expect(button('dataValidation.bulk.save').disabled).toBe(true)
          expect(document.body.textContent).toContain('dataValidation.unknownSave')
        }
        recover = true
        await click('dataValidation.retryOriginalSave')
        await settled(() => expect(saves).toHaveLength(stage === 'replay-capacity' ? 3 : 2))
        expect(saves.at(-1)).toEqual(saves[0])
        await settled(() => expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0))
      }
    },
  )
  it.each([
    ['NOT_LIVE', 'BORN'],
    ['LIVE', 'BORN'],
    ['UNKNOWN', 'BORN'],
    ['UNKNOWN', 'CLOSED'],
  ] as const)(
    'keeps a recorded successor pinned across lease changes, including a fresh %s/%s view',
    async (initialLease, phase) => {
      const command = '40000000-0000-4000-8000-000000000001'
      const successor = '50000000-0000-4000-8000-000000000001'
      const value: ValidationTask = {
        ...saved,
        nextStartSequence: '2',
        permission: {
          phase,
          taskGeneration: generation,
          revision: '1',
          sequence: '1',
          command,
          run: 'old-born',
          ownerLease: initialLease,
        },
        scheduleObservation: {
          node: 'entry',
          boot: 'entry-boot',
          member: generation,
          context: '60000000-0000-4000-8000-000000000001',
          observedAt: '2026-10-31T00:00:00Z',
          nextDue: null,
          lastDue: '2026-10-31T00:00:00Z',
          state: 'UNKNOWN',
          reason: null,
          command: successor,
          run: 'pending-successor',
          sequence: '2',
        },
      }
      const read = vi.fn(async (_path: RequestInfo | URL, init?: RequestInit) => {
        const original = JSON.parse(String(init?.body))
        return json({
          original,
          run: 'pending-successor',
          outcome: 'UNKNOWN',
          state: null,
          admitted: false,
          waiting: false,
          controlUnknown: true,
          retired: false,
          drain: 'UNKNOWN',
          reason: null,
          tables: [],
          premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
          conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
        })
      })
      const client = createValidationClient(read)
      const view = (ownerLease: typeof initialLease) => (
        <ValidationRunPanel
          client={client}
          task={{ ...value, permission: { ...value.permission!, ownerLease } }}
          original={null}
          onTerminal={() => {}}
          onReportOpen={() => {}}
        />
      )
      await mount(view(initialLease))
      await settled(() =>
        expect(read.mock.calls.some(([path]) => String(path).endsWith(':progress'))).toBe(true),
      )
      const first = read.mock.calls.find(([path]) => String(path).endsWith(':progress'))!
      const original = JSON.parse(String(first[1]?.body))
      expect(original.command).toBe(successor)
      expect(document.body.textContent).not.toContain('dataValidation.run.previousRun')
      expect(document.body.textContent).toContain('dataValidation.run.configurationRevision')
      for (const ownerLease of ['LIVE', 'UNKNOWN'] as const) {
        await act(async () =>
          root!.render(
            <QueryClientProvider client={queries!}>{view(ownerLease)}</QueryClientProvider>,
          ),
        )
        await act(async () => {
          await queries!.invalidateQueries({ queryKey: ['validation', 'progress'] })
        })
        await click('dataValidation.run.stop')
        await settled(() =>
          expect(read.mock.calls.some(([path]) => String(path).endsWith(':stop'))).toBe(true),
        )
        const latest = read.mock.calls.filter(([path]) => String(path).endsWith(':stop')).at(-1)!
        expect(JSON.parse(String(latest[1]?.body))).toEqual(original)
        expect(
          read.mock.calls
            .filter(([path]) => String(path).endsWith(':progress'))
            .every(([, init]) => JSON.parse(String(init?.body)).command === successor),
        ).toBe(true)
      }
      expect(read.mock.calls.some(([path]) => String(path).endsWith(':start'))).toBe(false)
    },
  )
  it('offers loaded model fields in an editable dropdown while absent models stay blank', async () => {
    const read = vi.fn(async () => {
      throw new Error('no independent precheck was requested')
    })
    const hints = [
      {
        key: 'orders',
        outputId: 'out',
        sourceId: 'source',
        table: 'orders',
        targetSourceId: 'target',
        choice: { mappingId: 'orders', outputId: 'out', sourceId: 'source', table: 'orders' },
        reason: null,
        retainedDiscoveryAt: 100,
        sourceFields: ['tenant_id', 'id'],
        targetFields: [],
      },
    ] as const
    const view = (pending: boolean) => (
      <ValidationBulkSettings
        pipelineId="flow"
        client={createValidationClient(read)}
        task={null}
        hints={hints}
        pending={pending}
        onSave={async () => {}}
        onStart={async () => {}}
        onSchedule={() => {}}
        onHistory={() => {}}
      />
    )
    await mount(view(false))
    const inputs = [...container!.querySelectorAll<HTMLInputElement>('input[role="combobox"]')]
    expect(inputs).toHaveLength(2)
    expect(inputs.map((input) => input.value)).toEqual(['', ''])
    const trigger = (side: string) =>
      document.querySelector<HTMLButtonElement>(
        `[aria-label="wizard.search.openOptions · dataValidation.bulk.${side} · orders · 1"]`,
      )!
    await act(async () => trigger('source').click())
    await settled(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(2))
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (node) => node.textContent === 'tenant_id',
    )!
    await act(async () => option.click())
    expect(inputs[0].value).toBe('tenant_id')
    await act(async () => trigger('target').click())
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        inputs[1],
        'manual_id',
      )
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(inputs[1].value).toBe('manual_id')
    expect(button('dataValidation.bulk.save').disabled).toBe(false)
    expect(read).not.toHaveBeenCalled()
    await act(async () => root!.render(view(true)))
    expect(
      [...container!.querySelectorAll<HTMLInputElement>('input[role="combobox"]')].every(
        (input) => input.disabled,
      ),
    ).toBe(true)
    expect(trigger('source').disabled).toBe(true)
  })
  it('does not save under a successor auth session when an old evaluation completes', async () => {
    let complete!: (response: Response) => void, input!: ValidationSelection
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      if (String(path).endsWith(':evaluate')) {
        input = JSON.parse(String(init?.body))
        return new Promise<Response>((resolve) => {
          complete = resolve
        })
      }
      if (String(path).endsWith(':save'))
        return json({ outcome: 'APPLIED', fingerprint, taskGeneration: generation })
      return json(null, 404)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 1 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.save')).toBeDefined())
    await click('dataValidation.methods.COUNT')
    await click('dataValidation.bulk.save')
    await settled(() => expect(input).toBeDefined())
    await act(async () => {
      useAuthStore.setState({ sessionRevision: 2 })
      complete(json(evaluate(input)))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':save'))).toBe(false)
  })
  it('leaves a manual pairing blank rather than zipping independently reversed composite candidates', async () => {
    const fields = [
      { name: 'customer_id', type: 'NUMBER', keyDomain: 'EXACT_NUMBER', unavailableReason: null },
      { name: 'region', type: 'NUMBER', keyDomain: 'EXACT_NUMBER', unavailableReason: null },
    ]
    const read = vi.fn(async (_path: RequestInfo | URL, init?: RequestInit) => {
      const input = JSON.parse(String(init?.body)) as ValidationSelection
      return json({
        ...evaluate(input),
        fingerprint: null,
        comparisonFingerprint: null,
        mappingRevision: null,
        mappings: [
          {
            id: 'orders',
            source: {
              ...side,
              fields,
              candidates: [
                { origin: 'PRIMARY_KEY', fields: ['customer_id', 'region'], issues: [] },
              ],
            },
            target: {
              ...side,
              sourceId: 'target',
              fields,
              candidates: [
                { origin: 'PRIMARY_KEY', fields: ['region', 'customer_id'], issues: [] },
              ],
            },
          },
        ],
      })
    })
    await mount(
      <ValidationBulkSettings
        pipelineId="flow"
        client={createValidationClient(read)}
        task={null}
        hints={[
          {
            key: 'orders',
            outputId: 'out',
            sourceId: 'source',
            table: 'orders',
            targetSourceId: 'target',
            choice: { mappingId: 'orders', outputId: 'out', sourceId: 'source', table: 'orders' },
            reason: null,
            retainedDiscoveryAt: null,
          },
        ]}
        pending={false}
        onSave={async () => {}}
        onStart={async () => {}}
        onSchedule={() => {}}
        onHistory={() => {}}
      />,
    )
    await click('dataValidation.bulk.inspect')
    await settled(() => expect(read).toHaveBeenCalled())
    const targets = [
      ...document.querySelectorAll<HTMLInputElement>(
        'tbody td:nth-child(5) input[role="combobox"]',
      ),
    ]
    expect(targets).toHaveLength(2)
    expect(targets.every((input) => input.value === '')).toBe(true)
    expect(button('dataValidation.bulk.save').disabled).toBe(true)
  })
  it('pauses ambient reads only while preparing a new start and resumes monitoring before its reply', async () => {
    let releaseEvaluation!: () => void
    let releaseStart!: () => void
    const preparing = new Promise<void>((resolve) => {
      releaseEvaluation = resolve
    })
    const submitting = new Promise<void>((resolve) => {
      releaseStart = resolve
    })
    let evaluating = false
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path),
        body = init?.body ? JSON.parse(String(init.body)) : null
      if (action.endsWith(':evaluate')) {
        evaluating = true
        await preparing
        return json(evaluate(body))
      }
      if (action.endsWith(':start')) {
        await submitting
        throw new TypeError('start reply lost')
      }
      if (action.endsWith(':progress'))
        return json({
          original: body,
          run: 'unconfirmed-run',
          outcome: 'UNKNOWN',
          state: null,
          admitted: false,
          waiting: false,
          controlUnknown: true,
          retired: false,
          drain: 'UNKNOWN',
          reason: null,
          tables: [],
          premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
          conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
        })
      return json(saved)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 102 })
    try {
      await mount(<ValidationPage pipelineId="flow" />)
      await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
      await click('dataValidation.bulk.start')
      await settled(() => expect(evaluating).toBe(true))
      const tasks = () =>
        read.mock.calls.filter(([path]) => String(path).endsWith('/validation-tasks/full')).length
      const before = tasks()
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3100))
      })
      expect(tasks()).toBe(before)
      await act(async () => {
        releaseEvaluation()
      })
      await settled(() =>
        expect(read.mock.calls.some(([path]) => String(path).endsWith(':start'))).toBe(true),
      )
      // A possibly admitted START must remain observable even before its transport reply returns.
      await settled(() =>
        expect(read.mock.calls.some(([path]) => String(path).endsWith(':progress'))).toBe(true),
      )
      expect(button('dataValidation.run.stop').disabled).toBe(false)
    } finally {
      await act(async () => {
        releaseEvaluation()
        releaseStart()
      })
    }
  })
  it('identifies the previous completed revision when a new start precheck is refused', async () => {
    const task: ValidationTask = {
      ...saved,
      revision: '6',
      nextStartSequence: '4',
      permission: {
        phase: 'CLOSED',
        taskGeneration: generation,
        revision: '5',
        sequence: '3',
        command: '40000000-0000-4000-8000-000000000001',
        run: 'previous-full',
      },
    }
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path)
      if (action.endsWith(':evaluate'))
        return json(
          {
            code: 'validation.value-limit-exceeded',
            params: { limit: 'validation.metadataFrames' },
            message: 'Metadata busy.',
          },
          429,
        )
      if (action.endsWith(':progress'))
        return json({
          original: JSON.parse(String(init?.body)),
          run: 'previous-full',
          outcome: 'ACCEPTED',
          state: 'COMPLETED',
          admitted: true,
          waiting: false,
          controlUnknown: false,
          retired: true,
          drain: 'UNKNOWN',
          reason: null,
          tables: [],
          premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
          conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
        })
      return json(task)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 101 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
    await click('dataValidation.bulk.start')
    await settled(() => expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1))
    expect(document.body.textContent).toContain('dataValidation.run.startNotSent')
    expect(document.body.textContent).toContain('dataValidation.run.previousRun')
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':start'))).toBe(false)
    expect(document.body.textContent).not.toContain('dataValidation.retryOriginalStart')
    expect(button('dataValidation.bulk.start').disabled).toBe(false)
    expect(button('dataValidation.report.open').disabled).toBe(false)
  })
  it.each([
    { state: 'COMPLETED', retired: true, controlUnknown: false, drain: 'UNKNOWN', polling: false },
    {
      state: 'COMPLETED',
      retired: true,
      controlUnknown: false,
      drain: 'NOT_DRAINED',
      polling: true,
    },
    { state: 'COMPLETED', retired: true, controlUnknown: true, drain: 'UNKNOWN', polling: true },
    { state: 'RUNNING', retired: true, controlUnknown: false, drain: 'UNKNOWN', polling: true },
    { state: 'COMPLETED', retired: false, controlUnknown: false, drain: 'UNKNOWN', polling: true },
  ])('keeps terminal report polling separate from resource settlement: %j', async (observation) => {
    const task: ValidationTask = {
      ...saved,
      nextStartSequence: '2',
      permission: {
        phase: 'CLOSED',
        taskGeneration: generation,
        revision: '1',
        sequence: '1',
        command: '40000000-0000-4000-8000-000000000001',
        run: 'retained',
      },
    }
    const read = vi.fn(async (_path: RequestInfo | URL, init?: RequestInit) =>
      json({
        original: JSON.parse(String(init?.body)),
        run: 'retained',
        outcome: 'ACCEPTED',
        ...observation,
        admitted: true,
        waiting: false,
        reason: null,
        tables: [],
        premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
        conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
      }),
    )
    const onTerminal = vi.fn()
    await mount(
      <ValidationRunPanel
        client={createValidationClient(read)}
        task={task}
        original={null}
        onTerminal={onTerminal}
        onReportOpen={() => {}}
      />,
    )
    await settled(() => expect(document.body.textContent).toContain(observation.drain))
    expect(read).toHaveBeenCalledTimes(1)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2100))
    })
    expect(read).toHaveBeenCalledTimes(observation.polling ? 2 : 1)
    expect(onTerminal).not.toHaveBeenCalled()
  })
  it('retries only the original START after a lost request before entry dispatch', async () => {
    const starts: unknown[] = [],
      read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
        const action = String(path),
          body = init?.body ? JSON.parse(String(init.body)) : null
        if (action.endsWith(':evaluate')) return json(evaluate(body))
        if (action.endsWith(':start')) {
          starts.push(body)
          throw new TypeError('wire failed before entry')
        }
        if (action.endsWith(':progress'))
          return json({
            original: body,
            run: 'unconfirmed-run',
            outcome: 'UNKNOWN',
            state: null,
            admitted: false,
            waiting: false,
            controlUnknown: true,
            retired: false,
            drain: 'UNKNOWN',
            reason: null,
            tables: [],
            premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
            conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
          })
        if (action.includes('/reports/')) return json(null, 404)
        return json(saved)
      })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 3 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
    await click('dataValidation.bulk.start')
    await settled(() => expect(starts).toHaveLength(1))
    await settled(() => expect(button('dataValidation.retryOriginalStart')).toBeDefined())
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1)
    await click('dataValidation.retryOriginalStart')
    await settled(() => expect(starts).toHaveLength(2))
    expect(starts[1]).toEqual(starts[0])
    expect(document.body.textContent).not.toContain('dataValidation.run.startNotSent')
  })
  it('unlocks explicit reload after original-save conflict, including a concurrent fresh creation', async () => {
    const saves: unknown[] = [],
      read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
        const action = String(path),
          body = init?.body ? JSON.parse(String(init.body)) : null
        if (action.endsWith(':evaluate')) return json(evaluate(body))
        if (action.endsWith(':save')) {
          saves.push(body)
          if (saves.length === 1) throw new TypeError('save response lost')
          return json({ outcome: 'CONFLICT', fingerprint: null, taskGeneration: null }, 409)
        }
        return saves.length ? json({ ...saved, revision: '2' }) : json(null, 404)
      })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 4 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.save')).toBeDefined())
    await click('dataValidation.methods.COUNT')
    await click('dataValidation.bulk.save')
    await settled(() => expect(button('dataValidation.retryOriginalSave')).toBeDefined())
    await click('dataValidation.retryOriginalSave')
    await settled(() => expect(saves).toHaveLength(2))
    expect(saves[1]).toEqual(saves[0])
    await settled(() => expect(button('dataValidation.reloadDefinition').disabled).toBe(false))
  })
  it('accepts the canonical saved whole-second anchor without treating a successful save as unknown', async () => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-10-30T00:00:00.000Z')
    let current = saved
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path),
        body = init?.body ? JSON.parse(String(init.body)) : null
      if (action.endsWith(':evaluate')) return json(evaluate(body))
      if (action.endsWith(':schedule-preview'))
        return json({
          base: '2026-10-30T00:00:00Z',
          inputRevision: body.inputRevision,
          zoneId: body.schedule.zoneId,
          rulesVersion: 'validation-unix-v1',
          occurrences: Array.from({ length: 5 }, (_, i) => ({
            at: `2026-11-0${i + 1}T00:00:00Z`,
            local: `2026-11-0${i + 1}T08:00`,
            offset: '+08:00',
            weekday: 'MONDAY',
          })),
        })
      if (action.endsWith(':save')) {
        current = {
          ...saved,
          revision: '2',
          schedule: { ...body.schedule, anchor: body.schedule.anchor.replace('.000Z', 'Z') },
        }
        return json({ outcome: 'APPLIED', fingerprint, taskGeneration: generation })
      }
      return json(current)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 5 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.schedule.title').disabled).toBe(false))
    await click('dataValidation.schedule.title')
    const every = document.getElementById('validation-every') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(every, '1')
      every.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await settled(() => expect(button('dataValidation.schedule.save').disabled).toBe(false))
    await click('dataValidation.schedule.save')
    await settled(() => expect(document.body.textContent).toContain('dataValidation.saved'))
    expect(document.body.textContent).not.toContain('dataValidation.unknownSave')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('offers explicit reload when another writer creates the task before the fresh evaluation', async () => {
    const read = vi.fn(async (path: RequestInfo | URL) =>
      String(path).endsWith(':evaluate')
        ? json(
            {
              code: 'validation.invalid-contract',
              message: 'Task revision changed.',
              params: { field: 'configuration.taskRevision' },
            },
            409,
          )
        : json(null, 404),
    )
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 6 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.save')).toBeDefined())
    await click('dataValidation.methods.COUNT')
    await click('dataValidation.bulk.save')
    await settled(() => expect(button('dataValidation.reloadDefinition').disabled).toBe(false))
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':save'))).toBe(false)
  })
  it('does not create a manual selector when the fresh task read discovers a scheduled permission', async () => {
    let taskReads = 0
    const command = '40000000-0000-4000-8000-000000000001',
      occupied = {
        ...saved,
        nextStartSequence: '2',
        permission: {
          phase: 'BORN',
          taskGeneration: generation,
          revision: '1',
          sequence: '1',
          command,
          run: 'scheduled-live',
        },
      }
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path),
        body = init?.body ? JSON.parse(String(init.body)) : null
      if (action.endsWith(':evaluate')) return json(evaluate(body))
      if (action.endsWith(':progress') || action.endsWith(':stop') || action.endsWith(':start'))
        return json({
          original: body,
          run: 'scheduled-live',
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
        })
      taskReads++
      return json(taskReads >= 3 ? occupied : saved)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 7 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(taskReads).toBe(2))
    await click('dataValidation.bulk.start')
    await settled(() => expect(taskReads).toBeGreaterThanOrEqual(3))
    expect(
      read.mock.calls.some(
        ([path]) => String(path).endsWith(':evaluate') || String(path).endsWith(':start'),
      ),
    ).toBe(false)
    await settled(() => expect(button('dataValidation.run.stop').disabled).toBe(false))
    await click('dataValidation.run.stop')
    const stopped = read.mock.calls.find(([path]) => String(path).endsWith(':stop'))
    expect(JSON.parse(String(stopped?.[1]?.body)).command).toBe(command)
  })
  it('allows a new manual run after an unused scheduled entry is explicitly stopped and fully drained', async () => {
    const command = '50000000-0000-4000-8000-000000000001',
      observed = {
        ...saved,
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
          command,
          run: 'unused-entry',
          sequence: '1',
        },
      }
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) =>
      String(path).endsWith(':progress')
        ? json({
            original: JSON.parse(String(init?.body)),
            run: 'unused-entry',
            outcome: 'ACCEPTED',
            state: 'STOPPED',
            admitted: false,
            waiting: false,
            controlUnknown: false,
            retired: false,
            drain: 'DRAINED',
            reason: null,
            tables: [],
            premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
            conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
          })
        : json(observed),
    )
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 8 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':start'))).toBe(false)
  })
  it('keeps an explicitly opened report fixed while the next scheduled permission appears', async () => {
    const oldCommand = '60000000-0000-4000-8000-000000000001',
      newCommand = '70000000-0000-4000-8000-000000000001'
    let current = {
      ...saved,
      nextStartSequence: '2',
      permission: {
        phase: 'CLOSED',
        taskGeneration: generation,
        revision: '1',
        sequence: '1',
        command: oldCommand,
        run: 'old-report',
      },
    }
    const boundary = {
      readId: 'read',
      contractVersion: 'native-count-v1',
      startedAt: '2026-10-30T00:00:00Z',
      finishedAt: '2026-10-30T00:00:01Z',
    }
    const table = {
      node: 'input',
      source: 'source',
      database: null,
      schema: null,
      table: 'orders',
      modelVersion: null,
      codecBinding: null,
    }
    const report = {
      reference: { pipeline: 'flow', task: 'full', generation, sequence: '1', run: 'old-report' },
      method: 'COUNT',
      mappingRevision: '1',
      rulesVersion: 'direct-full-v1',
      fingerprint,
      mappings: [
        {
          id: 'orders',
          outputKind: 'SYNC',
          output: 'out',
          source: table,
          target: { ...table, node: 'out', source: 'target', table: 'checked_orders' },
          keys: null,
        },
      ],
      closed: true,
      terminal: 'COMPLETED',
      terminalKnownAt: boundary.finishedAt,
      endedAt: boundary.finishedAt,
      window: { startedAt: boundary.startedAt, finishedAt: boundary.finishedAt },
      failure: null,
      rootCount: '0',
      retainedBytes: '1',
      counts: [
        {
          mapping: 'orders',
          output: 'out',
          source: '1',
          target: '1',
          difference: '0',
          sourceRead: boundary,
          targetRead: boundary,
        },
      ],
      result: 'COMPLETE_NO_ISSUES_OBSERVED',
      premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
      premiseVerifiedBySystem: false,
      conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
      physicalDrain: 'UNKNOWN',
    }
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path),
        body = init?.body ? JSON.parse(String(init.body)) : null
      if (action.endsWith(':progress'))
        return json({
          original: body,
          run: body.command === oldCommand ? 'old-report' : 'next-report',
          outcome: 'ACCEPTED',
          state: body.command === oldCommand ? 'COMPLETED' : 'RUNNING',
          admitted: true,
          waiting: false,
          controlUnknown: false,
          retired: body.command === oldCommand,
          drain: body.command === oldCommand ? 'DRAINED' : 'NOT_DRAINED',
          reason: null,
          tables: [],
          premise: report.premise,
          conclusionScope: report.conclusionScope,
        })
      if (action.includes('/reports/old-report')) return json(report)
      return json(current)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 9 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.report.open').disabled).toBe(false))
    await click('dataValidation.report.open')
    await settled(() =>
      expect(document.body.textContent).toContain(
        'dataValidation.report.results.COMPLETE_NO_ISSUES_OBSERVED',
      ),
    )
    current = {
      ...current,
      nextStartSequence: '3',
      permission: {
        ...current.permission,
        phase: 'BORN',
        sequence: '2',
        command: newCommand,
        run: 'next-report',
      },
    }
    await act(async () => {
      await queries!.invalidateQueries()
    })
    await settled(() =>
      expect(
        read.mock.calls.filter(([path]) => String(path).endsWith('/validation-tasks/full')).length,
      ).toBeGreaterThan(2),
    )
    expect(document.body.textContent).toContain(
      'dataValidation.report.results.COMPLETE_NO_ISSUES_OBSERVED',
    )
    expect(read.mock.calls.some(([path]) => String(path).includes('/reports/next-report'))).toBe(
      false,
    )
    expect(document.querySelector('[aria-label="dataValidation.run.title"]')).toBeNull()
  })
  it('keeps schedule OFF available during an admitted manual run and preserves its original revision', async () => {
    const schedule = {
      kind: 'CRON',
      every: null,
      unit: null,
      anchor: null,
      expression: '0 2 * * *',
      zoneId: 'UTC',
    }
    let current = { ...saved, schedule, scheduleEnabled: true }
    const read = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      const action = String(path),
        body = init?.body ? JSON.parse(String(init.body)) : null
      if (action.endsWith(':evaluate')) return json(evaluate(body))
      if (action.endsWith(':start'))
        current = {
          ...current,
          nextStartSequence: '2',
          permission: {
            phase: 'BORN',
            taskGeneration: generation,
            revision: '1',
            sequence: '1',
            command: body.command,
            run: 'manual-run',
          },
        } as typeof current
      if (action.endsWith(':progress') || action.endsWith(':start'))
        return json({
          original: body,
          run: 'manual-run',
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
        })
      if (action.endsWith(':schedule-disable')) {
        current = { ...current, revision: '2', scheduleEnabled: false }
        return json({
          outcome: 'APPLIED',
          taskGeneration: generation,
          receiptRevision: '2',
          command: body.command,
          scheduleEnabled: false,
        })
      }
      if (action.endsWith(':schedule-preview'))
        return json({
          base: '2026-10-30T00:00:00Z',
          inputRevision: body.inputRevision,
          zoneId: body.schedule.zoneId,
          rulesVersion: 'validation-unix-v1',
          occurrences: Array.from({ length: 5 }, (_, i) => ({
            at: `2026-11-0${i + 1}T00:00:00Z`,
            local: `2026-11-0${i + 1}T00:00`,
            offset: '+00:00',
            weekday: 'MONDAY',
          })),
        })
      return json(current)
    })
    useAuthStore.setState({ apiFetch: noLoadedModels(read), sessionRevision: 10 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
    await click('dataValidation.bulk.start')
    await settled(() => expect(button('dataValidation.run.stop').disabled).toBe(false))
    expect(button('dataValidation.schedule.title').disabled).toBe(false)
    await click('dataValidation.schedule.title')
    await click('dataValidation.schedule.disable')
    await settled(() => expect(document.body.textContent).toContain('dataValidation.schedule.off'))
    expect(read.mock.calls.filter(([path]) => String(path).endsWith(':start'))).toHaveLength(1)
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':stop'))).toBe(false)
    const progress = read.mock.calls.find(([path]) => String(path).endsWith(':progress'))
    expect(JSON.parse(String(progress?.[1]?.body)).revision).toBe('1')
  })
})
