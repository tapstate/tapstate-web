import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_pipeline-editor/pipelines/$pipelineId/edit')({
  component: PipelineEditorLayoutRouteComponent,
})

function PipelineEditorLayoutRouteComponent() {
  return <Outlet />
}
