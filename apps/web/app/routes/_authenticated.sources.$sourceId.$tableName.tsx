import { createFileRoute } from '@tanstack/react-router'

import type { SourceTab } from '@/features/sources/sources-page'

import { SourceTableDetailRoutePage } from '@/features/sources/source-route-pages'

const sourceTabs: SourceTab[] = ['data', 'columns', 'settings', 'lineage', 'log']

export const Route = createFileRoute('/_authenticated/sources/$sourceId/$tableName')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: sourceTabs.includes(search.tab as SourceTab) ? (search.tab as SourceTab) : undefined,
  }),
  component: SourceTableDetailRoutePage,
})
