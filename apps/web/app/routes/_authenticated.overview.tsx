import { createFileRoute } from '@tanstack/react-router'

import { OverviewPage, type SourceFormSlot } from '@/features/overview/overview-page'
import { SourceCreateDialog } from '@/features/sources/source-create-dialog'

export const Route = createFileRoute('/_authenticated/overview')({
  component: OverviewRouteComponent,
})

// The route composes the two features, so Overview can add a source without leaving the page.
const sourceForm: SourceFormSlot = (props) => <SourceCreateDialog {...props} />

function OverviewRouteComponent() {
  return <OverviewPage sourceForm={sourceForm} />
}
