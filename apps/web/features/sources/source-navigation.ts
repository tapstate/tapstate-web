import { useNavigate } from '@tanstack/react-router'

import type { SourcesPageRoute } from './sources-page'

export function navigateToSourceView(
  navigate: ReturnType<typeof useNavigate>,
  next: SourcesPageRoute,
) {
  if (!next.sourceId) {
    void navigate({ to: '/sources' })
    return
  }

  if (!next.tableName) {
    void navigate({
      to: '/sources/$sourceId',
      params: { sourceId: next.sourceId },
    })
    return
  }

  void navigate({
    to: '/sources/$sourceId/$tableName',
    params: { sourceId: next.sourceId, tableName: next.tableName },
    search: { tab: next.tab ?? 'columns' },
  })
}
