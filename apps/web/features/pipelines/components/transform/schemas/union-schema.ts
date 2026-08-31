import type { PipelineTransformSchema } from '../schema-types'

export const unionTransformSchema = {
  type: 'union',
  titleKey: 'pipelines.workspace.transform.union.title',
  descriptionKey: 'pipelines.workspace.transform.union.description',
  fields: [{ key: 'from', kind: 'branches', required: true }],
} as const satisfies PipelineTransformSchema
