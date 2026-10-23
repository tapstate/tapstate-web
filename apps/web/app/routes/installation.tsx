import { createFileRoute } from '@tanstack/react-router'

/** The root storage boundary owns this management-only page and its session-scoped forms. */
export const Route = createFileRoute('/installation')({ component: () => null })
