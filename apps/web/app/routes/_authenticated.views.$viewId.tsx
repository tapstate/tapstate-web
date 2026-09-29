import { createFileRoute } from '@tanstack/react-router'

import { ViewDetailPage } from '@/features/views/view-detail-page'

export const Route = createFileRoute('/_authenticated/views/$viewId')({
  component: ViewDetailRouteComponent,
})

function ViewDetailRouteComponent() {
  const { viewId } = Route.useParams()
  return <ViewDetailPage key={viewId} viewId={viewId} />
}
