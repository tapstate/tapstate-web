import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/overview' })
  },
  component: IndexRouteComponent,
})

function IndexRouteComponent() {
  return null
}
