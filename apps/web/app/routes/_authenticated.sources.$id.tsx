import { createFileRoute } from '@tanstack/react-router'

import { SourceDetailPage } from '@/features/sources/source-detail-page'

export const Route = createFileRoute('/_authenticated/sources/$id')({
  component: SourceDetailPage,
})
