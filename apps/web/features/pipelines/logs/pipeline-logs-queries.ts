import { useQuery } from '@tanstack/react-query'

import { getPipelineLogs } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

const PIPELINE_LOGS_REFRESH_INTERVAL = 5_000

export function usePipelineLogsQuery(pipelineId: string, autoRefresh: boolean) {
  const apiFetch = useAuthStore((state) => state.apiFetch)

  return useQuery({
    queryKey: ['pipelines', pipelineId, 'logs'],
    queryFn: () => getPipelineLogs(pipelineId, apiFetch),
    retry: false,
    refetchInterval: autoRefresh ? PIPELINE_LOGS_REFRESH_INTERVAL : false,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })
}
