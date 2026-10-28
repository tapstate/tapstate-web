import { createFileRoute } from '@tanstack/react-router'

import { AlertSettings } from '@/features/alerts/alert-settings'
export const Route = createFileRoute('/_authenticated/settings/alerts')({
  component: AlertSettings,
})
