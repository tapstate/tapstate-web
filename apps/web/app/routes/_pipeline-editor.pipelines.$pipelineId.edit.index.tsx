import { createFileRoute } from '@tanstack/react-router'

import { PipelineEditorPage } from '@/features/pipelines/pipeline-editor-page'

export const Route = createFileRoute('/_pipeline-editor/pipelines/$pipelineId/edit/')({
  component: PipelineEditorRouteComponent,
})

function PipelineEditorRouteComponent() {
  const { pipelineId } = Route.useParams()
  return <PipelineEditorPage pipelineId={pipelineId} />
}
