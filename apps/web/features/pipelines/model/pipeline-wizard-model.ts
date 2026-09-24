import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

export type WizardRelationShape = 'flat' | 'object' | 'array'
export type WizardRelationTransformType = 'filter' | 'map'

export const wizardRelationAddShapes = [
  'object',
  'array',
  'flat',
] as const satisfies readonly WizardRelationShape[]

export interface WizardRootTable {
  id: 'root'
  sourceId: string
  table: string
  key: string[]
}

export interface WizardRelationCondition {
  id: string
  childField: string
  parentField: string
}

export interface WizardRelationTransform {
  id: string
  type: WizardRelationTransformType
  body: PipelineJsonObject
}

export interface WizardRelation {
  id: string
  sourceId: string
  table: string
  parentId: string
  shape: WizardRelationShape
  path: string
  key: string[]
  arrayKey: string[]
  conditions: WizardRelationCondition[]
  transforms: WizardRelationTransform[]
}

export interface WizardPipelineTables {
  root: WizardRootTable
  relations: readonly WizardRelation[]
}

export function wizardSourceRef(sourceId: string, table: string) {
  return `${sourceId}.${table}`
}

export function wizardRelationChildren(relations: readonly WizardRelation[], parentId: string) {
  return relations.filter((relation) => relation.parentId === parentId)
}

export function wizardRelationDescendants(
  relations: readonly WizardRelation[],
  relationId: string,
) {
  const descendants = new Set<string>()
  const pending = [relationId]

  while (pending.length > 0) {
    const currentId = pending.pop()
    if (!currentId) continue
    for (const child of wizardRelationChildren(relations, currentId)) {
      if (descendants.has(child.id)) continue
      descendants.add(child.id)
      pending.push(child.id)
    }
  }

  return descendants
}

export function wizardRelationRequiredFields(
  relations: readonly WizardRelation[],
  relationId: string,
) {
  const relation = relations.find((item) => item.id === relationId)
  if (!relation) return []

  const fields = new Set([
    ...relation.key,
    ...relation.arrayKey,
    ...relation.conditions.map((condition) => condition.childField),
    ...wizardRelationChildren(relations, relationId).flatMap((child) =>
      child.conditions.map((condition) => condition.parentField),
    ),
  ])
  fields.delete('')
  return [...fields]
}

export function wizardRelationTransformReady(transform: WizardRelationTransform) {
  if (transform.type === 'filter') {
    return typeof transform.body.expr === 'string' && transform.body.expr.trim().length > 0
  }

  const fields = transform.body.fields
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return false
  return Object.entries(fields).some(
    ([name, value]) =>
      name.trim().length > 0 && value !== '$' && value !== '=' && value !== undefined,
  )
}

export function wizardRelationTransformsPreserveRequiredFields(
  relations: readonly WizardRelation[],
  relationId: string,
) {
  const relation = relations.find((item) => item.id === relationId)
  if (!relation) return false
  const requiredFields = new Set(wizardRelationRequiredFields(relations, relationId))

  for (const transform of relation.transforms) {
    if (transform.type !== 'map') continue
    const fields = transform.body.fields
    if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) continue

    for (const [target, rule] of Object.entries(fields)) {
      if (requiredFields.has(target) && rule !== `$${target}`) return false
      if (typeof rule === 'string' && rule.startsWith('$')) {
        const source = rule.slice(1)
        if (requiredFields.has(source) && source !== target) return false
      }
    }
  }

  return true
}

export function canCompileWizardRelations({ root, relations }: WizardPipelineTables) {
  if (relations.length === 0) return true
  if (!root.sourceId || !root.table || root.key.length === 0) return false

  const relationIds = new Set(relations.map((relation) => relation.id))
  if (relationIds.size !== relations.length || relationIds.has('root') || relationIds.has(''))
    return false

  for (const relation of relations) {
    if (!relation.sourceId || !relation.table) return false
    if (relation.shape === 'flat' ? relation.path.trim().length > 0 : !relation.path.trim())
      return false
    if (relation.parentId !== 'root' && !relationIds.has(relation.parentId)) return false
    if (relation.parentId === relation.id) return false
    if (wizardRelationDescendants(relations, relation.id).has(relation.parentId)) return false
    if (relation.key.length === 0) return false
    if (relation.conditions.length === 0) return false
    if (!wizardRelationTransformsPreserveRequiredFields(relations, relation.id)) return false

    const childFields = new Set<string>()
    for (const condition of relation.conditions) {
      if (!condition.childField || !condition.parentField) return false
      if (childFields.has(condition.childField)) return false
      childFields.add(condition.childField)
    }
  }

  return true
}
