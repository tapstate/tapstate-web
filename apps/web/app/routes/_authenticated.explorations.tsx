import { createFileRoute } from '@tanstack/react-router'
import { ExplorationsPage } from '@/features/explorations/explorations-page'

export const Route = createFileRoute('/_authenticated/explorations')({
  component: ExplorationsRouteComponent,
})

function ExplorationsRouteComponent() {
  return <ExplorationsPage />
}
