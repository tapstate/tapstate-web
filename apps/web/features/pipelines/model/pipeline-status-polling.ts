import { PipelineClientError } from '@/service/pipelines/pipeline-client'

/**
 * An applied pipeline can briefly have no runtime observation while the control plane
 * converges. Keep polling that one documented transient response; a 404 for an unknown
 * pipeline is permanent and should stop.
 */
export function pipelineStatusRefetchInterval(error: unknown): number | false {
  if (!(error instanceof PipelineClientError) || error.status !== 404) return 5000
  return error.code === 'monitor.no-observation' ? 1500 : false
}
