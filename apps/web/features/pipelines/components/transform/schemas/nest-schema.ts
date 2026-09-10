import type { PipelineTransformSchema } from '../schema-types'

export const nestTransformSchema = {
  type: 'nest',
  titleKey: 'pipelines.workspace.transform.nest.title',
  descriptionKey: 'pipelines.workspace.transform.nest.description',
  fields: [
    { key: 'root', kind: 'options', required: true },
    { key: 'root.embed', kind: 'mapping' },
    { key: 'primary_key', kind: 'expression' },
  ],
} as const satisfies PipelineTransformSchema
