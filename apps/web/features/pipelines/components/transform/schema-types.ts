import type { ComponentType } from 'react'

import type { TransformEditorProps } from './types'

export type PipelineTransformFieldKind =
  | 'expression'
  | 'mapping'
  | 'branches'
  | 'aliases'
  | 'code'
  | 'options'

export interface PipelineTransformFieldSchema {
  key: string
  kind: PipelineTransformFieldKind
  required?: boolean
}

/** Serializable metadata for a processor. The editor owns interaction; this schema owns its contract. */
export interface PipelineTransformSchema {
  type: string
  titleKey: string
  descriptionKey: string
  fields: readonly PipelineTransformFieldSchema[]
}

export interface PipelineTransformDefinition {
  schema: PipelineTransformSchema
  editor: ComponentType<TransformEditorProps>
}
