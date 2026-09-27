import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'

const { listConnectors, listSources } = vi.hoisted(() => ({
  listConnectors: vi.fn(),
  listSources: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  listConnectors,
  listSources,
}))

import { SourcesPage } from './sources-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function source(id: string, project?: string): SourceView {
  return {
    id,
    metadata: project === undefined ? null : { labels: { project } },
    connector: 'mysql',
    config: { host: `${id}.local` },
    configuredSecrets: [],
    mode: 'snapshot',
    tables: [],
    srs: null,
    contentHash: 'a'.repeat(64),
  }
}

async function renderPage(sources: SourceView[]) {
  listSources.mockResolvedValue(sources)
  listConnectors.mockResolvedValue([])
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <SourcesPage />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await vi.waitFor(() => expect(container?.querySelector('main tbody tr')).not.toBeNull())
  })
}

/** Maps each group header to the source ids rendered beneath it, in table order. */
function groupedRows(): [string, string[]][] {
  const groups: [string, string[]][] = []
  for (const row of container?.querySelectorAll('main tbody tr') ?? []) {
    const header = row.querySelector('th[scope="colgroup"]')
    if (header) {
      groups.push([header.textContent ?? '', []])
      continue
    }
    groups.at(-1)?.[1].push(row.querySelector('td button')?.textContent ?? '')
  }
  return groups
}

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('SourcesGroupByProjectTest', () => {
  it('puts unlabeled sources under Shared by all projects after the project groups', async () => {
    await renderPage([
      source('shared_atlas'),
      source('retail_mysql', 'bank_c360'),
      source('bank_pg', 'retail'),
    ])

    expect(groupedRows()).toEqual([
      ['Project · bank_c360', ['retail_mysql']],
      ['Project · retail', ['bank_pg']],
      ['Shared by all projects', ['shared_atlas']],
    ])
  })

  it('keeps the flat list without group headers when no source carries a label', async () => {
    await renderPage([source('orders'), source('customers')])

    expect(container?.querySelector('th[scope="colgroup"]')).toBeNull()
    expect(container?.querySelectorAll('main tbody tr')).toHaveLength(2)
  })
})
