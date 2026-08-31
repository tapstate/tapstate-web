import { createFileRoute } from '@tanstack/react-router'

import { SourceDetailRoutePage } from '@/features/sources/source-route-pages'

export const Route = createFileRoute('/_authenticated/sources/$sourceId/')({
  component: SourceDetailRoutePage,
})
