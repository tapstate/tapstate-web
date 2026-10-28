import { createFileRoute } from '@tanstack/react-router'

import { HealthPage } from '@/features/alerts/health-page'
export const Route = createFileRoute('/_authenticated/health')({ component: HealthPage })
