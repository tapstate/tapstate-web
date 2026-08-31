import { useQuery } from '@tanstack/react-query'

import {
  getPipelineMetrics,
  getPipelineStatus,
  type PipelineMetrics,
  type PipelineStatus,
} from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

const PIPELINE_MONITORING_REFRESH_INTERVAL = 5_000

export function usePipelineMonitoringQueries(pipelineId: string, autoRefresh: boolean) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const refetchInterval = autoRefresh ? PIPELINE_MONITORING_REFRESH_INTERVAL : false

  const status = useQuery<PipelineStatus>({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    retry: false,
    refetchInterval,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })
  const metrics = useQuery<PipelineMetrics>({
    queryKey: ['pipelines', pipelineId, 'metrics'],
    queryFn: () => getPipelineMetrics(pipelineId, apiFetch),
    retry: false,
    refetchInterval,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })

  return { status, metrics }
}
