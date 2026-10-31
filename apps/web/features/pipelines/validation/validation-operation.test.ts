import { describe, expect, it } from 'vitest'

import type { ValidationTask } from '@/service/pipelines/validation-client'

import {
  validationControlSelection,
  validationReportReference,
  validationStartBusy,
} from './validation-operation'
const generation = '10000000-0000-4000-8000-000000000001'
const current = {
  cluster: 'cluster',
  node: 'current-entry',
  boot: 'current-boot',
  member: '20000000-0000-4000-8000-000000000001',
  incarnation: '30000000-0000-4000-8000-000000000001',
}
function task(patch: Partial<ValidationTask> = {}): ValidationTask {
  return {
    pipelineId: 'flow',
    taskId: 'full',
    taskGeneration: generation,
    revision: '9007199254740997',
    nextStartSequence: '9007199254740998',
    closed: false,
    method: 'COUNT',
    comparisonFingerprint: 'a'.repeat(64),
    historyLimit: 10,
    schedule: null,
    scheduleEnabled: true,
    mappings: [],
    context: current,
    permission: {
      phase: 'BORN',
      taskGeneration: generation,
      revision: '9007199254740993',
      sequence: '9007199254740994',
      command: '40000000-0000-4000-8000-000000000001',
      run: 'original-run',
    },
    scheduleObservation: null,
    ...patch,
  }
}
function observation(): NonNullable<ValidationTask['scheduleObservation']> {
  return {
    node: 'original-entry',
    boot: 'original-boot',
    member: '50000000-0000-4000-8000-000000000001',
    context: '60000000-0000-4000-8000-000000000001',
    observedAt: '2026-10-30T00:00:00Z',
    nextDue: null,
    lastDue: '2026-10-30T00:00:00Z',
    state: 'START_REQUESTED',
    reason: null,
    command: '70000000-0000-4000-8000-000000000001',
    run: 'pending-entry-run',
    sequence: '9007199254740995',
  }
}
describe('original validation control selectors', () => {
  it('permits a successor attempt only after the bound owner lease is explicitly observed inactive', () => {
    const value = task({
      nextStartSequence: (BigInt(task().permission!.sequence) + 1n).toString(),
      permission: { ...task().permission!, ownerLease: 'NOT_LIVE' },
    })
    expect(validationStartBusy(value)).toBe(false)
    expect(validationReportReference(value)?.run).toBe('original-run')
    for (const ownerLease of ['LIVE', 'UNKNOWN', undefined] as const) {
      expect(
        validationStartBusy(task({ ...value, permission: { ...value.permission!, ownerLease } })),
      ).toBe(true)
    }
  })
  it('keeps inconsistent or unavailable task coordinates busy despite an inactive lease hint', () => {
    const permission = { ...task().permission!, ownerLease: 'NOT_LIVE' as const }
    const nextStartSequence = (BigInt(permission.sequence) + 1n).toString()
    for (const patch of [
      { context: null },
      { closed: true },
      { nextStartSequence: permission.sequence },
      { nextStartSequence: (BigInt(permission.sequence) + 2n).toString() },
      { taskGeneration: '80000000-0000-4000-8000-000000000001' },
      { revision: '1' },
    ]) {
      expect(validationStartBusy(task({ permission, nextStartSequence, ...patch }))).toBe(true)
    }
    expect(
      validationStartBusy(
        task({
          nextStartSequence: '9007199254740993',
          permission: { ...permission, sequence: '9007199254740992' },
        }),
      ),
    ).toBe(false)
  })
  it('retains a newer original attempt while the old durable permission has an inactive owner', () => {
    const value = task({
      nextStartSequence: (BigInt(task().permission!.sequence) + 1n).toString(),
      permission: { ...task().permission!, ownerLease: 'NOT_LIVE' },
      scheduleObservation: { ...observation(), state: 'UNKNOWN' },
    })
    expect(validationControlSelection(value)?.source).toBe('ENTRY_OBSERVATION')
    expect(validationStartBusy(value)).toBe(true)
    expect(validationReportReference(value)?.run).toBe('original-run')
    const original = validationControlSelection(value)!.operation
    for (const ownerLease of ['LIVE', 'UNKNOWN'] as const) {
      const updated = task({ ...value, permission: { ...value.permission!, ownerLease } })
      expect(validationControlSelection(updated)?.operation).toEqual(original)
      expect(validationStartBusy(updated)).toBe(true)
      expect(validationReportReference(updated)?.run).toBe('original-run')
    }
  })
  it('pins durable generation/revision/sequence/command while using the current descriptor only as a carrier', () => {
    const value = task(),
      selected = validationControlSelection(value)!
    expect(selected.source).toBe('DURABLE_PERMISSION')
    expect(selected.operation).toEqual({
      context: current,
      pipeline: 'flow',
      task: 'full',
      taskGeneration: generation,
      revision: '9007199254740993',
      sequence: '9007199254740994',
      command: value.permission!.command,
    })
    expect(selected.operation.context).not.toBe(value.context)
    expect(selected.report).toEqual({
      pipeline: 'flow',
      task: 'full',
      generation,
      sequence: '9007199254740994',
      run: 'original-run',
    })
  })
  it('keeps a report reference independent of active control availability and refuses mixed task generations', () => {
    const noControl = task({ context: null })
    expect(validationControlSelection(noControl)).toBeNull()
    expect(validationReportReference(noControl)?.run).toBe('original-run')
    const mixed = task({ taskGeneration: '80000000-0000-4000-8000-000000000001' })
    expect(validationControlSelection(mixed)).toBeNull()
    expect(validationReportReference(mixed)).toBeNull()
  })
  it('uses the exact recorded scheduler origin only before durable permission, never nextStartSequence', () => {
    const value = task({ permission: null, scheduleObservation: observation() })
    const selected = validationControlSelection(value)!
    expect(selected.source).toBe('ENTRY_OBSERVATION')
    expect(selected.report).toBeNull()
    expect(selected.operation.context).toEqual({
      cluster: 'cluster',
      node: 'original-entry',
      boot: 'original-boot',
      member: value.scheduleObservation!.member,
      incarnation: value.scheduleObservation!.context,
    })
    expect(selected.operation.sequence).toBe(value.scheduleObservation!.sequence)
    expect(selected.operation.command).toBe(value.scheduleObservation!.command)
  })
  it('does not invent an entry-only attempt from absent, waiting, skipped or incomplete observations', () => {
    const value = task({ permission: null })
    expect(validationControlSelection(value)).toBeNull()
    for (const state of ['WAITING', 'SKIPPED_BUSY', 'SKIPPED_LATE', 'OFF'] as const) {
      expect(
        validationControlSelection(
          task({ ...value, scheduleObservation: { ...observation(), state } }),
        ),
      ).toBeNull()
    }
    expect(
      validationControlSelection(
        task({ ...value, scheduleObservation: { ...observation(), command: null } }),
      ),
    ).toBeNull()
  })
  it('keeps admitted work selectable when a newer scheduled attempt was refused, then identifies a new entry after closure', () => {
    const value = task({ scheduleObservation: { ...observation(), state: 'FAILED' } })
    expect(validationControlSelection(value)?.knownRun).toBe('original-run')
    const closed = task({ ...value, permission: { ...value.permission!, phase: 'CLOSED' } })
    expect(validationControlSelection(closed)?.knownRun).toBe('pending-entry-run')
    expect(validationControlSelection(closed)?.source).toBe('ENTRY_OBSERVATION')
  })
  it('never promotes an older or same-command observation over durable facts', () => {
    const value = task({ permission: { ...task().permission!, phase: 'CLOSED' } })
    const older = task({ ...value, scheduleObservation: { ...observation(), sequence: '1' } })
    expect(validationControlSelection(older)?.source).toBe('DURABLE_PERMISSION')
    const duplicate = task({
      ...value,
      scheduleObservation: { ...observation(), command: value.permission!.command },
    })
    expect(validationControlSelection(duplicate)?.source).toBe('DURABLE_PERMISSION')
  })
})
