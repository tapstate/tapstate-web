import { createFileRoute } from '@tanstack/react-router'

import { ViewCollectionBrowserPage } from '@/features/views/view-collection-browser-page'

export const Route = createFileRoute('/_authenticated/views/collections')({
  component: ViewCollectionBrowserPage,
})
