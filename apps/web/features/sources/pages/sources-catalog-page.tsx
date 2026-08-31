import { useNavigate } from '@tanstack/react-router'

import { navigateToSourceView } from '../source-navigation'
import { SourcesPage } from '../sources-page'

export function SourcesCatalogPage() {
  const navigate = useNavigate()

  return <SourcesPage route={{}} onNavigate={(next) => navigateToSourceView(navigate, next)} />
}
