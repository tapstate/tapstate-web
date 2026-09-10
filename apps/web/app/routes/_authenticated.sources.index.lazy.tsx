import { createLazyFileRoute } from '@tanstack/react-router'

import { SourcesCatalogPage } from '@/features/sources/pages/sources-catalog-page'

export const Route = createLazyFileRoute('/_authenticated/sources/')({
  component: SourcesCatalogPage,
})
