import type { PipelineTransformSchema } from '../schema-types'

export const jsTransformSchema = {
  type: 'js',
  titleKey: 'pipelines.workspace.transform.js.title',
  descriptionKey: 'pipelines.workspace.transform.js.description',
  fields: [
    { key: 'engine', kind: 'options', required: true },
    { key: 'script', kind: 'code', required: true },
  ],
} as const satisfies PipelineTransformSchema
