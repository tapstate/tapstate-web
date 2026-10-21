import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SourceView } from '@/service/source-client'

import type { PipelineSourceTableSelection } from '../../model/pipeline-node-model'
import type { PipelineCanvasSelection } from '../canvas/pipeline-canvas-types'
import type { PipelineSchemaOption, PipelineTableLoader } from './pipeline-data-node-schema'

import { PipelineNodeConfigPanel, PipelineSourceTablePicker } from './pipeline-node-config-panel'

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
    sources?: readonly SourceView[]
    upstreamSourceTables?: readonly PipelineSourceTableSelection[]
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
        sources={options.sources}
        upstreamSourceTables={options.upstreamSourceTables}
      />,
    )
  })
  return container
}

async function renderTablePicker(onChange: (tables: string[]) => void) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <PipelineSourceTablePicker
        sourceId={sourceView.id}
        sources={[sourceView]}
        options={[
          { label: 'Player', value: 'Player' },
          { label: 'Match', value: 'Match' },
        ]}
        selectionMode="single"
        allowPatterns={false}
        onChange={onChange}
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
  },
}

const sourceView = {
  id: 'mysql_feynman',
  metadata: null,
  connector: 'mysql',
  config: {},
  configuredSecrets: [],
  mode: 'replication',
  tables: [
    { type: 'table', name: 'Player', pattern: null, filter: null, pk: null, options: null },
    { type: 'table', name: 'Match', pattern: null, filter: null, pk: null, options: null },
    { type: 'pattern', name: null, pattern: 'player_*', filter: null, pk: null, options: null },
  ],
  options: null,
  srs: null,
  contentHash: 'a'.repeat(64),
} satisfies SourceView

describe('PipelineNodeConfigPanel', () => {
  it('renders Source configuration without connector metadata', async () => {
    const host = await renderPanel(sourceSelection)

    expect(host.textContent).toContain('Source')
    expect(host.textContent).toContain('Table')
    expect(host.textContent).not.toContain('Connector')
    expect(host.textContent).not.toContain('Table filter')
    expect(host.querySelector('[data-pipeline-source-table-picker]')).not.toBeNull()
  })

  it('renders the Source table scope as part of the Source schema', async () => {
    const host = await renderPanel(sourceSelection, undefined, { sources: [sourceView] })

    const scope = host.querySelector('[data-pipeline-source-scope]')
    expect(scope).not.toBeNull()
    expect(scope?.textContent).toContain('Source scope')
    expect(scope?.textContent).toContain('Player')
    expect(scope?.querySelector('[data-pipeline-source-scope-rule="player_*"]')).not.toBeNull()
  })

  it('keeps multiple selected tables on the same Source node', async () => {
    const changes: Array<{ values: Record<string, unknown> }> = []
    const host = await renderPanel(
      sourceSelection,
      (change) => changes.push({ values: change.values }),
      {
        tableOptions: [
          { label: 'Player', value: 'Player' },
          { label: 'Match', value: 'Match' },
        ],
        sources: [sourceView],
      },
    )

    await act(async () =>
      host
        .querySelector<HTMLElement>('[data-pipeline-source-table-picker-mode="multiple"]')
        ?.click(),
    )
    await act(async () => {
      host
        .querySelector<HTMLInputElement>('[data-pipeline-source-table-option="Match"] input')
        ?.click()
    })
    await act(async () => {
      host
        .querySelector<HTMLInputElement>('[data-pipeline-source-table-option="player_*"] input')
        ?.click()
    })
    expect(host.querySelector('[data-pipeline-source-table-picker-add]')).toBeNull()
    expect(changes.at(-1)?.values).toMatchObject({
      tables: ['Player', 'Match', '/player_*/'],
    })
  })

  it('selects exactly one Source table through the inline table list', async () => {
    const changes: Array<{ values: Record<string, unknown> }> = []
    const host = await renderPanel(
      sourceSelection,
      (change) => changes.push({ values: change.values }),
      {
        tableOptions: [
          { label: 'Player', value: 'Player' },
          { label: 'Match', value: 'Match' },
        ],
        sources: [sourceView],
      },
    )

    await act(async () => {
      host.querySelector<HTMLElement>('[data-pipeline-source-table-option="Match"]')?.click()
    })

    expect(
      host.querySelector('[data-pipeline-source-table-option="Match"][aria-checked="true"]'),
    ).not.toBeNull()
    expect(changes.at(-1)?.values).toMatchObject({ tables: ['Match'] })
  })

  it('validates and adds a custom Source regex rule to the same node', async () => {
    const changes: Array<{ values: Record<string, unknown> }> = []
    const host = await renderPanel(
      sourceSelection,
      (change) => changes.push({ values: change.values }),
      { sources: [sourceView] },
    )

    await act(async () =>
      host
        .querySelector<HTMLElement>('[data-pipeline-source-table-picker-mode="multiple"]')
        ?.click(),
    )
    const pattern = host.querySelector<HTMLInputElement>(
      '[data-pipeline-source-table-picker-pattern]',
    )
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(pattern, 'orders_.*')
      pattern?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host.querySelector<HTMLElement>('[data-pipeline-source-table-picker-add-pattern]')?.click(),
    )

    expect(changes.at(-1)?.values).toMatchObject({
      tables: ['Player', '/orders_.*/'],
    })
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

  it('offers the full-load policy next to the write mode and emits only a picked policy', async () => {
    const changes: Array<{ kind: string; values: Record<string, unknown> }> = []
    const host = await renderPanel(
      {
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
      },
      (change) => changes.push({ kind: change.kind, values: change.values }),
    )

    const labels = [...host.querySelectorAll('.tap-formily-item-label')].map(
      (label) => label.textContent,
    )
    expect(labels.indexOf('On full load')).toBe(labels.indexOf('Write mode') + 1)
    const policy = [...host.querySelectorAll('.tap-formily-item')].find((item) =>
      item.querySelector('.tap-formily-item-label')?.textContent?.includes('On full load'),
    )
    expect(policy?.textContent).toContain('Keep existing rows (default)')
    expect(changes).toHaveLength(0)

    await act(async () => {
      policy
        ?.querySelector('.tap-select')
        ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(
      [...document.querySelectorAll('.tap-select-item-option')].map((option) =>
        option.getAttribute('title'),
      ),
    ).toEqual(expect.arrayContaining(['Keep existing rows', 'Clear first', 'Refuse if not empty']))
    await act(async () => {
      document.querySelector<HTMLElement>('.tap-select-item-option[title="Clear first"]')?.click()
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

    expect(changes.at(-1)).toMatchObject({
      kind: 'target',
      values: { writeMode: 'upsert', onFullLoad: 'clear' },
    })
  })

  it('shows a view node write settings without offering to edit them', async () => {
    const viewSelection = (settings: { writeMode?: string; onFullLoad?: string }) => ({
      id: 'view:lead',
      label: 'lead',
      detail: null,
      description: '',
      nodeType: 'view' as const,
      connector: null,
      configuration: {
        kind: 'view' as const,
        nodeId: 'view:lead',
        viewId: 'lead',
        from: null,
        body: { primaryKey: 'id' },
        ...settings,
      },
    })

    const host = await renderPanel(viewSelection({ writeMode: 'append', onFullLoad: 'clear' }))
    const setting = (name: string) =>
      host.querySelector(`[data-pipeline-view-setting="${name}"]`)?.textContent
    expect(setting('writeMode')).toBe('Append')
    expect(setting('onFullLoad')).toBe('Clear first')
    expect(host.textContent).toContain(
      'Views are derived from the Pipeline definition and cannot be edited here.',
    )
    expect(
      host.querySelector('[data-pipeline-view-write-settings] input, [role="combobox"]'),
    ).toBeNull()

    await act(async () => root?.unmount())
    container?.remove()
    const undeclared = await renderPanel(viewSelection({}))
    expect(undeclared.querySelector('[data-pipeline-view-setting="writeMode"]')?.textContent).toBe(
      'Upsert (default)',
    )
    expect(undeclared.querySelector('[data-pipeline-view-setting="onFullLoad"]')?.textContent).toBe(
      'Keep existing rows (default)',
    )
  })

  it('allows a Target table to be selected from the catalog or entered as a new name', async () => {
    const changes: Array<{ kind: string; values: Record<string, unknown> }> = []
    const targetSelection: PipelineCanvasSelection = {
      ...sourceSelection,
      id: 'target:warehouse:player_archive',
      label: 'player_archive',
      nodeType: 'target',
      configuration: {
        kind: 'target',
        nodeId: 'target:warehouse:player_archive',
        sourceId: 'warehouse',
        table: 'player_archive',
        connectorId: 'mysql',
        writeMode: 'upsert',
      },
    }
    const host = await renderPanel(
      targetSelection,
      (change) => changes.push({ kind: change.kind, values: change.values }),
      {
        tableOptions: [
          { label: 'player', value: 'player' },
          { label: 'orders', value: 'orders' },
        ],
      },
    )

    const table = host.querySelector<HTMLInputElement>('input[role="combobox"]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(table, 'player_archive_v2')
      table?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(table?.value).toBe('player_archive_v2')
    expect(changes.at(-1)).toMatchObject({
      kind: 'target',
      values: { table: 'player_archive_v2' },
    })
  })

  it('shows one Target node with a mapping row for each upstream table', async () => {
    const changes: Array<{ values: Record<string, unknown> }> = []
    const targetSelection: PipelineCanvasSelection = {
      ...sourceSelection,
      id: 'target:warehouse:Player',
      label: 'Player',
      nodeType: 'target',
      configuration: {
        kind: 'target',
        nodeId: 'target:warehouse:Player',
        sourceId: 'warehouse',
        table: 'Player',
        connectorId: 'mysql',
        writeMode: 'upsert',
      },
    }
    const host = await renderPanel(
      targetSelection,
      (change) => changes.push({ values: change.values }),
      {
        upstreamSourceTables: [{ table: 'Player' }, { table: 'PlayerAddress' }],
        tableOptions: [{ label: 'Player', value: 'Player' }],
      },
    )

    expect(host.querySelectorAll('[data-pipeline-target-table-mapping]')).toHaveLength(2)
    expect(
      host.querySelector('[data-pipeline-target-table-mapping="PlayerAddress"]'),
    ).not.toBeNull()

    const table = host.querySelector<HTMLInputElement>(
      '[aria-label="Target table for PlayerAddress"]',
    )
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(table, 'player_address_archive')
      table?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(changes.at(-1)?.values).toMatchObject({
      tableMappings: [
        { sourceTable: 'Player', targetTable: 'Player' },
        { sourceTable: 'PlayerAddress', targetTable: 'player_address_archive' },
      ],
    })
  })

  it('uses catalog selectors for source and table when options are available', async () => {
    const host = await renderPanel(sourceSelection, undefined, {
      sourceOptions: [{ label: 'MySQL source', value: 'mysql_feynman' }],
      tableOptions: [{ label: 'Player', value: 'Player' }],
    })

    expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(1)
    expect(host.textContent).toContain('MySQL source')
    expect(host.textContent).toContain('Player')
    expect(host.querySelector('[role="radiogroup"]')).not.toBeNull()
  })

  it('loads a source table catalog through Formily x-reactions', async () => {
    const loadTables = vi.fn(async () => [{ label: 'Player', value: 'Player' }])
    await renderPanel(sourceSelection, undefined, { loadTables })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(loadTables).toHaveBeenCalledWith('mysql_feynman')
  })

  it('uses the loaded source schema as the table catalog while retaining regex scope rules', async () => {
    const loadTables = vi.fn(async () => [{ label: 'Player', value: 'Player' }])
    const host = await renderPanel(sourceSelection, undefined, {
      loadTables,
      sources: [sourceView],
    })

    await act(async () =>
      host
        .querySelector<HTMLElement>('[data-pipeline-source-table-picker-mode="multiple"]')
        ?.click(),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(host.querySelector('[data-pipeline-source-table-option="Player"]')).not.toBeNull()
    expect(host.querySelector('[data-pipeline-source-table-option="Match"]')).toBeNull()
    expect(host.querySelector('[data-pipeline-source-table-option="player_*"]')).not.toBeNull()
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

  it('locks the Wizard root picker to one physical table without exposing pattern scope', async () => {
    const changes: string[][] = []
    const host = await renderTablePicker((tables) => changes.push(tables))

    expect(host.querySelector('[data-pipeline-source-table-picker-mode]')).toBeNull()
    expect(host.querySelector('[data-pipeline-source-table-picker-pattern]')).toBeNull()
    expect(host.querySelector('[data-pipeline-source-table-option="player_*"]')).toBeNull()

    await act(async () => {
      host.querySelector<HTMLElement>('[data-pipeline-source-table-option="Match"]')?.click()
    })

    expect(changes).toEqual([['Match']])
  })
})
