import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PipelineCanvasSelection } from '../canvas/pipeline-canvas-types'
import type { PipelineSchemaOption, PipelineTableLoader } from './pipeline-data-node-schema'

import { PipelineNodeConfigPanel } from './pipeline-node-config-panel'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: ResizeObserverMock,
})

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function renderPanel(
  selection: PipelineCanvasSelection,
  onConfigurationChange?: (change: {
    nodeId: string
    kind: string
    values: Record<string, unknown>
  }) => void,
  options: {
    sourceOptions?: readonly PipelineSchemaOption[]
    tableOptions?: readonly PipelineSchemaOption[]
    loadTables?: PipelineTableLoader
  } = {},
  onDescriptionChange?: (description: string) => void,
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <PipelineNodeConfigPanel
        selection={selection}
        onClose={() => undefined}
        onConfigurationChange={onConfigurationChange}
        onDescriptionChange={onDescriptionChange}
        sourceOptions={options.sourceOptions}
        tableOptions={options.tableOptions}
        loadTables={options.loadTables}
      />,
    )
  })
  return container
}

const sourceSelection: PipelineCanvasSelection = {
  id: 'source:mysql_feynman:Player',
  label: 'Player',
  detail: 'mysql_feynman',
  description: '',
  nodeType: 'source',
  connector: { id: 'mysql', name: 'MySQL', icon: null },
  configuration: {
    kind: 'source',
    nodeId: 'source:mysql_feynman:Player',
    sourceId: 'mysql_feynman',
    table: 'Player',
    connectorId: 'mysql',
    filter: '',
  },
}

describe('PipelineNodeConfigPanel', () => {
  it('renders Source configuration without connector metadata', async () => {
    const host = await renderPanel(sourceSelection)

    expect(host.textContent).toContain('Source')
    expect(host.textContent).toContain('Table')
    expect(host.textContent).not.toContain('Connector')
    expect(host.textContent).toContain('Table filter')
    expect(host.querySelector('[role="combobox"]')).not.toBeNull()
  })

  it('renders Target configuration with the write mode selector', async () => {
    const host = await renderPanel({
      ...sourceSelection,
      id: 'target:mongodb_target:Player',
      label: 'Player',
      nodeType: 'target',
      configuration: {
        kind: 'target',
        nodeId: 'target:mongodb_target:Player',
        sourceId: 'mongodb_target',
        table: 'Player',
        connectorId: 'mongodb',
        writeMode: 'upsert',
      },
    })

    expect(host.textContent).toContain('Target source')
    expect(host.textContent).toContain('Target table')
    expect(host.textContent).toContain('Write mode')
    expect(host.querySelector('[role="combobox"]')).not.toBeNull()
  })

  it('uses catalog selectors for source and table when options are available', async () => {
    const host = await renderPanel(sourceSelection, undefined, {
      sourceOptions: [{ label: 'MySQL source', value: 'mysql_feynman' }],
      tableOptions: [{ label: 'Player', value: 'Player' }],
    })

    expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(2)
    expect(host.textContent).toContain('MySQL source')
    expect(host.textContent).toContain('Player')
  })

  it('loads a source table catalog through Formily x-reactions', async () => {
    const loadTables = vi.fn(async () => [{ label: 'Player', value: 'Player' }])
    await renderPanel(sourceSelection, undefined, { loadTables })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(loadTables).toHaveBeenCalledWith('mysql_feynman')
  })

  it('edits the node description in the panel header', async () => {
    const descriptions: string[] = []
    const host = await renderPanel(
      { ...sourceSelection, description: 'Reads player rows' },
      undefined,
      {},
      (description) => descriptions.push(description),
    )

    const description = host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Description"]',
    )
    expect(description?.value).toBe('Reads player rows')

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(description, 'Reads active player rows')
      description?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(descriptions).toEqual(['Reads active player rows'])
  })

  it('uses a dedicated transform editor instead of a generic Formily form', async () => {
    const host = await renderPanel({
      id: 'transform:normalize',
      label: 'normalize',
      detail: 'map',
      description: '',
      nodeType: 'transform',
      connector: null,
      configuration: {
        kind: 'transform',
        nodeId: 'transform:normalize',
        stepId: 'normalize',
        transformType: 'map',
        from: ['source:mysql_feynman:Player'],
        options: null,
        body: { fields: { accountId: { from: 'id' } } },
      },
    })

    expect(host.textContent).toContain('Map fields')
    expect(host.querySelector('input[aria-label="Target field"]')).not.toBeNull()
    expect(host.querySelector('input[aria-label="Source field or expression"]')).not.toBeNull()
    expect(host.textContent).not.toContain('Table filter')
  })

  it('emits local draft changes without replacing the selected node identity', async () => {
    const changes: Array<{ nodeId: string; kind: string; values: Record<string, unknown> }> = []
    const host = await renderPanel(sourceSelection, (change) => changes.push(change))
    const filter = host.querySelector<HTMLTextAreaElement>(
      'textarea:not([aria-label="Description"])',
    )
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

    await act(async () => {
      setter?.call(filter, 'id > 10')
      filter?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(changes.at(-1)).toMatchObject({
      nodeId: 'source:mysql_feynman:Player',
      kind: 'source',
      values: { filter: 'id > 10' },
    })
  })
})
