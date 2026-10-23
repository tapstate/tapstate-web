import { createFileRoute } from '@tanstack/react-router'

import { EventCenterPage } from '../features/notifications/event-center-page'

export const Route = createFileRoute('/_console/events')({ component: EventCenterPage })
