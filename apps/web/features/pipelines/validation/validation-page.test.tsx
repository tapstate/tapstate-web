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
  vi.restoreAllMocks()
})

describe('real validation page mutation boundaries', () => {
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
    useAuthStore.setState({ apiFetch: read, sessionRevision: 1 })
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
    expect(
      [...document.querySelectorAll<HTMLInputElement>('input[list^="validation-target-"]')].every(
        (input) => input.value === '',
      ),
    ).toBe(true)
    expect(button('dataValidation.bulk.save').disabled).toBe(true)
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
    useAuthStore.setState({ apiFetch: read, sessionRevision: 3 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.start').disabled).toBe(false))
    await click('dataValidation.bulk.start')
    await settled(() => expect(starts).toHaveLength(1))
    await settled(() => expect(button('dataValidation.retryOriginalStart')).toBeDefined())
    await click('dataValidation.retryOriginalStart')
    await settled(() => expect(starts).toHaveLength(2))
    expect(starts[1]).toEqual(starts[0])
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
    useAuthStore.setState({ apiFetch: read, sessionRevision: 4 })
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
    useAuthStore.setState({ apiFetch: read, sessionRevision: 5 })
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
    useAuthStore.setState({ apiFetch: read, sessionRevision: 6 })
    await mount(<ValidationPage pipelineId="flow" />)
    await settled(() => expect(button('dataValidation.bulk.save')).toBeDefined())
    await click('dataValidation.methods.COUNT')
    await click('dataValidation.bulk.save')
    await settled(() => expect(button('dataValidation.reloadDefinition').disabled).toBe(false))
    expect(read.mock.calls.some(([path]) => String(path).endsWith(':save'))).toBe(false)
  })
})
