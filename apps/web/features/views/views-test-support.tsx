import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { SourceView } from '@/service/source-client'
import type { ViewFreshness, ViewKind, ViewSummary } from '@/service/view-client'

export function viewEntry(
  collection: string,
  kind: ViewKind,
  pipelineId: string,
  status: ViewFreshness,
): ViewSummary {
  return {
    id: `views/${collection}`,
    kind,
    location: { storeId: 'views', database: 'tapstate', collection },
    pipelineId,
    status,
    documents: 1200,
    sizeBytes: 1536,
    lastAppliedAt: Date.now() - 5000,
  }
}

export function sourceEntry(id: string): SourceView {
  return {
    id,
    metadata: id === 'views' ? { labels: { store: 'true' } } : null,
    connector: 'mongodb',
    config: {},
    configuredSecrets: [],
    mode: null,
    tables: null,
    srs: null,
    contentHash: `hash-${id}`,
  }
}

/** Renders into a fresh container and lets the queries settle. */
export async function renderPage(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
  })
  // Two rounds: a query that only mounts once the first one resolves needs a second settle.
  for (let round = 0; round < 2; round += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}
