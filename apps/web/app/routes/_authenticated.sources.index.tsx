import { createFileRoute } from '@tanstack/react-router'

import { SourcesCatalogRoutePage } from '@/features/sources/source-route-pages'

export const Route = createFileRoute('/_authenticated/sources/')({
  component: SourcesCatalogRoutePage,
})
