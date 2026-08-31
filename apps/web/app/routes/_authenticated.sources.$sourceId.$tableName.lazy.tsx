import { createLazyFileRoute } from '@tanstack/react-router'

import { SourceTableDetailPage } from '@/features/sources/pages/source-table-detail-page'

export const Route = createLazyFileRoute('/_authenticated/sources/$sourceId/$tableName')({
  component: SourceTableDetailPage,
})
