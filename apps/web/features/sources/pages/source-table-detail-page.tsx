import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { navigateToSourceView } from '../source-navigation'
import { SourcesPage, type SourceTab } from '../sources-page'

export function SourceTableDetailPage() {
  const navigate = useNavigate()
  const { sourceId, tableName } = useParams({
    from: '/_authenticated/sources/$sourceId/$tableName',
  })
  const { tab } = useSearch({ from: '/_authenticated/sources/$sourceId/$tableName' })

  return (
    <SourcesPage
      route={{ sourceId, tableName, tab: tab as SourceTab | undefined }}
      onNavigate={(next) => navigateToSourceView(navigate, next)}
    />
  )
}
