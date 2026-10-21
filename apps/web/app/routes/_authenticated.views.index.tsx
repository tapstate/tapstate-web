import { createFileRoute } from '@tanstack/react-router'

import { ViewsPage } from '@/features/views/views-page'

export const Route = createFileRoute('/_authenticated/views/')({
  component: ViewsPage,
})
