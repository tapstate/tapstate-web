import { createFileRoute } from '@tanstack/react-router'

import { AlertPolicyPage } from '../features/notifications/alert-policy-page'

export const Route = createFileRoute('/_console/alert-policies')({ component: AlertPolicyPage })
