import { createFileRoute } from '@tanstack/react-router'
import { PipelinesPage } from '@/features/pipelines/pipelines-page'

export const Route = createFileRoute('/_authenticated/pipelines')({
  component: PipelinesRouteComponent,
})

function PipelinesRouteComponent() {
  return <PipelinesPage />
}
