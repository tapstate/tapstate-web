import { createFileRoute } from '@tanstack/react-router'

import { PipelineWorkspacePage } from '@/features/pipelines/pages/pipeline-editor-page'

export const Route = createFileRoute('/_pipeline-editor/pipelines/$pipelineId/edit/api')({
  component: PipelineApiRouteComponent,
})

function PipelineApiRouteComponent() {
  const { pipelineId } = Route.useParams()
  return <PipelineWorkspacePage pipelineId={pipelineId} section="api" />
}
