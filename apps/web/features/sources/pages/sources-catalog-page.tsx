import { useNavigate, useSearch } from '@tanstack/react-router'

import { navigateToSourceView } from '../source-navigation'
import { SourcesPage } from '../sources-page'

export function SourcesCatalogPage() {
  const navigate = useNavigate()
  const { create } = useSearch({ from: '/_authenticated/sources/' })

  return (
    <SourcesPage
      route={{}}
      onNavigate={(next) => navigateToSourceView(navigate, next)}
      createOnArrival={create === true}
      onArrivalCreateClosed={() => {
        if (create) void navigate({ to: '/sources', search: {}, replace: true })
      }}
    />
  )
}
