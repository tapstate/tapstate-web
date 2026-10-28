import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_console/organizations')({
  beforeLoad: () => {
    throw redirect({
      to: '/settings',
      search: (prev) => ({ organizationId: prev.organizationId, tab: 'organization' }),
    })
  },
})
