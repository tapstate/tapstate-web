import type {
  ValidationOperation,
  ValidationExecution,
  ValidationReference,
  ValidationTask,
} from '@/service/pipelines/validation-client'

export interface ValidationControlSelection {
  /** Read/stop selector only. Fresh starts use a new command and the evaluated definition. */
  readonly operation: ValidationOperation
  readonly source: 'DURABLE_PERMISSION' | 'ENTRY_OBSERVATION'
  readonly knownRun: string
  readonly report: ValidationReference | null
}

function permissionCoordinatesMatch(task: ValidationTask): boolean {
  const permission = task.permission
  return (
    !task.closed &&
    task.context !== null &&
    permission !== null &&
    permission.taskGeneration === task.taskGeneration &&
    permission.run.trim().length > 0 &&
    BigInt(permission.sequence) + 1n === BigInt(task.nextStartSequence) &&
    BigInt(permission.revision) <= BigInt(task.revision)
  )
}

/** This observation permits a request; the backend must still acquire a successor fence. */
function mayRequestFencedSuccessor(task: ValidationTask): boolean {
  return (
    permissionCoordinatesMatch(task) &&
    task.permission?.phase !== 'CLOSED' &&
    task.permission?.ownerLease === 'NOT_LIVE'
  )
}

/** Lease changes must not redirect read/stop away from a recorded newer original request. */
function maySelectRecordedSuccessor(task: ValidationTask): boolean {
  return permissionCoordinatesMatch(task) && task.permission?.ownerLease !== undefined
}

export function validationReportReference(task: ValidationTask): ValidationReference | null {
  const permission = task.permission
  if (!permission || permission.taskGeneration !== task.taskGeneration || !permission.run.trim())
    return null
  return {
    pipeline: task.pipelineId,
    task: task.taskId,
    generation: permission.taskGeneration,
    sequence: permission.sequence,
    run: permission.run,
  }
}

/**
 * The current descriptor carries an exact durable permission selector; it does not name or grant the
 * execution owner. The backend resolves that owner from the stored Start before entry-context routing.
 * Before permission exists, only an exact recorded entry observation can supply missing coordinates.
 */
export function validationControlSelection(
  task: ValidationTask,
): ValidationControlSelection | null {
  const permission = task.permission,
    descriptor = task.context,
    observation = task.scheduleObservation
  if (!descriptor || (permission && permission.taskGeneration !== task.taskGeneration)) return null
  const entry =
    observation &&
    observation.command &&
    observation.sequence &&
    observation.run &&
    ['START_REQUESTED', 'UNKNOWN', 'FAILED'].includes(observation.state)
      ? observation
      : null
  const newerEntry =
    entry &&
    (!permission ||
      ((permission.phase === 'CLOSED' || maySelectRecordedSuccessor(task)) &&
        BigInt(entry.sequence!) > BigInt(permission.sequence) &&
        entry.command !== permission.command &&
        entry.run !== permission.run))
  if (entry && newerEntry) {
    return {
      source: 'ENTRY_OBSERVATION',
      knownRun: entry.run!,
      report: null,
      operation: {
        context: {
          cluster: descriptor.cluster,
          node: entry.node,
          boot: entry.boot,
          member: entry.member,
          incarnation: entry.context,
        },
        pipeline: task.pipelineId,
        task: task.taskId,
        taskGeneration: task.taskGeneration,
        revision: task.revision,
        sequence: entry.sequence!,
        command: entry.command!,
      },
    }
  }
  if (!permission || !permission.run.trim()) return null
  return {
    source: 'DURABLE_PERMISSION',
    knownRun: permission.run,
    report: validationReportReference(task),
    operation: {
      context: { ...descriptor },
      pipeline: task.pipelineId,
      task: task.taskId,
      taskGeneration: permission.taskGeneration,
      revision: permission.revision,
      sequence: permission.sequence,
      command: permission.command,
    },
  }
}

export function sameValidationOperation(
  left: ValidationOperation | null | undefined,
  right: ValidationOperation | null | undefined,
): boolean {
  if (!left || !right) return false
  return (
    left.pipeline === right.pipeline &&
    left.task === right.task &&
    left.taskGeneration === right.taskGeneration &&
    left.revision === right.revision &&
    left.sequence === right.sequence &&
    left.command === right.command &&
    (['cluster', 'node', 'boot', 'member', 'incarnation'] as const).every(
      (name) => left.context[name] === right.context[name],
    )
  )
}
export function validationOperationSettled(
  receipt: ValidationExecution | null | undefined,
): boolean {
  return (
    !!receipt &&
    !receipt.controlUnknown &&
    receipt.drain === 'DRAINED' &&
    (receipt.retired ||
      (receipt.state !== null && ['STOPPED', 'COMPLETED', 'FAILED'].includes(receipt.state)))
  )
}
/** UI admission guard only. The backend still owns the atomic FULL slot. */
export function validationStartBusy(
  task: ValidationTask,
  receipt: ValidationExecution | null = null,
): boolean {
  if (
    task.closed ||
    (task.permission &&
      (task.permission.taskGeneration !== task.taskGeneration ||
        (task.permission.phase !== 'CLOSED' && !mayRequestFencedSuccessor(task))))
  )
    return true
  const selected = validationControlSelection(task)
  if (selected?.source === 'ENTRY_OBSERVATION')
    return !(
      validationOperationSettled(receipt) &&
      sameValidationOperation(receipt?.original, selected.operation)
    )
  const observed = task.scheduleObservation
  return (
    selected === null &&
    observed !== null &&
    observed.command !== null &&
    observed.sequence !== null &&
    observed.run !== null &&
    ['START_REQUESTED', 'UNKNOWN', 'FAILED'].includes(observed.state)
  )
}
