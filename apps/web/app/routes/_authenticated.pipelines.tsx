import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/pipelines')({
  // Lets other pages open the pipeline creation flow directly.
  validateSearch: (search: Record<string, unknown>): { create?: true } =>
    search.create === true || search.create === 'true' ? { create: true } : {},
  component: () => <Outlet />,
})
