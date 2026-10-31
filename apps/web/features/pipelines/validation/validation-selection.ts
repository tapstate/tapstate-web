import type {
  ValidationSelection,
  ValidationTask,
  ValidationSchedule,
} from '@/service/pipelines/validation-client'

/** Rebuilds the exact saved direct scope; it never discovers, renames or reconfirms keys. */
export function savedValidationSelection(task: ValidationTask): ValidationSelection | null {
  if (
    task.mappings.some((mapping) =>
      mapping.keys?.fields.some((pair) => pair.source.length !== 1 || pair.target.length !== 1),
    )
  )
    return null
  return {
    pipelineId: task.pipelineId,
    taskId: task.taskId,
    taskGeneration: task.taskGeneration,
    expectedRevision: task.revision,
    method: task.method,
    mappings: task.mappings.map((mapping) => ({
      mappingId: mapping.mappingId,
      outputId: mapping.outputId,
      sourceId: mapping.sourceId,
      table: mapping.sourceTable,
    })),
    confirmations: Object.fromEntries(
      task.mappings
        .filter((mapping) => mapping.keys !== null)
        .map((mapping) => [
          mapping.mappingId,
          {
            id: mapping.keys!.confirmationId,
            fields: mapping.keys!.fields.map((pair) => ({
              source: pair.source[0]!,
              target: pair.target[0]!,
            })),
          },
        ]),
    ),
  }
}

/** Java Instant canonicalizes zero milliseconds; no numeric date coercion or precision truncation. */
export function sameValidationSchedule(
  left: ValidationSchedule | null,
  right: ValidationSchedule | null,
): boolean {
  if (left === null || right === null) return left === right
  const anchor = (value: string | null) => value?.replace(/\.000Z$/, 'Z') ?? null
  return (
    left.kind === right.kind &&
    left.every === right.every &&
    left.unit === right.unit &&
    left.expression === right.expression &&
    left.zoneId === right.zoneId &&
    anchor(left.anchor) === anchor(right.anchor)
  )
}
