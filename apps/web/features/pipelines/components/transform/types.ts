import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import type { PipelineTransformNodeConfiguration } from '../../model/pipeline-node-model'

export interface TransformEditorProps {
  config: PipelineTransformNodeConfiguration
  onChange?: (patch: PipelineTransformConfigurationPatch) => void
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
