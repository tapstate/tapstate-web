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

/**
 * Maps each group header to the rows rendered beneath it, in table order. A
 * source row contributes its id; an empty-group row contributes its text.
 */
function groupedRows(): [string, string[]][] {
  const groups: [string, string[]][] = []
  for (const row of container?.querySelectorAll('main tbody tr') ?? []) {
    const header = row.querySelector('th[scope="colgroup"]')
    if (header) {
      groups.push([header.textContent ?? '', []])
      continue
    }
    const id = row.querySelector('td button')?.textContent ?? row.textContent ?? ''
    groups.at(-1)?.[1].push(id)
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
  it('puts the unlabeled source under the Default project, first, then the projects', async () => {
    // Ids deliberately disagree with their labels, so prefix-based grouping fails.
    await renderPage([
      source('shared_atlas'),
      source('retail_mysql', 'bank_c360'),
      source('bank_pg', 'retail'),
    ])

    expect(groupedRows()).toEqual([
      ['Default project', ['shared_atlas']],
      ['Project · bank_c360', ['retail_mysql']],
      ['Project · retail', ['bank_pg']],
    ])
    const header = [...(container?.querySelectorAll('main tbody tr') ?? [])].find(
      (row) => row.querySelector('th[scope="colgroup"]')?.textContent === 'Default project',
    )
    expect(
      header?.querySelector('button, [role="button"], [role="menu"], [aria-haspopup]'),
    ).toBeNull()
  })

  it('still shows the Default project header with an empty line when every source is labeled', async () => {
    await renderPage([source('retail_mysql', 'bank_c360')])

    expect(groupedRows()).toEqual([
      ['Default project', ['No data sources in the Default project.']],
      ['Project · bank_c360', ['retail_mysql']],
    ])
  })

  it('groups every source under the Default project on a server without project labels', async () => {
    await renderPage([source('orders'), source('customers')])

    expect(groupedRows()).toEqual([['Default project', ['orders', 'customers']]])
  })
})
