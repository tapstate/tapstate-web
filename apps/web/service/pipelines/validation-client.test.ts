import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from '../source-client'

import { PipelineClientError } from './pipeline-client'
import {
  createValidationClient,
  type ValidationOperation,
  type ValidationReference,
  type ValidationSchedule,
  type ValidationSelection,
} from './validation-client'

const generation = '12121212-1212-4212-8212-121212121212'
const command = '34343434-3434-4434-8434-343434343434'
const fingerprint = 'a'.repeat(64)
const big = '9007199254740993'
const context = {
  cluster: 'cluster',
  node: 'node',
  boot: 'boot',
  member: generation,
  incarnation: command,
}
const original: ValidationOperation = {
  context,
  pipeline: 'flow',
  task: 'task',
  taskGeneration: generation,
  revision: big,
  sequence: big,
  command,
}
const reference: ValidationReference = {
  pipeline: 'flow',
  task: 'task',
  generation,
  sequence: big,
  run: 'full-original',
}
const selection: ValidationSelection = {
  pipelineId: 'flow',
  taskId: 'task',
  expectedRevision: '0',
  method: 'COUNT',
  mappings: [{ mappingId: 'orders', outputId: 'out', sourceId: 'input', table: 'orders' }],
  confirmations: {},
}
const schedule: ValidationSchedule = {
  kind: 'INTERVAL',
  every: '1',
  unit: 'MINUTES',
  anchor: '2026-10-30T00:00:00Z',
  expression: null,
  zoneId: 'Asia/Shanghai',
}
const side = {
  nodeId: 'input',
  sourceId: 'input',
  database: 'db',
  schema: null,
  table: 'orders',
  modelVersion: null,
  codecBinding: null,
  countOperation: 'native-count',
  fields: [],
  candidates: [],
  pipelineWriteKeyUnknown: true,
}
const evaluated = {
  method: 'COUNT',
  configurationRevision: big,
  mappingRevision: big,
  fingerprint,
  comparisonFingerprint: fingerprint,
  mappings: [
    {
      id: 'orders',
      source: side,
      target: { ...side, nodeId: 'out', sourceId: 'target', table: 'checked_orders' },
    },
  ],
  premise: 'INITIAL_SYNC_FINISHED_AND_BOTH_SIDES_STABLE',
  conclusionScope: 'READ_OBSERVATIONS_NO_COMMON_TIME_SNAPSHOT',
  context,
}
const task = {
  pipelineId: 'flow',
  taskId: 'task',
  taskGeneration: generation,
  revision: '9007199254740994',
  nextStartSequence: '9007199254740995',
  closed: false,
  method: 'COUNT',
  comparisonFingerprint: fingerprint,
  historyLimit: 10,
  schedule,
  scheduleEnabled: false,
  mappings: [
    {
      mappingId: 'orders',
      outputId: 'out',
      sourceId: 'input',
      sourceTable: 'orders',
      targetSourceId: 'target',
      targetTable: 'checked_orders',
      keys: null,
    },
  ],
  context,
  permission: {
    phase: 'BORN',
    taskGeneration: generation,
    revision: big,
    sequence: big,
    command,
    run: reference.run,
  },
  scheduleObservation: null,
}
const execution = {
  original,
  run: reference.run,
  outcome: 'ACCEPTED',
  state: 'RUNNING',
  admitted: true,
  waiting: false,
  controlUnknown: false,
  retired: false,
  drain: 'NOT_DRAINED',
  reason: null,
  tables: [{ mapping: 'orders', phase: 'READING' }],
  premise: evaluated.premise,
  conclusionScope: evaluated.conclusionScope,
}
const boundary = {
  readId: 'read',
  contractVersion: 'v1',
  startedAt: '2026-10-30T00:00:00.000000001Z',
  finishedAt: '2026-10-30T00:00:01.000000002Z',
}
const count = {
  mapping: 'orders',
  output: 'out',
  source: big,
  target: big,
  difference: '0',
  sourceRead: boundary,
  targetRead: boundary,
}
const reportTable = {
  node: 'input',
  source: 'input',
  database: 'db',
  schema: null,
  table: 'orders',
  modelVersion: null,
  codecBinding: null,
}
const report = {
  reference,
  method: 'COUNT',
  mappingRevision: big,
  rulesVersion: 'direct-full-v1',
  fingerprint,
  mappings: [
    {
      id: 'orders',
      outputKind: 'SYNC',
      output: 'out',
      source: reportTable,
      target: { ...reportTable, node: 'out', source: 'target', table: 'checked_orders' },
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
  retainedBytes: big,
  counts: [count],
  result: 'COMPLETE_NO_ISSUES_OBSERVED',
  premise: evaluated.premise,
  premiseVerifiedBySystem: false,
  conclusionScope: evaluated.conclusionScope,
  physicalDrain: 'UNKNOWN',
}
const summary = {
  reference,
  method: 'COUNT',
  closed: true,
  terminal: 'COMPLETED',
  terminalKnownAt: boundary.finishedAt,
  endedAt: boundary.finishedAt,
  window: report.window,
  rootCount: '0',
  retainedBytes: big,
  countedTables: '1',
  mismatchedTables: '0',
}
const text = (value: string) => ({ type: 'text', value, metadata: {} })
const root = {
  mappingId: 'orders',
  outputId: 'out',
  key: [
    { domain: 'EXACT_NUMBER', value: { type: 'decimal', value: big, metadata: { scale: '0' } } },
  ],
  ancestors: [],
}
const rootDetail = { id: 'b'.repeat(64), revision: big, root, observation: text('value') }
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
function fixture(responses: Response[]) {
  const requests: Request[] = [],
    inits: (RequestInit | undefined)[] = []
  const fetcher: ApiFetcher = async (input, init) => {
    inits.push(init)
    const headers = new Headers(init?.headers)
    headers.set('authorization', 'Bearer fixture-auth')
    requests.push(
      new Request(typeof input === 'string' ? `http://test${input}` : input, { ...init, headers }),
    )
    const response = responses.shift()
    if (!response) throw new Error('unexpected extra request')
    return response
  }
  return { client: createValidationClient(fetcher), requests, inits }
}

describe('direct full validation client', () => {
  it.each(['UNIQUE_KEY', 'FULL_COLUMN'] as const)(
    'accepts the unconfirmed %s metadata step without inventing a ready fingerprint',
    async (method) => {
      const metadata = {
        ...side,
        countOperation: null,
        modelVersion: 'model',
        codecBinding: 'codec',
        fields: [
          { name: 'id', type: 'NUMBER', keyDomain: 'EXACT_NUMBER', unavailableReason: null },
        ],
        candidates: [{ origin: 'PRIMARY_KEY', fields: ['id'], issues: [] }],
      }
      const view = {
        ...evaluated,
        method,
        mappingRevision: null,
        fingerprint: null,
        comparisonFingerprint: null,
        mappings: [
          {
            id: 'orders',
            source: metadata,
            target: { ...metadata, nodeId: 'out', sourceId: 'target' },
          },
        ],
      }
      const f = fixture([json(view)])
      const result = await f.client.evaluate({ ...selection, method })
      expect(result.fingerprint).toBeNull()
      expect(result.mappingRevision).toBeNull()
      expect(result.mappings[0].source.candidates[0].fields).toEqual(['id'])
    },
  )

  it('preserves an explicitly unknown binary subtype and rejects values outside the runtime range', async () => {
    const binary = {
      type: 'binary',
      value: 'AAH/',
      metadata: { subtype: '-1', encoding: 'base64' },
    }
    const f = fixture([
      json({ ...rootDetail, observation: binary }),
      json({
        ...rootDetail,
        observation: { ...binary, metadata: { ...binary.metadata, subtype: '-2' } },
      }),
      json({
        ...rootDetail,
        observation: { ...binary, metadata: { ...binary.metadata, subtype: '256' } },
      }),
    ])
    expect((await f.client.root(reference, rootDetail.id))?.observation).toEqual(binary)
    await expect(f.client.root(reference, rootDetail.id)).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(f.client.root(reference, rootDetail.id)).rejects.toMatchObject({
      kind: 'protocol',
    })
  })

  it('cancels an oversized stream before buffering its payload, including without Content-Length', async () => {
    let canceled = false,
      reads = 0
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (reads++ === 0) controller.enqueue(new Uint8Array(64 * 1024 * 1024 + 1))
          else controller.close()
        },
        cancel() {
          canceled = true
        },
      },
      { highWaterMark: 0 },
    )
    const client = createValidationClient(async () => new Response(stream))
    await expect(client.report(reference)).rejects.toMatchObject({ kind: 'protocol' })
    expect(canceled).toBe(true)
  })

  it('connects the actual authenticated endpoints without ETags, local persistence or numeric coercion', async () => {
    const occurrence = {
      at: boundary.startedAt,
      local: '2026-10-30T08:00:00',
      offset: '+08:00',
      weekday: 'FRIDAY',
    }
    const preview = {
      base: boundary.startedAt,
      inputRevision: big,
      zoneId: schedule.zoneId,
      rulesVersion: 'validation-unix-v1',
      occurrences: Array.from({ length: 5 }, () => occurrence),
    }
    const f = fixture([
      json(evaluated),
      json({ outcome: 'APPLIED', fingerprint, taskGeneration: generation }),
      json(task),
      json(preview),
      json(execution),
      json(execution),
      json(execution),
      json({ items: [summary], total: big, offset: 0, limit: 10 }),
      json(report),
      json({
        items: [{ id: rootDetail.id, root, summary: text('summary') }],
        total: '1',
        offset: 0,
        limit: 10,
      }),
      json(rootDetail),
      json({
        outcome: 'APPLIED',
        taskGeneration: generation,
        receiptRevision: '9007199254740994',
        command,
        scheduleEnabled: false,
      }),
    ])
    const selected = await f.client.evaluate(selection)
    expect(selected.configurationRevision).toBe(big)
    const save = {
      input: selection,
      fingerprint,
      commandId: command,
      historyLimit: 10,
      scheduleEnabled: false,
    }
    expect((await f.client.save(save)).taskGeneration).toBe(generation)
    const saved = await f.client.task('flow', 'task')
    expect(saved?.revision).toBe('9007199254740994')
    expect(saved?.permission?.revision).toBe(big)
    expect(
      (await f.client.previewSchedule({ schedule, inputRevision: big })).occurrences,
    ).toHaveLength(5)
    await f.client.start(original)
    await f.client.progress(original)
    await f.client.stop(original)
    expect((await f.client.history('flow', 'task')).total).toBe(big)
    expect((await f.client.report(reference))?.counts[0].source).toBe(big)
    expect((await f.client.roots(reference))?.items[0].id).toBe(rootDetail.id)
    expect((await f.client.root(reference, rootDetail.id))?.revision).toBe(big)
    await f.client.disableSchedule({
      pipeline: 'flow',
      task: 'task',
      taskGeneration: generation,
      expectedRevision: big,
      command,
    })
    expect(f.requests.map((request) => new URL(request.url).pathname)).toEqual([
      '/api/validation:evaluate',
      '/api/validation:save',
      '/api/pipelines/flow/validation-tasks/task',
      '/api/validation:schedule-preview',
      '/api/validation:start',
      '/api/validation:progress',
      '/api/validation:stop',
      '/api/pipelines/flow/validation-tasks/task/reports',
      '/api/pipelines/flow/validation-tasks/task/reports/full-original',
      '/api/pipelines/flow/validation-tasks/task/reports/full-original/roots',
      `/api/pipelines/flow/validation-tasks/task/reports/full-original/roots/${rootDetail.id}`,
      '/api/validation:schedule-disable',
    ])
    const sentSave = await f.requests[1].json()
    expect(sentSave).toEqual(save)
    expect(sentSave.input).not.toHaveProperty('taskGeneration')
    for (const request of f.requests) {
      expect(request.headers.get('authorization')).toBe('Bearer fixture-auth')
      expect(request.headers.has('if-match')).toBe(false)
    }
    const query = new URL(f.requests[8].url).searchParams
    expect(query.get('generation')).toBe(generation)
    expect(query.get('sequence')).toBe(big)
  })

  it('returns structured mutation refusals at HTTP 409 rather than discarding their receipts', async () => {
    const refused = { outcome: 'CONFLICT', fingerprint: 'c'.repeat(64), taskGeneration: null }
    const off = {
      outcome: 'CLOSED',
      taskGeneration: null,
      receiptRevision: null,
      command,
      scheduleEnabled: null,
    }
    const f = fixture([json(refused, 409), json(off, 409)])
    await expect(
      f.client.save({
        input: selection,
        fingerprint,
        commandId: command,
        historyLimit: 10,
        scheduleEnabled: false,
      }),
    ).resolves.toEqual(refused)
    await expect(
      f.client.disableSchedule({
        pipeline: 'flow',
        task: 'task',
        taskGeneration: generation,
        expectedRevision: big,
        command,
      }),
    ).resolves.toEqual(off)
  })

  it('distinguishes empty-body absence from a coded 404 or an empty history page', async () => {
    const f = fixture([
      new Response(null, { status: 404 }),
      new Response(null, { status: 404 }),
      json({ items: [], total: '0', offset: 0, limit: 10 }),
      json(
        {
          code: 'control.storage-unavailable',
          params: { scope: 'original' },
          message: 'Unavailable',
        },
        404,
      ),
    ])
    await expect(f.client.task('flow', 'task')).resolves.toBeNull()
    await expect(f.client.report(reference)).resolves.toBeNull()
    expect((await f.client.history('flow', 'task')).items).toEqual([])
    await expect(f.client.report(reference)).rejects.toMatchObject({
      kind: 'server',
      status: 404,
      code: 'control.storage-unavailable',
      params: { scope: 'original' },
    })
  })

  it('preserves original retry coordinates and never redispatches an unknown outcome', async () => {
    const unknown = {
      ...execution,
      outcome: 'UNKNOWN',
      state: null,
      admitted: false,
      controlUnknown: true,
      drain: 'UNKNOWN',
      tables: [],
    }
    const f = fixture([json(unknown), json(unknown), json(unknown), json(unknown)])
    expect((await f.client.start(original)).outcome).toBe('UNKNOWN')
    expect(f.requests).toHaveLength(1)
    await f.client.start(original)
    await f.client.progress(original)
    await f.client.stop(original)
    for (const request of f.requests) expect(await request.json()).toEqual(original)
  })

  it('rejects a response that silently changes the original member or command coordinates', async () => {
    const f = fixture([
      json({
        ...execution,
        original: { ...original, context: { ...context, incarnation: generation } },
      }),
    ])
    await expect(f.client.start(original)).rejects.toMatchObject({ kind: 'protocol' })
    expect(f.requests).toHaveLength(1)
  })

  it('preserves typed precision, native metadata, float bits, binary subtype and literal object-entry order', async () => {
    const payload = {
      type: 'object',
      metadata: {},
      value: [
        { name: '__proto__', value: text('literal') },
        {
          name: 'a.b',
          value: {
            type: 'typed',
            metadata: {
              logicalType: 'decimal',
              codecBinding: 'custom-codec',
              conversionOrigin: 'pdk-codec',
              nativeType: 'DECIMAL(38,18)',
            },
            value: {
              type: 'decimal',
              value: '900719925474099312345678901234567890',
              metadata: { scale: '-2147483648' },
            },
          },
        },
        { name: '$numberLong', value: text('ordinary field') },
        {
          name: 'negative-zero',
          value: { type: 'float64-bits', value: '8000000000000000', metadata: {} },
        },
        {
          name: 'binary',
          value: {
            type: 'binary',
            value: 'AAH/',
            metadata: { subtype: '128', encoding: 'base64' },
          },
        },
        { name: 'null', value: { type: 'null', value: null, metadata: {} } },
        { name: 'empty', value: text('') },
      ],
    }
    const f = fixture([json({ ...rootDetail, observation: payload })])
    expect((await f.client.root(reference, rootDetail.id))?.observation).toEqual(payload)
    expect(Object.hasOwn(Object.prototype, 'literal')).toBe(false)
  })

  it.each([
    ['numeric count', { ...report, counts: [{ ...count, source: 42 }] }],
    ['missing count', { ...report, counts: [{ ...count, source: undefined }] }],
    ['missing counter', { ...report, rootCount: undefined }],
    ['unverified stability promoted', { ...report, premiseVerifiedBySystem: true }],
    ['failed run promoted', { ...report, terminal: 'FAILED' }],
    ['missing table coverage', { ...report, counts: [] }],
    ['incorrect difference', { ...report, counts: [{ ...count, difference: '1' }] }],
    ['hidden root observations', { ...report, rootCount: '1' }],
  ])('refuses %s rather than manufacturing a complete no-issues report', async (_name, body) => {
    const f = fixture([json(body)])
    await expect(f.client.report(reference)).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('rejects excessive typed-value nesting and unsafe numeric values inside typed envelopes', async () => {
    let nested: unknown = text('leaf')
    for (let depth = 0; depth < 65; depth++)
      nested = { type: 'array', value: [nested], metadata: {} }
    const f = fixture([
      json({ ...rootDetail, observation: nested }),
      json({ ...rootDetail, observation: { type: 'int64', value: 42, metadata: {} } }),
    ])
    await expect(f.client.root(reference, rootDetail.id)).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(f.client.root(reference, rootDetail.id)).rejects.toMatchObject({
      kind: 'protocol',
    })
  })

  it('preserves coded capacity errors and aborts without retrying a mutating request', async () => {
    const f = fixture([
      json(
        {
          code: 'validation.value-limit-exceeded',
          params: { limit: 'validation.metadataFrames' },
          message: 'Busy',
        },
        429,
      ),
    ])
    await expect(f.client.start(original)).rejects.toMatchObject({
      kind: 'server',
      status: 429,
      code: 'validation.value-limit-exceeded',
    })
    expect(f.requests).toHaveLength(1)
    const aborted = new DOMException('Aborted', 'AbortError')
    await expect(
      createValidationClient(async () => {
        throw aborted
      }).start(original),
    ).rejects.toBe(aborted)
  })

  it('classifies a truncated response as unknown network completion rather than a successful mutation', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error('private-body-sentinel'))
      },
    })
    const client = createValidationClient(async () => new Response(stream))
    await expect(client.start(original)).rejects.toMatchObject({ kind: 'network' })
  })

  it('escapes opaque path segments, rejects invalid paging and refuses a different report identity', async () => {
    const foreign = {
      ...reference,
      pipeline: 'flow/other',
      task: 'task with spaces',
      run: 'full/one',
    }
    const f = fixture([
      json({ ...report, reference: foreign }),
      json({ ...report, reference: { ...reference, sequence: '1' } }),
    ])
    await f.client.report(foreign)
    expect(new URL(f.requests[0].url).pathname).toBe(
      '/api/pipelines/flow%2Fother/validation-tasks/task%20with%20spaces/reports/full%2Fone',
    )
    await expect(f.client.report(reference)).rejects.toMatchObject({ kind: 'protocol' })
    await expect(f.client.roots(reference, { limit: 21 })).rejects.toBeInstanceOf(
      PipelineClientError,
    )
    expect(f.requests).toHaveLength(2)
  })
  it('reads only bounded server-scoped name hints and checks their original Source identity', async () => {
    const hints = {
      connectionId: 'source/a',
      connectorId: 'mysql',
      tables: [{ name: 'orders' }],
      discoveredAt: 100,
    }
    const f = fixture([
      json(hints),
      new Response(null, { status: 404 }),
      json({ ...hints, connectionId: 'other' }),
      json({ ...hints, tables: [{ name: 'orders' }, { name: 'orders' }] }),
    ])
    expect(await f.client.sourceHints('source/a')).toEqual(hints)
    expect(new URL(f.requests[0].url).pathname).toBe('/api/sources/source%2Fa/schema')
    expect(await f.client.sourceHints('source/a')).toBeNull()
    await expect(f.client.sourceHints('source/a')).rejects.toMatchObject({ kind: 'protocol' })
    await expect(f.client.sourceHints('source/a')).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('rejects a hint response over its transport or name-count bound before using it', async () => {
    const oversized = new Response('unused', {
      headers: { 'content-length': String(8 * 1024 * 1024 + 1) },
    })
    const names = {
      connectionId: 'source',
      connectorId: 'mysql',
      tables: Array.from({ length: 1025 }, (_, i) => ({ name: `table_${i}` })),
      discoveredAt: 100,
    }
    const f = fixture([oversized, json(names)])
    await expect(f.client.sourceHints('source')).rejects.toMatchObject({ kind: 'protocol' })
    await expect(f.client.sourceHints('source')).rejects.toMatchObject({ kind: 'protocol' })
  })
  it('retains only bounded table-name hints rather than full discovery schemas', async () => {
    const f = fixture([
      json({
        connectionId: 'source',
        connectorId: 'mysql',
        discoveredAt: 100,
        tables: [
          {
            name: 'orders',
            fields: [{ name: 'private-model-sentinel', type: 'text' }],
            primaryKey: ['id'],
            indexes: [],
          },
        ],
        extra: 'unused',
      }),
    ])
    expect(await f.client.sourceHints('source')).toEqual({
      connectionId: 'source',
      connectorId: 'mysql',
      discoveredAt: 100,
      tables: [{ name: 'orders' }],
    })
  })
  it('refuses a schedule preview for an older input revision or another explicit zone', async () => {
    const base = {
      base: boundary.startedAt,
      inputRevision: '1',
      zoneId: schedule.zoneId,
      rulesVersion: 'validation-unix-v1',
      occurrences: Array.from({ length: 5 }, () => ({
        at: boundary.startedAt,
        local: '2026-10-30T08:00:00',
        offset: '+08:00',
        weekday: 'FRIDAY',
      })),
    }
    const f = fixture([json(base), json({ ...base, inputRevision: '2', zoneId: 'UTC' })])
    await expect(f.client.previewSchedule({ schedule, inputRevision: '2' })).rejects.toMatchObject({
      kind: 'protocol',
    })
    await expect(f.client.previewSchedule({ schedule, inputRevision: '2' })).rejects.toMatchObject({
      kind: 'protocol',
    })
  })
})
