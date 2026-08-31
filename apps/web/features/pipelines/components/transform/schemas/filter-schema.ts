import type { PipelineTransformSchema } from '../schema-types'

export const filterTransformSchema = {
  type: 'filter',
  titleKey: 'pipelines.workspace.transform.filter.title',
  descriptionKey: 'pipelines.workspace.transform.filter.description',
  fields: [
    { key: 'expr', kind: 'expression', required: true },
    { key: 'logic', kind: 'options' },
  ],
} as const satisfies PipelineTransformSchema
