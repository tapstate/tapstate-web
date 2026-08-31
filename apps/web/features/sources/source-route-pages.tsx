import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { SourcesPage, type SourceTab, type SourcesPageRoute } from './sources-page'

function navigateToSourceView(navigate: ReturnType<typeof useNavigate>, next: SourcesPageRoute) {
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

export function SourcesCatalogRoutePage() {
  const navigate = useNavigate()
  return <SourcesPage route={{}} onNavigate={(next) => navigateToSourceView(navigate, next)} />
}

export function SourceDetailRoutePage() {
  const navigate = useNavigate()
  const { sourceId } = useParams({ from: '/_authenticated/sources/$sourceId/' })

  return (
    <SourcesPage route={{ sourceId }} onNavigate={(next) => navigateToSourceView(navigate, next)} />
  )
}

export function SourceTableDetailRoutePage() {
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
