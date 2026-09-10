import { useNavigate, useParams } from '@tanstack/react-router'

import { navigateToSourceView } from '../source-navigation'
import { SourcesPage } from '../sources-page'

export function SourceDetailPage() {
  const navigate = useNavigate()
  const { sourceId } = useParams({ from: '/_authenticated/sources/$sourceId/' })

  return (
    <SourcesPage route={{ sourceId }} onNavigate={(next) => navigateToSourceView(navigate, next)} />
  )
}
