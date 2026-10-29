import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import type { PipelineTransformNodeConfiguration } from '../../model/pipeline-node-model'

export interface TransformFieldOption {
  value: string
  label: string
  detail?: string
  isPrimaryKey?: boolean
}

export interface TransformEditorProps {
  config: PipelineTransformNodeConfiguration
  onChange?: (patch: PipelineTransformConfigurationPatch) => void
  fieldTypes?: Readonly<Record<string, string>>
  fieldOptions?: readonly TransformFieldOption[]
  upstreamInputs?: readonly string[]
}

export interface PipelineTransformConfigurationPatch {
  body?: PipelineJsonObject
  from?: unknown
  options?: PipelineJsonObject | null
}

export function mergeBody(
  config: PipelineTransformNodeConfiguration,
  patch: PipelineJsonObject,
): PipelineJsonObject {
  return { ...config.body, ...patch }
}
