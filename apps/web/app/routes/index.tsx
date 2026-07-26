import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/sources' })
  },
  component: IndexRouteComponent,
})

function IndexRouteComponent() {
  return null
}
