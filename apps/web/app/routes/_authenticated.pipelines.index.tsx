import { createFileRoute } from '@tanstack/react-router'

import { PipelinesPage } from '@/features/pipelines/pages/pipelines-page'

export const Route = createFileRoute('/_authenticated/pipelines/')({
  component: PipelinesPage,
})
