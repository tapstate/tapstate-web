import { createFileRoute } from '@tanstack/react-router'

import { DeliveryHistoryPage } from '../features/notifications/delivery-history-page'

export const Route = createFileRoute('/_console/deliveries')({ component: DeliveryHistoryPage })
