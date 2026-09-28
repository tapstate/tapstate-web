import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'

const { apiFetch, listPipelines } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  listPipelines: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  listPipelines,
  runPipeline: vi.fn(),
  stopPipeline: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))

import { PipelinesPage } from './pipelines-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function pipeline(id: string, project?: string): PipelineView {
  return {
    id,
    metadata: project === undefined ? null : { labels: { project } },
    dag: { nodes: [], edges: [] },
    contentHash: 'a'.repeat(64),
    status: { pipelineId: id, state: 'RUNNING' },
  } as unknown as PipelineView
}

async function renderPage(pipelines: PipelineView[]) {
  listPipelines.mockResolvedValue(pipelines)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <PipelinesPage />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await vi.waitFor(() => expect(container?.querySelector('tbody tr')).not.toBeNull())
  })
}

/**
 * Maps each group header to the rows rendered beneath it, in table order. A
 * pipeline row contributes its id; an empty-group row contributes its text.
 */
function groupedRows(): [string, string[]][] {
  const groups: [string, string[]][] = []
  for (const row of container?.querySelectorAll('tbody tr') ?? []) {
    const header = row.querySelector('th[scope="colgroup"]')
    if (header) {
      groups.push([header.textContent ?? '', []])
      continue
    }
    const id = row.querySelector('a span[title]')?.getAttribute('title') ?? row.textContent ?? ''
    groups.at(-1)?.[1].push(id)
  }
  return groups
}

function defaultProjectHeaderRow(): HTMLTableRowElement | undefined {
  return [...(container?.querySelectorAll('tbody tr') ?? [])].find(
    (row) => row.querySelector('th[scope="colgroup"]')?.textContent === 'Default project',
  ) as HTMLTableRowElement | undefined
}

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelinesGroupByProjectTest', () => {
  it('puts the Default project first with the unlabeled pipeline, then the two projects', async () => {
    // Ids deliberately disagree with their labels, so prefix-based grouping fails.
    await renderPage([
      pipeline('retail_orders', 'bank_c360'),
      pipeline('bank_ledger', 'retail'),
      pipeline('legacy_sync'),
    ])

    expect(groupedRows()).toEqual([
      ['Default project', ['legacy_sync']],
      ['Project · bank_c360', ['retail_orders']],
      ['Project · retail', ['bank_ledger']],
    ])
  })

  it('renders no remove action on the Default project header', async () => {
    await renderPage([pipeline('retail_orders', 'bank_c360'), pipeline('legacy_sync')])

    const header = defaultProjectHeaderRow()
    expect(header).toBeDefined()
    expect(
      header?.querySelector('button, [role="button"], [role="menu"], [aria-haspopup]'),
    ).toBeNull()
  })

  it('still shows the Default project header with an empty line when every pipeline is labeled', async () => {
    await renderPage([pipeline('retail_orders', 'bank_c360'), pipeline('bank_ledger', 'retail')])

    expect(groupedRows()).toEqual([
      ['Default project', ['No pipelines in the Default project.']],
      ['Project · bank_c360', ['retail_orders']],
      ['Project · retail', ['bank_ledger']],
    ])
  })

  it('groups every pipeline under the Default project on a server without project labels', async () => {
    await renderPage([pipeline('b_first'), pipeline('a_second')])

    expect(groupedRows()).toEqual([['Default project', ['b_first', 'a_second']]])
  })
})
