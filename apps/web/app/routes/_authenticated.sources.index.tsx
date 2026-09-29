import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sources/')({
  // `create` opens the new-source form on arrival, so other pages can link straight to it.
  validateSearch: (search: Record<string, unknown>): { create?: true } =>
    search.create === true || search.create === 'true' ? { create: true } : {},
})
