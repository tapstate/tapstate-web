import { useQuery } from '@tanstack/react-query'

import { listViews } from '@/service/view-client'
import { useAuthStore } from '@/stores/auth-store'

export const VIEWS_QUERY_KEY = ['views'] as const

export function useViewsQuery() {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  return useQuery({
    queryKey: VIEWS_QUERY_KEY,
    queryFn: () => listViews(apiFetch),
    // A server without the read will not grow one while the page is open, so stop asking.
    refetchInterval: (query) => (query.state.data?.available === false ? false : 5000),
    refetchIntervalInBackground: false,
  })
}
