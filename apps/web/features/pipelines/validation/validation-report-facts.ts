import type { ValidationRootSummary, ValidationValue } from '@/service/pipelines/validation-client'

import { member } from './validation-record-view'

export type FindingCategory = 'source' | 'values' | 'presence' | 'identity' | 'unknown'
export function validationFindingCategory(kind: string): FindingCategory {
  if (kind.startsWith('SOURCE_')) return 'source'
  if (kind === 'TARGET_VALUE' || kind === 'TARGET_TYPE') return 'values'
  if (kind === 'TARGET_MISSING' || kind === 'TARGET_EXTRA') return 'presence'
  if (
    [
      'TARGET_DUPLICATE',
      'TARGET_ROW_DUPLICATE',
      'TARGET_IDENTITY',
      'TARGET_KEY_INVALID',
      'TARGET_STRUCTURE',
    ].includes(kind)
  )
    return 'identity'
  return 'unknown'
}
export function validationFindingCounts(
  summary: ValidationValue,
): ReadonlyMap<string, bigint> | null {
  const counts = member(summary, 'counts')
  if (counts?.type !== 'object') return null
  const result = new Map<string, bigint>()
  for (const entry of counts.value) {
    const raw = entry.value
    if (
      !['int8', 'int16', 'int32', 'int64', 'integer', 'text'].includes(raw.type) ||
      typeof raw.value !== 'string' ||
      !/^(0|[1-9][0-9]*)$/.test(raw.value)
    )
      return null
    result.set(entry.name, BigInt(raw.value))
  }
  return result
}
export function validationRootMatchesCategory(
  root: ValidationRootSummary,
  category: string,
): boolean {
  if (category === 'all') return true
  const counts = validationFindingCounts(root.summary)
  return (
    counts !== null &&
    [...counts].some(([kind, count]) => count > 0n && validationFindingCategory(kind) === category)
  )
}
export function validationRootKinds(
  roots: readonly ValidationRootSummary[],
): ReadonlyMap<string, bigint> {
  const result = new Map<string, bigint>()
  for (const root of roots) {
    const counts = validationFindingCounts(root.summary)
    if (counts)
      for (const [kind, count] of counts) result.set(kind, (result.get(kind) ?? 0n) + count)
  }
  return result
}

export function validationFieldPath(parts: readonly (string | number)[]): string {
  return parts
    .map((part, index) =>
      typeof part === 'number'
        ? `[${part}]`
        : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(part)
          ? (index ? '.' : '') + part
          : `[${JSON.stringify(part)}]`,
    )
    .join('')
}
