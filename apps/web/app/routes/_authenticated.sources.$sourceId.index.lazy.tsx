import { createLazyFileRoute } from '@tanstack/react-router'

import { SourceDetailPage } from '@/features/sources/pages/source-detail-page'

export const Route = createLazyFileRoute('/_authenticated/sources/$sourceId/')({
  component: SourceDetailPage,
})
