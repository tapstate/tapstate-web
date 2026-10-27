import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PipelineDraft, StartCheckReport } from '@/service/pipelines/pipeline-client'

import type { PipelineTableLoader } from '../components/node-config/pipeline-data-node-schema'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
} from '../components/node-library/pipeline-node-library-types'

const {
  getPipeline,
  getPipelineDraft,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  listPipelines,
  getSourceSchema,
  getStartChecks,
  runPipeline,
  stopPipeline,
  savePipelineLayout,
  updatePipeline,
  createPipelineDraft,
  updatePipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  listConnectors,
  listSources,
  configExpression,
  PipelineClientError,
} = vi.hoisted(() => ({
  getPipeline: vi.fn(),
  getPipelineDraft: vi.fn(),
  getPipelineLayout: vi.fn(),
  getPipelineLogs: vi.fn(),
  getPipelineMetrics: vi.fn(),
  getPipelineStatus: vi.fn(),
  listPipelines: vi.fn(),
  getSourceSchema: vi.fn(),
  getStartChecks: vi.fn(),
  runPipeline: vi.fn(),
  stopPipeline: vi.fn(),
  savePipelineLayout: vi.fn(),
  updatePipeline: vi.fn(),
  createPipelineDraft: vi.fn(),
  updatePipelineDraft: vi.fn(),
  previewPipelineDraft: vi.fn(),
  publishPipelineDraft: vi.fn(),
  listConnectors: vi.fn(),
  listSources: vi.fn(),
  configExpression: { current: 'updated-expression' },
  PipelineClientError: class PipelineClientError extends Error {
    status: number | null

    constructor(_kind: string, message: string, status: number | null = null) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: React.ComponentProps<'a'> & { params?: { pipelineId?: string }; to: string }) => (
    <a {...props} href={to.replace('$pipelineId', params?.pipelineId ?? '')}>
      {children}
    </a>
  ),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  getPipeline,
  getPipelineDraft,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  listPipelines,
  getStartChecks,
  runPipeline,
  stopPipeline,
  savePipelineLayout,
  updatePipeline,
  createPipelineDraft,
  updatePipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  PipelineClientError,
}))

vi.mock('@/service/source-client', () => ({
  getSourceSchema,
  listConnectors,
  listSources,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

vi.mock('../components/canvas/pipeline-canvas', () => {
  let canvasRenderCount = 0

  const MockPipelineCanvas = ({
    onSelectionChange,
    onAddNode,
    loadTables,
  }: {
    onSelectionChange: (selection: {
      id: string
      label: string
      detail: string | null
      description: string
      nodeType: string
      connector: null
      configuration?: {
        kind: 'transform'
        nodeId: string
        stepId: string
        transformType: string
        from: string[]
        options: null
        body: { expr: string }
      } | null
    }) => void
    onAddNode: (choice: PipelineNodeChoice, context: PipelineNodeInsertionContext) => void
    loadTables?: PipelineTableLoader
  }) => {
    canvasRenderCount += 1
    const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false)
    const [sourceExpanded, setSourceExpanded] = useState(false)
    const [insertion, setInsertion] = useState<PipelineNodeInsertionContext>({
      position: { x: 120, y: 80 },
      connectFrom: null,
      connectTo: null,
    })

    const openSelector = (context: PipelineNodeInsertionContext) => {
      setInsertion(context)
      setNodeSelectorOpen(true)
    }

    const chooseNode = (choice: PipelineNodeChoice) => {
      onAddNode(choice, insertion)
      setNodeSelectorOpen(false)
      setSourceExpanded(false)
    }

    return (
      <div data-testid="pipeline-canvas-render-count" data-render-count={canvasRenderCount}>
        <button
          type="button"
          data-testid="pipeline-canvas"
          onClick={() =>
            onSelectionChange({
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
                from: ['orders'],
                options: null,
                body: { expr: '' },
              },
            })
          }
        >
          Canvas
        </button>
        <button
          type="button"
          aria-label="Add node"
          onClick={() =>
            openSelector({
              position: { x: 120, y: 80 },
              connectFrom: null,
              connectTo: null,
            })
          }
        >
          Add node
        </button>
        <button
          type="button"
          data-testid="select-source-node"
          onClick={() =>
            onSelectionChange({
              id: 'source:mysql:orders',
              label: 'orders',
              detail: 'mysql',
              description: '',
              nodeType: 'source',
              connector: null,
            })
          }
        >
          Select source node
        </button>
        <button
          type="button"
          data-testid="select-target-node"
          onClick={() =>
            onSelectionChange({
              id: 'target:mongo_out:orders',
              label: 'orders',
              detail: 'mongo_out',
              description: '',
              nodeType: 'target',
              connector: null,
            })
          }
        >
          Select target node
        </button>
        <button
          type="button"
          data-testid="load-source-schema"
          onClick={() => void loadTables?.('mysql_feynman')}
        >
          Load source schema
        </button>
        <div className="pipeline-canvas__operator" />
        <button
          type="button"
          data-testid="add-transform"
          onClick={() =>
            openSelector({
              position: { x: 120, y: 80 },
              screenPosition: { x: 320, y: 180 },
              connectFrom: null,
              connectTo: null,
            })
          }
        >
          Add transform
        </button>
        <button
          type="button"
          data-testid="request-add"
          onClick={() =>
            openSelector({
              position: { x: 420, y: 180 },
              screenPosition: { x: 620, y: 280 },
              connectFrom: 'source:mysql:orders',
              connectTo: null,
            })
          }
        >
          Request add
        </button>
        {nodeSelectorOpen && (
          <div role="dialog" aria-label="Node selector">
            <button
              type="button"
              data-node-selector-source="mysql_feynman"
              onClick={() => setSourceExpanded(true)}
            >
              mysql_feynman
            </button>
            {sourceExpanded && (
              <button
                type="button"
                data-node-selector-table="mysql_feynman:Player"
                onClick={() =>
                  chooseNode({
                    kind: 'source',
                    sourceId: 'mysql_feynman',
                    table: 'Player',
                    connectorId: 'mysql',
                  })
                }
              >
                Player
              </button>
            )}
            <button
              type="button"
              data-node-choice="transform:filter"
              onClick={() => chooseNode({ kind: 'transform', transformType: 'filter' })}
            >
              Filter
            </button>
          </div>
        )}
      </div>
    )
  }

  return {
    PipelineCanvas: MockPipelineCanvas,
    PipelineCanvasContent: MockPipelineCanvas,
  }
})

vi.mock('../components/node-config/pipeline-node-config-panel', () => ({
  PipelineNodeConfigPanel: ({
    selection,
    sourceOptions,
    onConfigurationChange,
  }: {
    selection: { label: string; detail: string | null; id: string; configuration?: unknown }
    sourceOptions?: readonly { label: string; value: string }[]
    onConfigurationChange?: (change: {
      nodeId: string
      kind: 'transform'
      values: Record<string, unknown>
    }) => void
  }) => (
    <aside data-workflow-right-panel>
      <h2>{selection.label}</h2>
      <p>{selection.detail}</p>
      <ul data-testid="panel-source-options">
        {(sourceOptions ?? []).map((option) => (
          <li key={option.value} data-source-option={option.value}>
            {option.label}
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-testid="change-node-config"
        onClick={() =>
          onConfigurationChange?.({
            nodeId: selection.id,
            kind: 'transform',
            values: { expr: configExpression.current },
          })
        }
      >
        Change config
      </button>
    </aside>
  ),
}))

vi.mock('./wizard-builder', () => ({
  WizardBuilder: ({
    pipelineId,
    draft,
    etag,
    readOnly,
    runtimeObservationPending,
    runtimeObservationError,
  }: {
    pipelineId: string
    draft: { mode: string }
    etag: string
    readOnly?: boolean
    runtimeObservationPending?: boolean
    runtimeObservationError?: boolean
  }) => (
    <div
      data-testid="wizard-builder"
      data-pipeline-id={pipelineId}
      data-draft-mode={draft.mode}
      data-etag={etag}
      data-read-only={readOnly ? 'true' : 'false'}
      data-runtime-pending={runtimeObservationPending ? 'true' : 'false'}
      data-runtime-error={runtimeObservationError ? 'true' : 'false'}
    />
  ),
}))

import fixture from '../start-checks/__fixtures__/client-fixture-v1.json'
import { PipelineEditorPage, PipelineWorkspacePage } from './pipeline-editor-page'

const answerable: StartCheckReport = fixture.answerable
const leadFinding = 'target-not-empty/views/lead'
const driftFinding = 'derived-schema-drift/join_orders'
const definitionChange = {
  finding: leadFinding,
  action: 'clear',
  kind: 'CHANGE_DEFINITION',
  changes: [{ element: 'lead', field: 'on_full_load', from: 'append', to: 'clear' }],
  contentHash: 'e'.repeat(64),
}

/** The stored draft once a start-check answer set on_full_load on its target node. */
const draftAfterStartChange: PipelineDraft = {
  pipelineId: 'orders_to_warehouse',
  schemaVersion: 1,
  revision: 4,
  mode: 'dag',
  name: 'orders_to_warehouse',
  description: null,
  graph: {
    nodes: [
      {
        id: 'source:mysql:orders',
        type: 'source',
        sourceId: 'mysql',
        table: 'orders',
        config: { tables: ['orders'], connectorId: 'mysql' },
        metadata: { label: 'orders', detail: 'mysql' },
      },
      {
        id: 'transform:normalize',
        type: 'map',
        config: { from: 'orders', expr: 'original-expression' },
        metadata: {
          label: 'normalize',
          detail: 'map',
          editorKind: 'transform',
          stepId: 'normalize',
        },
      },
      {
        id: 'target:warehouse:lead',
        type: 'target',
        sourceId: 'warehouse',
        table: 'lead',
        config: { connectorId: 'mongodb', writeMode: 'upsert', onFullLoad: 'clear' },
        metadata: { label: 'lead', detail: 'warehouse' },
      },
    ],
    edges: [
      { id: 'orders-normalize', source: 'source:mysql:orders', target: 'transform:normalize' },
      { id: 'normalize-lead', source: 'transform:normalize', target: 'target:warehouse:lead' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  wizard: null,
  baseArtifactHash: 'e'.repeat(64),
  publishedDraftRevision: 4,
  publishedArtifactHash: 'e'.repeat(64),
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:02Z',
  updatedBy: 'admin',
}

/** The error a start stopped by its start checks rejects with, as the Pipeline client builds it. */
function startRefusal(report: StartCheckReport) {
  return Object.assign(new Error('Starting orders_to_warehouse needs an answer.'), {
    status: 409,
    code: 'lifecycle.start-needs-confirmation',
    params: { pipeline: 'orders_to_warehouse', count: 2 },
    startChecks: report,
    decisionsApplied: [],
  })
}

function startChecksDialog() {
  return document.querySelector<HTMLElement>('[data-testid="start-checks-dialog"]')
}

function dialogButton(text: string) {
  return [...(startChecksDialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

function answerRadio(finding: string, action: string) {
  return startChecksDialog()?.querySelector<HTMLElement>(
    `[data-check-item="${finding}"] [data-check-choice="${action}"] [role="radio"]`,
  )
}

function canvasNotice() {
  return document.querySelector<HTMLElement>(
    '.pipeline-canvas__alerts [data-testid="pipeline-start-notice"]',
  )
}

async function editAndRun() {
  await vi.waitFor(() =>
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
  )
  await act(async () =>
    document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
  )
  await vi.waitFor(() =>
    expect(document.querySelector('[data-testid="change-node-config"]')).not.toBeNull(),
  )
  await act(async () =>
    document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
  )
  await act(async () => elementWithText('button', 'Run')?.click())
  await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
  expect(document.querySelector('[data-workflow-header] [aria-busy="true"]')).toBeNull()
}

/** Lets the reloads a start triggers land before the next edit, so they cannot reset it. */
async function settleAfterStart() {
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 100)))
}

async function editNodeConfiguration() {
  await vi.waitFor(async () => {
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )
    expect(elementWithText('button', 'Save')?.hasAttribute('disabled')).toBe(false)
  })
}

async function answerStartChecks() {
  await act(async () => answerRadio(leadFinding, 'clear')?.click())
  await act(async () => answerRadio(driftFinding, 'accept')?.click())
  await act(async () => dialogButton('Start')?.click())
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function elementWithText(selector: string, text: string) {
  return [...(document.querySelectorAll<HTMLElement>(selector) ?? [])].find((element) =>
    element.textContent?.includes(text),
  )
}

async function renderPage(section: 'orchestrate' | 'logs' | 'monitoring' = 'orchestrate') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        {section === 'orchestrate' ? (
          <PipelineEditorPage pipelineId="orders_to_warehouse" />
        ) : (
          <PipelineWorkspacePage pipelineId="orders_to_warehouse" section={section} />
        )}
      </QueryClientProvider>,
    )
  })
}

beforeEach(() => {
  configExpression.current = 'updated-expression'
  getPipelineDraft.mockRejectedValue(new PipelineClientError('server', 'not found', 404))
  createPipelineDraft.mockImplementation(async (_pipelineId, mutation) => ({
    draft: {
      ...mutation,
      schemaVersion: 1,
      revision: 2,
      publishedDraftRevision: null,
      publishedArtifactHash: null,
      createdAt: '2026-09-21T00:00:00Z',
      updatedAt: '2026-09-21T00:00:00Z',
      updatedBy: 'test',
    },
    etag: '"2"',
  }))
  updatePipelineDraft.mockImplementation(async (_pipelineId, mutation) => ({
    draft: {
      ...mutation,
      schemaVersion: 1,
      revision: 3,
      publishedDraftRevision: null,
      publishedArtifactHash: null,
      createdAt: '2026-09-21T00:00:00Z',
      updatedAt: '2026-09-21T00:00:00Z',
      updatedBy: 'test',
    },
    etag: '"3"',
  }))
  publishPipelineDraft.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    revision: 3,
    published: true,
    artifactHash: 'a'.repeat(64),
  })
  runPipeline.mockResolvedValue({ pipelineId: 'orders_to_warehouse' })
  stopPipeline.mockResolvedValue({})
  previewPipelineDraft.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    revision: 2,
    artifact: {},
  })
  getPipeline.mockResolvedValue({
    id: 'orders_to_warehouse',
    sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
    transforms: [{ id: 'normalize', type: 'map', from: 'orders', expr: 'original-expression' }],
    serve: { id: 'orders_api', from: 'normalize', sync: [] },
    contentHash: 'a'.repeat(64),
    dag: {
      nodes: [
        { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
        { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
        { id: 'serve:orders_api', type: 'serve', label: 'orders_api', detail: null },
      ],
      edges: [
        {
          id: 'source:mysql:orders->transform:normalize',
          source: 'source:mysql:orders',
          target: 'transform:normalize',
          label: null,
        },
        {
          id: 'transform:normalize->serve:orders_api',
          source: 'transform:normalize',
          target: 'serve:orders_api',
          label: null,
        },
      ],
    },
  })
  getPipelineLayout.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    nodes: {},
    viewport: null,
  })
  getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'STOPPED' })
  getPipelineMetrics.mockResolvedValue({ pipelineId: 'orders_to_warehouse', metrics: {} })
  getPipelineLogs.mockResolvedValue({ pipelineId: 'orders_to_warehouse', lines: [] })
  savePipelineLayout.mockResolvedValue({
    pipelineId: 'orders_to_warehouse',
    nodes: {},
    viewport: null,
  })
  updatePipeline.mockResolvedValue({
    pipeline: {
      id: 'orders_to_warehouse',
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      transforms: [{ id: 'normalize', type: 'map', from: 'orders', expr: 'updated-expression' }],
      serve: { id: 'orders_api', from: 'normalize', sync: [] },
      contentHash: 'b'.repeat(64),
      dag: {
        nodes: [
          { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
          { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
        ],
        edges: [
          {
            id: 'source:mysql:orders->transform:normalize',
            source: 'source:mysql:orders',
            target: 'transform:normalize',
            label: null,
          },
        ],
      },
    },
    etag: `"${'b'.repeat(64)}"`,
  })
  listSources.mockResolvedValue([
    {
      id: 'mysql_feynman',
      connector: 'mysql',
      tables: [{ name: 'Player', pattern: null }],
    },
  ])
  getSourceSchema.mockResolvedValue({
    connectionId: 'mysql_feynman',
    connectorId: 'mysql',
    discoveredAt: 1_754_800_000_000,
    tables: [{ name: 'Player', fields: [], primaryKey: [], indexes: [] }],
  })
  listConnectors.mockResolvedValue([
    { id: 'mysql', name: 'MySQL', icon: '/connectors/mysql.svg', sink: false },
    { id: 'mongodb', name: 'MongoDB', icon: '/connectors/mongodb.svg', sink: true },
    {
      id: 'mongodb-atlas',
      name: 'MongoDB Atlas',
      icon: '/connectors/mongodb-atlas.svg',
      sink: true,
    },
  ] as never)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  // Reset rather than clear: a one-shot response a test queued but did not use must not leak into
  // the next test. beforeEach sets every default again.
  vi.resetAllMocks()
})

describe('PipelineEditorPage', () => {
  it('opens a Wizard draft in Wizard mode without hydrating it as a DAG', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'wizard',
        name: 'orders_to_warehouse',
        description: null,
        graph: null,
        wizard: {
          root: { id: 'root', sourceId: 'mysql_feynman', table: 'Player', key: ['id'] },
          related: [],
          transforms: [],
          output: { kind: 'atlas', config: {} },
        },
        baseArtifactHash: null,
        publishedDraftRevision: null,
        publishedArtifactHash: null,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="wizard-builder"]')).not.toBeNull(),
    )
    const wizard = document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')
    expect(wizard?.dataset).toMatchObject({
      pipelineId: 'orders_to_warehouse',
      draftMode: 'wizard',
      etag: '"3"',
    })
    expect(getPipeline).not.toHaveBeenCalled()
    expect(getPipelineLayout).not.toHaveBeenCalled()
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
  })

  it('checks the authoritative lifecycle for an unpublished DAG draft', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'dag',
        name: 'orders_to_warehouse',
        description: null,
        graph: { nodes: [], edges: [], viewport: null },
        wizard: null,
        baseArtifactHash: null,
        publishedDraftRevision: null,
        publishedArtifactHash: null,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })

    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
  })

  it('checks draft lifecycle without querying runtime metrics', async () => {
    getPipelineStatus.mockResolvedValue({
      pipelineId: 'orders_to_warehouse',
      state: 'NOT_STARTED',
      displayState: 'NOT_STARTED',
      hasArtifact: false,
    })
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'dag',
        name: 'orders_to_warehouse',
        description: null,
        graph: { nodes: [], edges: [], viewport: null },
        wizard: null,
        baseArtifactHash: null,
        publishedDraftRevision: null,
        publishedArtifactHash: null,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })

    await renderPage('monitoring')

    await vi.waitFor(() =>
      expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function)),
    )
    await vi.waitFor(() => expect(container?.textContent).toContain('This Pipeline is a draft'))
    expect(getPipelineMetrics).not.toHaveBeenCalled()
  })

  it('keeps a published Wizard visible and read-only while runtime status is pending', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'wizard',
        name: 'orders_to_warehouse',
        description: null,
        graph: null,
        wizard: { root: null, related: [], transforms: [], output: { kind: 'atlas', config: {} } },
        baseArtifactHash: 'a'.repeat(64),
        publishedDraftRevision: 2,
        publishedArtifactHash: 'b'.repeat(64),
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })
    let resolveStatus: ((status: { pipelineId: string; state: 'STOPPED' }) => void) | undefined
    getPipelineStatus.mockImplementationOnce(
      () => new Promise((resolve) => (resolveStatus = resolve)),
    )

    await renderPage()
    await vi.waitFor(() => expect(getPipelineStatus).toHaveBeenCalledTimes(1))
    const wizard = document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')
    expect(wizard?.dataset.readOnly).toBe('true')
    expect(wizard?.dataset.runtimePending).toBe('true')
    expect(container?.textContent).not.toContain(
      'Checking runtime status before opening the editor',
    )

    await act(async () => resolveStatus?.({ pipelineId: 'orders_to_warehouse', state: 'STOPPED' }))
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')?.dataset.readOnly,
      ).toBe('false'),
    )
  })

  it('keeps a published Wizard visible when runtime status lookup fails', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 6,
        mode: 'wizard',
        name: 'orders_to_warehouse',
        description: null,
        graph: null,
        wizard: { root: null, related: [], transforms: [], output: { kind: 'atlas', config: {} } },
        baseArtifactHash: 'a'.repeat(64),
        publishedDraftRevision: 6,
        publishedArtifactHash: 'b'.repeat(64),
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"6"',
    })
    getPipelineStatus.mockRejectedValue(new Error('Runtime query failed'))

    await renderPage()
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')?.dataset.runtimeError,
      ).toBe('true'),
    )
    expect(
      document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')?.dataset.readOnly,
    ).toBe('true')
    expect(container?.textContent).not.toContain(
      'Checking runtime status before opening the editor',
    )
  })

  it('keeps a published DAG visible while runtime status is pending or unavailable', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'dag',
        name: 'orders_to_warehouse',
        description: null,
        graph: {
          nodes: [
            {
              id: 'source:orders',
              type: 'source',
              sourceId: 'mysql_feynman',
              table: 'Player',
              config: {},
              metadata: {},
            },
            {
              id: 'target:orders',
              type: 'target',
              sourceId: 'mongo_out',
              table: 'Player',
              config: {},
              metadata: {},
            },
          ],
          edges: [{ id: 'source-to-target', source: 'source:orders', target: 'target:orders' }],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        wizard: null,
        baseArtifactHash: null,
        publishedDraftRevision: 3,
        publishedArtifactHash: 'a'.repeat(64),
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })
    let rejectStatus: ((reason: Error) => void) | undefined
    getPipelineStatus.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (rejectStatus = reject)),
    )

    await renderPage()
    await vi.waitFor(() => expect(getPipelineStatus).toHaveBeenCalledTimes(1))
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull()

    await act(async () => rejectStatus?.(new Error('Runtime status unavailable')))
    await vi.waitFor(() =>
      expect(container?.textContent).toContain('Could not confirm runtime status.'),
    )
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull()
    expect(elementWithText('button', 'Run')).toBeUndefined()
    await act(async () => elementWithText('button', 'Retry')?.click())
    await vi.waitFor(() => expect(getPipelineStatus).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(elementWithText('button', 'Run')).toBeDefined())
    expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull()
  })

  it('opens a published Wizard read-only when its runtime is active', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        pipelineId: 'orders_to_warehouse',
        schemaVersion: 1,
        revision: 3,
        mode: 'wizard',
        name: 'orders_to_warehouse',
        description: null,
        graph: null,
        wizard: { root: null, related: [], transforms: [], output: { kind: 'atlas', config: {} } },
        baseArtifactHash: 'a'.repeat(64),
        publishedDraftRevision: 2,
        publishedArtifactHash: 'b'.repeat(64),
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        updatedBy: 'test',
      },
      etag: '"3"',
    })
    getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })

    await renderPage()
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLElement>('[data-testid="wizard-builder"]')?.dataset.readOnly,
      ).toBe('true'),
    )
    expect(document.querySelector('[data-testid="pipeline-readonly-banner"]')).toBeNull()
  })

  it('keeps the canvas in the Build route and exposes separate workspace navigation', async () => {
    getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-status"]')?.textContent).toContain(
        'Running',
      ),
    )
    expect(document.querySelector('[data-testid="pipeline-readonly-banner"]')).toBeNull()
    expect(elementWithText('button', 'Stop')).toBeDefined()
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(elementWithText('span', 'PIPELINE')).toBeUndefined()
    expect(elementWithText('a', 'Build')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit',
    )
    expect(elementWithText('a', 'Monitoring')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit/monitoring',
    )
    expect(elementWithText('a', 'Logs')?.getAttribute('href')).toBe(
      '/pipelines/orders_to_warehouse/edit/logs',
    )
    expect(elementWithText('a', 'Build')?.className).toContain(
      'pipeline-workspace__nav-link--active',
    )
    expect(elementWithText('a', 'Build')?.querySelector('span')?.className).toContain(
      'max-sm:sr-only',
    )
  })

  it('confirms a stop before sending the request for a running pipeline', async () => {
    getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })
    await renderPage()

    await act(async () => {
      await vi.waitFor(() => expect(elementWithText('button', 'Stop')).toBeDefined())
      elementWithText('button', 'Stop')?.click()
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())
    })

    expect(stopPipeline).not.toHaveBeenCalled()

    await act(async () => {
      elementWithText('button', 'Stop and keep state')?.click()
      await vi.waitFor(() =>
        expect(stopPipeline).toHaveBeenCalledWith(
          'orders_to_warehouse',
          false,
          expect.any(Function),
        ),
      )
    })
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  })

  it('keeps navigation as a docked workspace aside inside the 4px workspace gutter', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    const navigation = document.querySelector<HTMLElement>('[data-testid="workspace-navigation"]')
    expect(navigation?.dataset.collapsed).toBe('false')
    expect(navigation?.className).toContain('pipeline-workspace__navigation')
    expect(navigation?.className).toContain('max-sm:w-14')
    expect(navigation?.className).toContain('relative')
    expect(navigation?.className).not.toContain('absolute')
    expect(navigation?.className).not.toContain('p-1')
    expect(navigation?.parentElement?.className).toContain('flex')
    expect(navigation?.parentElement?.className).toContain('gap-1')
    expect(navigation?.parentElement?.className).toContain('p-1')
    expect(navigation?.firstElementChild?.className).toContain(
      'pipeline-workspace__navigation-panel',
    )
    const navigationTitle = document.querySelector('[data-testid="workspace-navigation-title"]')
    expect(navigationTitle?.textContent).toBe('Pipelines')
    expect(navigationTitle?.closest('a')?.getAttribute('href')).toBe('/pipelines')

    await act(async () =>
      document.querySelector<HTMLElement>('[aria-label="Collapse workspace navigation"]')?.click(),
    )
    await vi.waitFor(() => expect(navigation?.dataset.collapsed).toBe('true'))

    await act(async () =>
      document.querySelector<HTMLElement>('[aria-label="Expand workspace navigation"]')?.click(),
    )
    await vi.waitFor(() => expect(navigation?.dataset.collapsed).toBe('false'))
  })

  it('keeps secondary canvas panels out of the initial reading path', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )

    expect(document.querySelector('[aria-label="Add node"]')).not.toBeNull()
    expect(container?.textContent).not.toContain('Select a node')
  })

  it('keeps workspace actions, inspector, and canvas controls in separate layers', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )

    expect(document.querySelector('[data-workflow-header]')).not.toBeNull()
    expect(document.querySelector('[data-workflow-header]')?.getAttribute('data-placement')).toBe(
      'floating',
    )
    expect(document.querySelector('.pipeline-canvas__top-overlay')).toBeNull()
    expect(document.querySelector('.pipeline-canvas__operator')).not.toBeNull()

    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[data-workflow-right-panel]')).not.toBeNull(),
    )
  })

  it('opens the shared node selector from Build navigation and inserts a selected Source table', async () => {
    await renderPage()

    await vi.waitFor(() => expect(document.querySelector('[aria-label="Add node"]')).not.toBeNull())
    await act(async () => document.querySelector<HTMLElement>('[aria-label="Add node"]')?.click())
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-selector-source="mysql_feynman"]')?.click(),
    )
    await act(async () =>
      document
        .querySelector<HTMLElement>('[data-node-selector-table="mysql_feynman:Player"]')
        ?.click(),
    )

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const saveButton = elementWithText('button', 'Save')
    expect(saveButton?.hasAttribute('disabled')).toBe(false)
    await act(async () => saveButton?.click())
    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(1))
    expect(createPipelineDraft.mock.calls[0]?.[1]).toMatchObject({
      graph: {
        nodes: expect.arrayContaining([expect.objectContaining({ sourceId: 'mysql_feynman' })]),
      },
    })
  })

  it('loads Source table options from the connection schema endpoint', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="load-source-schema"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="load-source-schema"]')?.click(),
    )

    expect(getSourceSchema).toHaveBeenCalledWith('mysql_feynman', expect.any(Function))
  })

  it('inserts a transform connected from an unconnected node output', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="request-add"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="request-add"]')?.click(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-choice="transform:filter"]')?.click(),
    )

    const saveButton = elementWithText('button', 'Save')
    await act(async () => saveButton?.click())
    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(1))
    expect(createPipelineDraft.mock.calls[0]?.[1]).toMatchObject({
      graph: {
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'draft:transform:filter_1', type: 'filter' }),
        ]),
      },
    })
  })

  it('uses the single-pipeline lifecycle projection without reading the catalog', async () => {
    listPipelines.mockResolvedValue([])
    getPipelineStatus.mockResolvedValue({
      pipelineId: 'orders_to_warehouse',
      state: 'STOPPED',
      displayState: 'STARTING',
      desiredState: 'RUNNING',
      observedState: 'STOPPED',
      hasArtifact: true,
    })
    await renderPage()
    await vi.waitFor(() => {
      expect(getPipelineStatus).toHaveBeenCalled()
      expect(document.querySelector('[data-testid="pipeline-status"]')?.textContent).toContain(
        'Starting',
      )
    })
    expect(listPipelines).not.toHaveBeenCalled()
  })

  it.each(['NEW', 'UNAVAILABLE'])(
    'does not render legacy %s as a builder lifecycle',
    async (state) => {
      getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state })
      await renderPage()
      await vi.waitFor(() =>
        expect(container?.textContent).toContain('Could not confirm runtime status.'),
      )
      expect(document.querySelector('[data-testid="pipeline-status"]')).toBeNull()
      expect(elementWithText('button', 'Run')).toBeUndefined()
    },
  )

  it('checks authoritative status even when the local draft has no artifact hash', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        ...draftAfterStartChange,
        baseArtifactHash: null,
        publishedArtifactHash: null,
        publishedDraftRevision: null,
      },
      etag: '"4"',
    })
    getPipelineStatus.mockResolvedValue({
      pipelineId: 'orders_to_warehouse',
      state: 'RUNNING',
      displayState: 'RUNNING',
      hasArtifact: true,
    })
    await renderPage()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-status"]')?.textContent).toContain(
        'Running',
      ),
    )
    expect(getPipelineStatus).toHaveBeenCalled()
    expect(elementWithText('button', 'Run')).toBeUndefined()
  })

  it('guards a hashless draft when authoritative lifecycle cannot be read', async () => {
    getPipelineDraft.mockResolvedValue({
      draft: {
        ...draftAfterStartChange,
        baseArtifactHash: null,
        publishedArtifactHash: null,
        publishedDraftRevision: null,
      },
      etag: '"4"',
    })
    getPipelineStatus.mockRejectedValue(new Error('status unavailable'))
    await renderPage()
    await vi.waitFor(() =>
      expect(container?.textContent).toContain('Could not confirm runtime status.'),
    )
    expect(elementWithText('button', 'Run')).toBeUndefined()
    expect(document.querySelector('[data-testid="pipeline-status"]')).toBeNull()
  })

  it('shows the backend not-started projection without inventing a runtime observation', async () => {
    getPipelineStatus.mockResolvedValue({
      pipelineId: 'orders_to_warehouse',
      state: 'NEW',
      displayState: 'NOT_STARTED',
      hasArtifact: true,
    })
    await renderPage()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-status"]')?.textContent).toContain(
        'Not started',
      ),
    )
    expect(elementWithText('button', 'Run')).toBeDefined()
  })

  it('does not invent a lifecycle state while the single-pipeline read fails', async () => {
    listPipelines.mockResolvedValue([
      { id: 'orders_to_warehouse', hasArtifact: true, status: { state: 'NEW' } },
    ])
    getPipelineStatus.mockRejectedValue(new Error('status read failed'))
    await renderPage()
    await vi.waitFor(() => expect(container?.textContent).toContain('runtime'))
    expect(document.querySelector('[data-testid="pipeline-status"]')).toBeNull()
    expect(listPipelines).not.toHaveBeenCalled()
  })

  it('loads status and metrics after navigating to Monitoring', async () => {
    getPipelineStatus.mockResolvedValue({ pipelineId: 'orders_to_warehouse', state: 'RUNNING' })
    await renderPage('monitoring')

    await vi.waitFor(() => expect(container?.textContent).toContain('Running'))
    expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineMetrics).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    expect(getPipelineLogs).not.toHaveBeenCalled()
  })

  it('loads logs only after navigating to Logs', async () => {
    await renderPage('logs')

    await vi.waitFor(() => expect(container?.textContent).toContain('No log lines'))
    expect(getPipelineLogs).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function))
    await vi.waitFor(() =>
      expect(getPipelineStatus).toHaveBeenCalledWith('orders_to_warehouse', expect.any(Function)),
    )
    expect(getPipelineMetrics).not.toHaveBeenCalled()
  })

  it('gives the Logs route one page heading owned by the logs content', async () => {
    await renderPage('logs')

    await vi.waitFor(() => expect(container?.textContent).toContain('Pipeline logs'))
    const workspace = document.querySelector<HTMLElement>('[data-testid="pipeline-workspace"]')
    const main = document.querySelector<HTMLElement>('[data-testid="workspace-main"]')
    const headings = [...(container?.querySelectorAll('h1') ?? [])]
    expect(headings).toHaveLength(1)
    expect(headings[0]?.textContent).toBe('Pipeline logs')
    expect(workspace?.className).toContain('gap-1')
    expect(workspace?.className).toContain('p-1')
    expect(main?.className).toContain('pipeline-workspace__main')
    expect(main?.className).toContain('pipeline-workspace__main--logs')
    expect(main?.className).toContain('flex-1')
    expect(container?.textContent).toContain(
      'Showing the latest log lines captured for this Pipeline. Filters apply only to this returned tail.',
    )
  })

  it('returns to node configuration when a node is selected on the canvas', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )

    await vi.waitFor(() =>
      expect(document.querySelector('[data-workflow-right-panel]')).not.toBeNull(),
    )
    expect(container?.textContent).toContain('normalize')
    expect(container?.textContent).toContain('map')
  })

  it('includes edited node configuration in the save mutation and clears dirty state', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="change-node-config"]')).not.toBeNull(),
    )

    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )
    const saveButton = elementWithText('button', 'Save')
    expect(saveButton?.hasAttribute('disabled')).toBe(false)

    await act(async () => saveButton?.click())
    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(1))
    expect(createPipelineDraft.mock.calls[0]?.[1]).toMatchObject({
      graph: {
        nodes: expect.arrayContaining([
          expect.objectContaining({
            config: { expr: 'updated-expression', from: 'orders' },
          }),
        ]),
      },
    })
    await vi.waitFor(() =>
      expect(elementWithText('button', 'Save')?.hasAttribute('disabled')).toBe(true),
    )
  })

  it('publishes the revision just saved when starting a dirty DAG with an older autosave result', async () => {
    await renderPage()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )
    await act(async () => elementWithText('button', 'Save')?.click())
    await vi.waitFor(() => expect(createPipelineDraft).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(elementWithText('button', 'Save')?.hasAttribute('disabled')).toBe(true),
    )
    configExpression.current = 'latest-expression'
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )
    await vi.waitFor(() =>
      expect(elementWithText('button', 'Save')?.hasAttribute('disabled')).toBe(false),
    )
    await act(async () => elementWithText('button', 'Run')?.click())

    await vi.waitFor(() => expect(updatePipelineDraft).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(publishPipelineDraft).toHaveBeenCalledTimes(1))
    expect(publishPipelineDraft).toHaveBeenCalledWith(
      'orders_to_warehouse',
      3,
      null,
      expect.any(Function),
    )
  })

  it('renders save failures in the canvas feedback lane', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="change-node-config"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )

    createPipelineDraft.mockRejectedValueOnce(
      new Error('Reference points to nothing in this workspace.'),
    )
    await act(async () => elementWithText('button', 'Save')?.click())

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-workflow-feedback"]')).not.toBeNull(),
    )
    expect(
      document.querySelector('.pipeline-canvas-surface .pipeline-canvas__alerts'),
    ).not.toBeNull()
    expect(
      document.querySelector('[data-testid="pipeline-workflow-feedback"]')?.textContent,
    ).toContain('Reference points to nothing in this workspace.')

    await act(async () => elementWithText('button', 'Save')?.click())
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[data-testid="pipeline-workflow-feedback"]')).toHaveLength(
        2,
      ),
    )

    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Dismiss save error"]')?.click(),
    )
    expect(document.querySelectorAll('[data-testid="pipeline-workflow-feedback"]')).toHaveLength(1)
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Dismiss save error"]')?.click(),
    )
    expect(document.querySelector('[data-testid="pipeline-workflow-feedback"]')).toBeNull()
  })

  it('refuses to save while the Source catalog is unavailable', async () => {
    listSources.mockRejectedValueOnce(new Error('Source catalog unavailable'))
    await renderPage()

    await vi.waitFor(() => expect(listSources).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="change-node-config"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="change-node-config"]')?.click(),
    )
    await act(async () => elementWithText('button', 'Save')?.click())

    expect(updatePipeline).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-testid="pipeline-workflow-feedback"]')?.textContent,
      ).toContain('Unable to load data sources'),
    )
  })

  it('resizes the node configuration panel with pointer and keyboard input', async () => {
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="pipeline-canvas"]')).not.toBeNull(),
    )
    await act(async () =>
      document.querySelector<HTMLElement>('[data-testid="pipeline-canvas"]')?.click(),
    )

    await vi.waitFor(() => expect(document.querySelector('[role="separator"]')).not.toBeNull())
    await act(async () => {
      await Promise.all(getSourceSchema.mock.results.map(({ value }) => Promise.resolve(value)))
      // Query observer notifications are scheduled after the request promise resolves.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    })
    const resizeHandle = document.querySelector<HTMLElement>('[role="separator"]')
    const canvasRenderCount = document
      .querySelector('[data-testid="pipeline-canvas-render-count"]')
      ?.getAttribute('data-render-count')
    expect(resizeHandle?.getAttribute('aria-valuenow')).toBe('509')

    const createPointerEvent = (type: string, clientX: number) => {
      const event = new Event(type, { bubbles: true })
      Object.defineProperties(event, {
        button: { value: 0 },
        clientX: { value: clientX },
        pointerId: { value: 1 },
        pointerType: { value: 'mouse' },
      })
      return event
    }

    await act(async () => {
      resizeHandle?.dispatchEvent(createPointerEvent('pointerdown', 900))
      resizeHandle?.dispatchEvent(createPointerEvent('pointermove', 800))
      resizeHandle?.dispatchEvent(createPointerEvent('pointerup', 800))
    })
    expect(resizeHandle?.getAttribute('aria-valuenow')).toBe('609')
    expect(
      document
        .querySelector('[data-testid="pipeline-canvas-render-count"]')
        ?.getAttribute('data-render-count'),
    ).toBe(canvasRenderCount)

    await act(async () => {
      resizeHandle?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }))
    })
    expect(resizeHandle?.getAttribute('aria-valuenow')).toBe('400')

    await act(async () => {
      resizeHandle?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }))
    })
    expect(resizeHandle?.getAttribute('aria-valuenow')).toBe('720')
  })

  it('offers a target node sink-capable Sources, while a source node still sees them all', async () => {
    const pipelineWithTarget = {
      id: 'orders_to_warehouse',
      sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
      transforms: [{ id: 'normalize', type: 'map', from: 'orders', expr: 'original-expression' }],
      serve: {
        id: 'orders_api',
        from: 'normalize',
        sync: [{ id: 'orders_out', source: 'mongo_out' }],
      },
      contentHash: 'a'.repeat(64),
      dag: {
        nodes: [
          { id: 'source:mysql:orders', type: 'source', label: 'orders', detail: 'mysql' },
          { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
          { id: 'target:mongo_out:orders', type: 'target', label: 'orders', detail: 'mongo_out' },
        ],
        edges: [
          {
            id: 'source:mysql:orders->transform:normalize',
            source: 'source:mysql:orders',
            target: 'transform:normalize',
            label: null,
          },
          {
            id: 'transform:normalize->target:mongo_out:orders',
            source: 'transform:normalize',
            target: 'target:mongo_out:orders',
            label: null,
          },
        ],
      },
    }
    getPipeline.mockResolvedValue(pipelineWithTarget)
    listSources.mockResolvedValue([
      { id: 'mysql_feynman', connector: 'mysql', tables: [{ name: 'Player', pattern: null }] },
      { id: 'mongo_out', connector: 'mongodb', tables: null },
      { id: 'atlas_out', connector: 'mongodb-atlas', tables: null },
      { id: 'mongo_archive', connector: 'mongodb', tables: null },
    ])
    listConnectors.mockResolvedValue([
      { id: 'mysql', name: 'MySQL', sink: false },
      { id: 'mongodb', name: 'MongoDB', sink: true },
      { id: 'mongodb-atlas', name: 'MongoDB Atlas', sink: true },
    ] as never)

    await renderPage()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="select-target-node"]')).not.toBeNull(),
    )

    const offered = () =>
      [...document.querySelectorAll<HTMLElement>('[data-testid="panel-source-options"] li')].map(
        (option) => option.getAttribute('data-source-option'),
      )

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="select-target-node"]')?.click()
    })
    expect(offered()).toEqual(['mongo_out', 'atlas_out', 'mongo_archive'])

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="select-source-node"]')?.click()
    })
    expect(offered()).toEqual(['mysql_feynman', 'mongo_out', 'atlas_out', 'mongo_archive'])
  })

  it.each(['COMPLETE', 'UNAVAILABLE'])(
    'returns the DAG Run button to idle after closing a refused %s start',
    async (evaluation) => {
      runPipeline.mockRejectedValueOnce(
        startRefusal({
          ...answerable,
          outcome: 'BLOCKED',
          findings: [{ ...answerable.findings[0]!, behavior: 'BLOCK', evaluation, actions: [] }],
        }),
      )
      await renderPage()
      await editAndRun()
      expect(dialogButton('Close')).toBeDefined()
      await act(async () => dialogButton('Close')?.click())
      await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
      await vi.waitFor(() => {
        const run = elementWithText('button', 'Run') as HTMLButtonElement | undefined
        expect(run).toBeDefined()
        expect(run?.disabled).toBe(false)
        expect(run?.getAttribute('aria-busy')).not.toBe('true')
      })
      expect(runPipeline).toHaveBeenCalledOnce()
    },
  )

  it('asks start checks in the shared dialog before a DAG start and keeps its warnings', async () => {
    const warning = answerable.findings.find(({ behavior }) => behavior === 'WARN')!
    runPipeline.mockRejectedValueOnce(startRefusal(answerable)).mockResolvedValueOnce({
      pipelineId: 'orders_to_warehouse',
      startChecks: { ...answerable, outcome: 'READY', findings: [warning] },
      decisionsApplied: [],
      staleDecisions: [],
    })
    await renderPage()
    await editAndRun()

    expect(publishPipelineDraft).toHaveBeenCalledTimes(1)
    expect(runPipeline).toHaveBeenCalledTimes(1)
    expect(startChecksDialog()?.getAttribute('role')).toBe('alertdialog')
    expect(dialogButton('Start')?.disabled).toBe(true)
    await answerStartChecks()

    await vi.waitFor(() => expect(runPipeline).toHaveBeenCalledTimes(2))
    expect(runPipeline).toHaveBeenLastCalledWith('orders_to_warehouse', expect.any(Function), {
      decisions: [
        { finding: leadFinding, action: 'clear' },
        { finding: driftFinding, action: 'accept' },
      ],
      ifMatch: `"${answerable.contentHash}"`,
    })
    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
    await vi.waitFor(() => expect(canvasNotice()?.textContent).toContain(warning.message))
    expect(canvasNotice()?.closest('[data-testid="pipeline-workflow-feedback"]')).toBeNull()

    // Canvas feedback expires after a few seconds; the start notice stays until it is dismissed.
    await settleAfterStart()
    await editNodeConfiguration()
    createPipelineDraft.mockRejectedValueOnce(new Error('Draft store unavailable.'))
    updatePipelineDraft.mockRejectedValueOnce(new Error('Draft store unavailable.'))
    vi.useFakeTimers()
    try {
      await act(async () => elementWithText('button', 'Save')?.click())
      expect(
        document.querySelector('[data-testid="pipeline-workflow-feedback"]')?.textContent,
      ).toContain('Draft store unavailable.')
      for (let step = 0; step < 4; step += 1) {
        await act(async () => {
          vi.advanceTimersByTime(7_500)
        })
      }
      expect(document.querySelector('[data-testid="pipeline-workflow-feedback"]')).toBeNull()
      expect(canvasNotice()?.textContent).toContain(warning.message)
    } finally {
      vi.useRealTimers()
    }

    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Dismiss start notice for orders_to_warehouse"]',
        )
        ?.click(),
    )
    expect(canvasNotice()).toBeNull()
  })

  it('reloads the draft after a start answer rewrote the definition and saves on top of it', async () => {
    listSources.mockResolvedValue([
      { id: 'mysql_feynman', connector: 'mysql', tables: [{ name: 'Player', pattern: null }] },
      { id: 'warehouse', connector: 'mongodb', tables: null },
    ])
    runPipeline.mockRejectedValueOnce(startRefusal(answerable)).mockResolvedValueOnce({
      pipelineId: 'orders_to_warehouse',
      startChecks: { ...answerable, outcome: 'READY', findings: [] },
      decisionsApplied: [definitionChange],
      staleDecisions: [],
    })
    await renderPage()
    await editAndRun()

    getPipelineDraft.mockResolvedValue({ draft: draftAfterStartChange, etag: '"4"' })
    const draftReads = getPipelineDraft.mock.calls.length
    await answerStartChecks()

    await vi.waitFor(() => expect(getPipelineDraft.mock.calls.length).toBeGreaterThan(draftReads))
    await vi.waitFor(() =>
      expect(canvasNotice()?.textContent).toContain('lead: on_full_load append → clear'),
    )

    await settleAfterStart()
    await editNodeConfiguration()
    const updates = updatePipelineDraft.mock.calls.length
    await act(async () => elementWithText('button', 'Save')?.click())

    await vi.waitFor(() => expect(updatePipelineDraft.mock.calls.length).toBeGreaterThan(updates))
    const [, mutation, etag] = updatePipelineDraft.mock.calls.at(-1)!
    expect(etag).toBe('"4"')
    expect(
      mutation.graph.nodes.find((node: { id: string }) => node.id === 'target:warehouse:lead')
        ?.config,
    ).toMatchObject({ onFullLoad: 'clear' })
  })

  it('reloads the draft and keeps the reason when a start that rewrote the definition fails', async () => {
    runPipeline.mockRejectedValueOnce(startRefusal(answerable)).mockRejectedValueOnce(
      Object.assign(new Error('Cannot start a pipeline in state RUNNING.'), {
        status: 409,
        code: 'lifecycle.illegal-transition',
        params: { from: 'RUNNING', verb: 'start' },
        startChecks: null,
        decisionsApplied: [definitionChange],
      }),
    )
    await renderPage()
    await editAndRun()

    getPipelineDraft.mockResolvedValue({ draft: draftAfterStartChange, etag: '"4"' })
    const draftReads = getPipelineDraft.mock.calls.length
    await answerStartChecks()

    await vi.waitFor(() => expect(getPipelineDraft.mock.calls.length).toBeGreaterThan(draftReads))
    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
    await vi.waitFor(() =>
      expect(canvasNotice()?.textContent).toContain('orders_to_warehouse did not start'),
    )
    expect(canvasNotice()?.textContent).toContain('Cannot start a pipeline in state RUNNING.')
    expect(canvasNotice()?.textContent).toContain('lead: on_full_load append → clear')
  })
})
