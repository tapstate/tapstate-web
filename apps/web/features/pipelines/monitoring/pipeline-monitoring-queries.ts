import { useQuery } from '@tanstack/react-query'

import {
  getPipelineMetrics,
  getPipelineStatus,
  type PipelineMetrics,
  type PipelineStatus,
} from '@/service/pipelines/pipeline-client'
import {
  getPipelineExplain,
  getPipelineSnapshot,
  type PipelineExplain,
  type PipelineSnapshot,
} from '@/service/pipelines/pipeline-observability-client'
import { useAuthStore } from '@/stores/auth-store'

const manual = {
  retry: false,
  refetchInterval: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
} as const

export function usePipelineMonitoringQueries(pipelineId: string, enabled = true) {
  const apiFetch = useAuthStore((state) => state.apiFetch)

  const status = useQuery<PipelineStatus>({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    enabled,
    ...manual,
  })
  const metrics = useQuery<PipelineMetrics>({
    queryKey: ['pipelines', pipelineId, 'metrics'],
    queryFn: () => getPipelineMetrics(pipelineId, apiFetch),
    enabled,
    ...manual,
  })
  // The load progress and the diagnosis are supporting reads: a failure of either leaves the page usable.
  const snapshot = useQuery<PipelineSnapshot>({
    queryKey: ['pipelines', pipelineId, 'snapshot'],
    queryFn: () => getPipelineSnapshot(pipelineId, apiFetch),
    enabled,
    ...manual,
  })
  const explain = useQuery<PipelineExplain>({
    queryKey: ['pipelines', pipelineId, 'explain'],
    queryFn: () => getPipelineExplain(pipelineId, apiFetch),
    enabled,
    ...manual,
  })

  return { status, metrics, snapshot, explain }
}
