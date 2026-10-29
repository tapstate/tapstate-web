import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/ui-kit')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
})
