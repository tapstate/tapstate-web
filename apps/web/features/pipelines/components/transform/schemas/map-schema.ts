import type { PipelineTransformSchema } from '../schema-types'

export const mapTransformSchema = {
  type: 'map',
  titleKey: 'pipelines.workspace.transform.map.title',
  descriptionKey: 'pipelines.workspace.transform.map.description',
  fields: [{ key: 'fields', kind: 'mapping', required: true }],
} as const satisfies PipelineTransformSchema
