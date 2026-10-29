import { createFileRoute } from '@tanstack/react-router'

import { PipelineDetailPage } from '@/features/pipelines/pages/pipeline-detail-page'

export const Route = createFileRoute('/_authenticated/pipelines/$pipelineId')({
  component: PipelineDetailRouteComponent,
})

function PipelineDetailRouteComponent() {
  const { pipelineId } = Route.useParams()
  return <PipelineDetailPage key={pipelineId} pipelineId={pipelineId} />
}
