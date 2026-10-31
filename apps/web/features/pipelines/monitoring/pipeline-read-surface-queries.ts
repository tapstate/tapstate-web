import { useInfiniteQuery } from '@tanstack/react-query'

import {
  getPipelineMetricsHistory,
  type PipelineHistoryQuery,
} from '@/service/pipelines/pipeline-observability-client'
import { useAuthStore } from '@/stores/auth-store'

export type PipelineHistoryWindow = { from: string; to: string }

export function usePipelineReadSurfaceQueries(
  pipelineId: string,
  window: PipelineHistoryWindow,
  tables: string[],
) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const query: Omit<PipelineHistoryQuery, 'cursor'> = {
    ...window,
    resolution: 'auto',
    limit: 1000,
    tables: tables.slice(0, 20),
  }

  const history = useInfiniteQuery({
    queryKey: ['pipelines', pipelineId, 'metrics-history', query],
    queryFn: ({ pageParam }) =>
      getPipelineMetricsHistory(pipelineId, { ...query, cursor: pageParam }, apiFetch),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return { history, requestedTableCount: tables.length }
}
