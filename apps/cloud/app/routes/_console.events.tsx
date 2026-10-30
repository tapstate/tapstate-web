import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_console/events')({
  beforeLoad: () => {
    throw redirect({
      to: '/alerts',
      search: (prev) => ({ organizationId: prev.organizationId, tab: 'events' }),
    })
  },
})
