import { useQuery } from '@tanstack/react-query'

import {
  getPipelineMetrics,
  getPipelineStatus,
  type PipelineMetrics,
  type PipelineStatus,
} from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

export function usePipelineMonitoringQueries(pipelineId: string, enabled = true) {
  const apiFetch = useAuthStore((state) => state.apiFetch)

  const status = useQuery<PipelineStatus>({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    enabled,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
  const metrics = useQuery<PipelineMetrics>({
    queryKey: ['pipelines', pipelineId, 'metrics'],
    queryFn: () => getPipelineMetrics(pipelineId, apiFetch),
    enabled,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return { status, metrics }
}
