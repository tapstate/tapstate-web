import type { PipelineTransformSchema } from '../schema-types'

export const joinTransformSchema = {
  type: 'join',
  titleKey: 'pipelines.workspace.transform.join.title',
  descriptionKey: 'pipelines.workspace.transform.join.description',
  fields: [
    { key: 'from', kind: 'aliases', required: true },
    { key: 'engine', kind: 'options', required: true },
    { key: 'sql', kind: 'code', required: true },
  ],
} as const satisfies PipelineTransformSchema
