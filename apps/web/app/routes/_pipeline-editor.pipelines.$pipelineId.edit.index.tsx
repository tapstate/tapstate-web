import { createFileRoute } from '@tanstack/react-router'

import { getStagedPipelineDraft } from '@/features/pipelines/model/pipeline-draft-session'
import { PipelineEditorPage } from '@/features/pipelines/pages/pipeline-editor-page'

export const Route = createFileRoute('/_pipeline-editor/pipelines/$pipelineId/edit/')({
  component: PipelineEditorRouteComponent,
})

function PipelineEditorRouteComponent() {
  const { pipelineId } = Route.useParams()
  return (
    <PipelineEditorPage pipelineId={pipelineId} stagedDraft={getStagedPipelineDraft(pipelineId)} />
  )
}
