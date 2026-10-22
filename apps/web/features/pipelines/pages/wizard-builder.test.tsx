import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PipelineClientError,
  type PipelineDraft,
  type PipelinePreviewRun,
  type StartCheckReport,
} from '@/service/pipelines/pipeline-client'

import type { WizardBuilderProps } from '../components/reference-wizard/ReferenceWizardBuilder'

const {
  getDeploymentProfile,
  getPipelineDraft,
  previewPipelineDraft,
  streamPipelinePreview,
  publishPipelineDraft,
  runPipeline,
  updatePipelineDraft,
  getSourceSchema,
  listConnectors,
  listSources,
  apiFetch,
  wizardRendering,
} = vi.hoisted(() => ({
  wizardRendering: { real: false },
  getDeploymentProfile: vi.fn(),
  getPipelineDraft: vi.fn(),
  previewPipelineDraft: vi.fn(),
  streamPipelinePreview: vi.fn(),
  publishPipelineDraft: vi.fn(),
  runPipeline: vi.fn(),
  updatePipelineDraft: vi.fn(),
  getSourceSchema: vi.fn(),
  listConnectors: vi.fn(),
  listSources: vi.fn(),
  apiFetch: vi.fn() as unknown as typeof fetch,
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  getPipelineDraft,
  previewPipelineDraft,
  streamPipelinePreview,
  publishPipelineDraft,
  runPipeline,
  PipelineClientError: class PipelineClientError extends Error {
    constructor(
      _kind: string,
      message: string,
      readonly status: number | null = null,
      readonly code: string | null = null,
      readonly params: Record<string, unknown> = {},
    ) {
      super(message)
    }
  },
  updatePipelineDraft,
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getSourceSchema,
  listConnectors,
  listSources,
}))

vi.mock('../model/deployment-profile', () => ({ getDeploymentProfile }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))

vi.mock('../components/reference-wizard/ReferenceWizardBuilder', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../components/reference-wizard/ReferenceWizardBuilder')>()
  return {
    ReferenceWizardBuilder: (props: WizardBuilderProps) => {
      if (wizardRendering.real) return <actual.ReferenceWizardBuilder {...props} />
      const {
        initial,
        onChange,
        assistant,
        footer,
        actions,
        notices,
        readOnly,
        destinationName,
        livePreview,
        livePreviewStatus,
        onInspectPlan,
      } = props
      return (
        <section
          className="wizard-reference-editor-column"
          data-read-only={readOnly ? 'true' : 'false'}
          data-destination-name={destinationName}
          data-destination-source={initial.destinationSourceId}
          data-destination-table={initial.destinationTable ?? ''}
          data-root-table={initial.root?.table ?? ''}
          data-live-preview-status={livePreviewStatus}
          data-live-preview-run={livePreview?.runId || ''}
        >
          {notices}
          <button
            data-testid="change-wizard"
            disabled={readOnly}
            onClick={() =>
              onChange({
                root: {
                  source: 'mysql',
                  table: 'AA_0716',
                  primaryKey: 'ID',
                  keys: ['ID'],
                  rowCount: '—',
                  columns: ['ID'],
                },
                relations: [],
                transforms: [
                  {
                    id: 'verify_filter',
                    name: 'Keep rows',
                    type: 'filter',
                    config: { filter: { expr: 'true' } },
                  },
                ],
                destinationSourceId: 'mysql',
                destinationTable: 'codex_wizard_component_test',
                destinationWriteMode: 'append',
              })
            }
          >
            Change wizard
          </button>
          {assistant && (
            <>
              <button
                data-testid="prepare-assistant-request"
                onClick={async (event) => {
                  const button = event.currentTarget
                  button.dataset.revision = String(await assistant.prepareRequest?.())
                }}
              >
                Prepare assistant request
              </button>
              <button
                data-testid="apply-assistant-proposal"
                onClick={() =>
                  assistant.onApply({
                    root: {
                      source: 'mysql',
                      table: 'AA_0716',
                      primaryKey: 'ID',
                      keys: ['ID'],
                      rowCount: '—',
                      columns: ['ID'],
                    },
                    relations: [],
                    transforms: [
                      {
                        id: 'assistant_filter',
                        name: 'Keep rows',
                        type: 'filter',
                        config: { filter: { expr: 'true' } },
                      },
                    ],
                    destinationSourceId: 'mysql',
                    destinationTable: 'assistant_generated',
                    destinationWriteMode: 'append',
                  })
                }
              >
                Apply assistant proposal
              </button>
            </>
          )}
          <button data-testid="inspect-plan" onClick={() => void onInspectPlan?.()}>
            Inspect Plan
          </button>
          {footer}
          {actions}
        </section>
      )
    },
  }
})

import fixture from '../start-checks/__fixtures__/client-fixture-v1.json'
import { WizardBuilder } from './wizard-builder'

const answerable: StartCheckReport = fixture.answerable
const leadFinding = 'target-not-empty/views/lead'
const driftFinding = 'derived-schema-drift/join_orders'

/** The error a start stopped by its start checks rejects with, as the Pipeline client builds it. */
function startRefusal(report: StartCheckReport) {
  return Object.assign(new Error('Starting wizard-ui-test needs an answer.'), {
    status: 409,
    code: 'lifecycle.start-needs-confirmation',
    params: { pipeline: 'wizard-ui-test', count: 2 },
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

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

const initialDraft: PipelineDraft = {
  pipelineId: 'wizard-ui-test',
  schemaVersion: 1,
  revision: 1,
  mode: 'wizard',
  name: 'Wizard UI test',
  description: null,
  graph: null,
  wizard: {
    root: { id: 'root', sourceId: 'mysql', table: 'AA_0716', key: ['ID'], preTransforms: [] },
    related: [],
    transforms: [],
    output: {
      kind: 'source',
      config: { sourceId: 'mysql', table: 'codex_wizard_component_test', writeMode: 'append' },
    },
  },
  baseArtifactHash: null,
  publishedDraftRevision: null,
  publishedArtifactHash: null,
  createdAt: '2026-09-27T00:00:00Z',
  updatedAt: '2026-09-27T00:00:00Z',
  updatedBy: 'admin',
}

beforeEach(() => {
  wizardRendering.real = false
  getDeploymentProfile.mockReturnValue('on-prem')
  vi.clearAllMocks()
  listSources.mockResolvedValue([{ id: 'mysql', connector: 'mysql' }])
  listConnectors.mockResolvedValue([
    {
      id: 'mysql',
      name: 'MySQL',
      icon: null,
      sink: true,
      writeModes: ['append', 'upsert'],
    },
  ])
  getSourceSchema.mockResolvedValue({
    tables: [{ name: 'AA_0716', primaryKey: ['ID'], fields: [{ name: 'ID' }] }],
  })
  updatePipelineDraft.mockImplementation(async (_id, mutation) => ({
    draft: { ...initialDraft, ...mutation, revision: 2 },
    etag: '"2"',
  }))
  previewPipelineDraft.mockResolvedValue({
    pipelineId: initialDraft.pipelineId,
    revision: 2,
    dsl: 'version: tapstate/v1',
    artifact: { transforms: [{ id: 'verify_filter', type: 'filter', expr: 'true' }] },
  })
  publishPipelineDraft.mockResolvedValue({
    pipelineId: initialDraft.pipelineId,
    revision: 2,
    artifactHash: 'a'.repeat(64),
    published: true,
  })
  getPipelineDraft.mockResolvedValue({
    draft: {
      ...initialDraft,
      revision: 2,
      publishedDraftRevision: 2,
      publishedArtifactHash: 'a'.repeat(64),
    },
    etag: '"2"',
  })
  runPipeline.mockResolvedValue({ targetState: 'RUNNING' })
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  vi.unstubAllEnvs()
  root = undefined
  container = undefined
})

describe('WizardBuilder publish flow', () => {
  it('flushes the latest editor draft and returns the saved revision before an assistant request', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-testid="change-wizard"]')).not.toBeNull(),
    )

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.click()
    })
    const prepareButton = container?.querySelector<HTMLButtonElement>(
      '[data-testid="prepare-assistant-request"]',
    )
    await act(async () => prepareButton?.click())

    await vi.waitFor(() => expect(updatePipelineDraft).toHaveBeenCalledOnce())
    expect(updatePipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      expect.objectContaining({
        wizard: expect.objectContaining({
          transforms: [expect.objectContaining({ id: 'verify_filter' })],
        }),
      }),
      '"1"',
      expect.any(Function),
    )
    expect(prepareButton?.dataset.revision).toBe('2')
  })

  it('does not run an automatic preview when an assistant proposal is applied', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('.wizard-reference-editor-column')).not.toBeNull(),
    )
    await act(async () => new Promise((resolve) => setTimeout(resolve, 350)))
    const previewCallsBeforeApply = streamPipelinePreview.mock.calls.length
    const compileCallsBeforeApply = previewPipelineDraft.mock.calls.length
    expect(container?.querySelector('[data-testid="apply-assistant-proposal"]')).not.toBeNull()

    await act(async () => {
      container
        ?.querySelector<HTMLButtonElement>('[data-testid="apply-assistant-proposal"]')
        ?.click()
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)))

    expect(
      container
        ?.querySelector('.wizard-reference-editor-column')
        ?.getAttribute('data-destination-table'),
    ).toBe('assistant_generated')
    expect(previewPipelineDraft).toHaveBeenCalledTimes(compileCallsBeforeApply)
    expect(streamPipelinePreview).toHaveBeenCalledTimes(previewCallsBeforeApply)
  })

  it('offers the marked Atlas destination through the real picker without treating it as an input', async () => {
    wizardRendering.real = true
    getDeploymentProfile.mockReturnValue('cloud')
    vi.stubEnv('VITE_LOCAL_DEVELOPMENT', 'true')
    listSources.mockResolvedValue([
      { id: 'mysql', connector: 'mysql' },
      { id: 'mongo_out', connector: 'mongodb' },
      { id: 'atlas_out', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
    ])
    listConnectors.mockResolvedValue([
      { id: 'mysql', name: 'MySQL', sink: false },
      { id: 'mongodb', name: 'MongoDB', sink: true, writeModes: ['upsert'] },
      { id: 'mongodb-atlas', name: 'MongoDB Atlas', sink: true, writeModes: ['upsert'] },
    ])
    const draft = {
      ...initialDraft,
      wizard: {
        ...initialDraft.wizard!,
        output: {
          kind: 'atlas',
          config: { sourceId: 'atlas_out', table: 'orders', writeMode: 'upsert' },
        },
      },
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () =>
      root?.render(
        <QueryClientProvider client={client}>
          <WizardBuilder pipelineId={draft.pipelineId} draft={draft} etag='"1"' />
        </QueryClientProvider>,
      ),
    )
    await vi.waitFor(() =>
      expect(
        container?.querySelector('[aria-labelledby="wizard-destination-source-label"]'),
      ).not.toBeNull(),
    )
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-labelledby="wizard-destination-source-label"]',
    )
    await act(async () => trigger?.click())
    await vi.waitFor(() => expect(document.body.querySelector('[role="listbox"]')).not.toBeNull())
    const options = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (item) => item.textContent,
    )
    expect(options.some((text) => text?.includes('atlas_out'))).toBe(true)
    expect(options.some((text) => text?.includes('mongo_out'))).toBe(false)
    expect(getSourceSchema).not.toHaveBeenCalledWith('atlas_out', expect.anything())
  })

  it('keeps Cloud wizard output aligned with its Atlas picker in a local build', async () => {
    vi.stubEnv('VITE_LOCAL_DEVELOPMENT', 'true')
    let resolveSchemas!: (value: { tables: [] }) => void
    getSourceSchema.mockReturnValue(
      new Promise((resolve) => {
        resolveSchemas = resolve
      }),
    )
    getDeploymentProfile.mockReturnValue('cloud')
    listSources.mockResolvedValue([
      { id: 'mongo_out', connector: 'mongodb' },
      { id: 'atlas_out', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'mysql', connector: 'mysql' },
    ])
    listConnectors.mockResolvedValue([
      { id: 'mongodb', name: 'MongoDB', sink: true, writeModes: ['upsert'] },
      { id: 'mongodb-atlas', name: 'MongoDB Atlas', sink: true, writeModes: ['upsert'] },
      { id: 'mysql', name: 'MySQL', sink: false },
    ])
    const cloudDraft = {
      ...initialDraft,
      wizard: {
        ...initialDraft.wizard!,
        output: {
          kind: 'atlas',
          config: { sourceId: 'missing', table: 'orders', writeMode: 'upsert' },
        },
      },
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={cloudDraft.pipelineId} draft={cloudDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(queryClient.getQueryState(['wizard', 'sources'])?.status).toBe('success')
        expect(queryClient.getQueryState(['wizard', 'connectors'])?.status).toBe('success')
      })
    })
    expect(container?.textContent).toContain('Loading sources')
    await act(async () => resolveSchemas({ tables: [] }))
    await vi.waitFor(() => {
      expect(
        container?.querySelector('[data-destination-name]')?.getAttribute('data-destination-name'),
      ).toBe('MongoDB Atlas (atlas_out)')
      expect(container?.querySelector('[data-destination-source="atlas_out"]')).not.toBeNull()
    })
  })

  it('compiles an unfinished destination only for inspection without saving the temporary name', async () => {
    const draft: PipelineDraft = {
      ...initialDraft,
      wizard: {
        ...initialDraft.wizard!,
        output: { kind: 'source', config: { sourceId: 'mysql', table: '', writeMode: 'append' } },
      },
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={draft.pipelineId} draft={draft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))
    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="inspect-plan"]')?.click()
    })
    expect(previewPipelineDraft).toHaveBeenCalledWith(
      draft.pipelineId,
      draft.revision,
      expect.any(Function),
      undefined,
      expect.objectContaining({
        wizard: expect.objectContaining({
          output: expect.objectContaining({
            config: expect.objectContaining({ table: '__tapstate_preview__' }),
          }),
        }),
      }),
    )
    expect(updatePipelineDraft).not.toHaveBeenCalled()
  })

  it('keeps an ordinary empty Wizard editable and free of sample guidance', async () => {
    const ordinaryDraft: PipelineDraft = {
      ...initialDraft,
      pipelineId: 'customer_360_3a1973ba',
      wizard: {
        root: { id: 'root', sourceId: '', table: '', key: [], preTransforms: [] },
        related: [],
        transforms: [],
        output: { kind: 'atlas', config: {} },
      },
    }
    listSources.mockResolvedValue([
      { id: 'atlas-store', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'sample_core_banking', connector: 'mysql', metadata: { labels: { sample: 'true' } } },
    ])
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={ordinaryDraft.pipelineId} draft={ordinaryDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('.wizard-reference-editor-column')).not.toBeNull(),
    )
    expect(
      container?.querySelector('.wizard-reference-editor-column')?.getAttribute('data-read-only'),
    ).toBe('false')
    expect(container?.textContent).not.toContain('Nest orders')
    expect(container?.textContent).not.toContain('This Order 360 demo is preconfigured')
    expect(
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.disabled,
    ).toBe(false)
  })

  it('automatically fills and locks the guided Order 360 sample draft', async () => {
    const guidedDraft: PipelineDraft = {
      ...initialDraft,
      pipelineId: 'order_360_3a1973ba',
      wizard: {
        root: { id: 'root', sourceId: '', table: '', key: [], preTransforms: [] },
        related: [],
        transforms: [],
        output: { kind: 'atlas', config: { onboardingGuide: 'order-360-sample' } },
      },
    }
    listSources.mockResolvedValue([
      { id: 'atlas-store', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'sample_core_banking', connector: 'mysql', metadata: { labels: { sample: 'true' } } },
    ])
    listConnectors.mockResolvedValue([
      { id: 'mongodb-atlas', name: 'MongoDB Atlas', sink: true, writeModes: ['upsert'] },
      { id: 'mysql', name: 'MySQL', sink: false, writeModes: [] },
    ])
    getSourceSchema.mockResolvedValue({
      tables: [
        {
          name: 'bmsql_customer',
          primaryKey: ['c_w_id', 'c_d_id', 'c_id'],
          fields: ['c_w_id', 'c_d_id', 'c_id'].map((name) => ({ name })),
        },
        {
          name: 'bmsql_oorder',
          primaryKey: ['o_w_id', 'o_d_id', 'o_id'],
          fields: ['o_w_id', 'o_d_id', 'o_id', 'o_c_id'].map((name) => ({ name })),
        },
        {
          name: 'bmsql_order_line',
          primaryKey: ['ol_w_id', 'ol_d_id', 'ol_o_id'],
          fields: ['ol_w_id', 'ol_d_id', 'ol_o_id', 'ol_amount'].map((name) => ({ name })),
        },
      ],
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={guidedDraft.pipelineId} draft={guidedDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('.wizard-reference-editor-column')).not.toBeNull(),
    )

    expect(
      container?.querySelector('.wizard-reference-editor-column')?.getAttribute('data-root-table'),
    ).toBe('bmsql_oorder')
    expect(
      container?.querySelector('.wizard-reference-editor-column')?.getAttribute('data-read-only'),
    ).toBe('true')
    expect(container?.textContent).not.toContain('Use detected sample')
    expect(container?.textContent).toContain('Nest customer and lines')
    expect(container?.textContent).toContain('This Order 360 demo is preconfigured')
    await vi.waitFor(
      () =>
        expect(updatePipelineDraft).toHaveBeenCalledWith(
          guidedDraft.pipelineId,
          expect.objectContaining({
            wizard: expect.objectContaining({
              root: expect.objectContaining({ table: 'bmsql_oorder' }),
              related: expect.arrayContaining([
                expect.objectContaining({ table: 'bmsql_customer' }),
                expect.objectContaining({ table: 'bmsql_order_line' }),
              ]),
            }),
          }),
          '"1"',
          expect.any(Function),
        ),
      { timeout: 1500 },
    )
  })

  it('shows runtime lookup progress and failure in the dock while keeping the Wizard mounted', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const publishedDraft = { ...initialDraft, publishedDraftRevision: 1 }
    const onRetryRuntimeObservation = vi.fn()

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder
            pipelineId={publishedDraft.pipelineId}
            draft={publishedDraft}
            etag='"1"'
            readOnly
            runtimeObservationPending
            onRetryRuntimeObservation={onRetryRuntimeObservation}
          />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-workflow-header]')).not.toBeNull(),
    )
    expect(container?.querySelector('[data-read-only="true"]')).not.toBeNull()
    expect(container?.querySelector('[data-workflow-header]')?.textContent).toContain(
      'Checking runtime status',
    )

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder
            pipelineId={publishedDraft.pipelineId}
            draft={publishedDraft}
            etag='"1"'
            readOnly
            runtimeObservationError
            onRetryRuntimeObservation={onRetryRuntimeObservation}
          />
        </QueryClientProvider>,
      )
    })
    expect(container?.querySelector('[data-workflow-header]')?.textContent).toContain(
      'Could not confirm runtime status',
    )
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.includes('Retry'))
        ?.click()
    })
    expect(onRetryRuntimeObservation).toHaveBeenCalledTimes(1)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder
            pipelineId={publishedDraft.pipelineId}
            draft={publishedDraft}
            etag='"1"'
            readOnly
            runtimeStatus="RUNNING"
          />
        </QueryClientProvider>,
      )
    })
    expect(container?.querySelector('[data-workflow-header]')?.textContent).toContain('Running')
    expect(container?.querySelector('[data-workflow-header]')?.textContent).not.toContain('Retry')
  })

  it('previews a read-only running Pipeline without exposing edit or start actions', async () => {
    streamPipelinePreview.mockResolvedValue({
      runId: 'running-preview',
      candidateHash: 'running-candidate',
      format: 'logical-json',
      executionSpec: {},
      contexts: [],
      sample: { rootRows: 1, inputRows: 1 },
      documents: [{ id: 'order-1' }],
      trace: [],
      sampleId: 'running-sample',
      rowCount: 1,
      failure: null,
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder
            pipelineId={initialDraft.pipelineId}
            draft={initialDraft}
            etag='"1"'
            readOnly
            runtimeStatus="RUNNING"
          />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 650)))

    expect(container?.querySelector('[data-read-only="true"]')).not.toBeNull()
    expect(
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.disabled,
    ).toBe(true)
    expect(container?.textContent).toContain('Running')
    const actionButtons = container?.querySelectorAll<HTMLButtonElement>(
      '[data-workflow-header] button',
    )
    expect(container?.querySelector('[data-workflow-header]')?.getAttribute('data-placement')).toBe(
      'sticky',
    )
    expect(
      container?.querySelector('.wizard-reference-editor-column [data-workflow-header]'),
    ).not.toBe(null)
    expect(actionButtons).toHaveLength(0)
    expect(container?.textContent).not.toContain('Save')
    expect(container?.textContent).not.toContain('Save & start')
    expect(updatePipelineDraft).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-live-preview-run="running-preview"]')).not.toBeNull(),
    )
    expect(previewPipelineDraft).toHaveBeenCalledTimes(1)
    expect(streamPipelinePreview).toHaveBeenCalledTimes(1)
    expect(publishPipelineDraft).not.toHaveBeenCalled()
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('previews a read-only draft while runtime status is being checked', async () => {
    streamPipelinePreview.mockResolvedValue({
      runId: 'status-pending-preview',
      candidateHash: 'status-pending-candidate',
      format: 'logical-json',
      executionSpec: {},
      contexts: [],
      sample: { rootRows: 1, inputRows: 1 },
      documents: [{ id: 'order-1' }],
      trace: [],
      sampleId: 'status-pending-sample',
      rowCount: 1,
      failure: null,
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder
            pipelineId={initialDraft.pipelineId}
            draft={initialDraft}
            etag='"1"'
            readOnly
            runtimeObservationPending
          />
        </QueryClientProvider>,
      )
    })

    await vi.waitFor(() => expect(previewPipelineDraft).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(streamPipelinePreview).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => {
      expect(
        container?.querySelector('[data-live-preview-run="status-pending-preview"]'),
      ).not.toBeNull()
      expect(container?.querySelector('[data-live-preview-status="complete"]')).not.toBeNull()
    })
    expect(previewPipelineDraft).toHaveBeenCalledTimes(1)
    expect(streamPipelinePreview).toHaveBeenCalledTimes(1)
    expect(updatePipelineDraft).not.toHaveBeenCalled()
    expect(publishPipelineDraft).not.toHaveBeenCalled()
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('saves a Wizard draft without previewing, publishing, or starting it', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.click()
    })
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.trim() === 'Save')
        ?.click()
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(updatePipelineDraft).toHaveBeenCalledTimes(1))

    expect(previewPipelineDraft).not.toHaveBeenCalled()
    expect(publishPipelineDraft).not.toHaveBeenCalled()
    expect(runPipeline).not.toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['pipelines', 'drafts'] })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['pipelines', initialDraft.pipelineId, 'status'],
    })
  })

  it('aborts a stale preview when the unsaved candidate changes', async () => {
    let firstSignal: AbortSignal | undefined
    let finishSecondPreview!: (value: PipelinePreviewRun) => void
    const secondPreview = new Promise<PipelinePreviewRun>((resolve) => {
      finishSecondPreview = resolve
    })
    streamPipelinePreview
      .mockImplementationOnce(
        (request: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            firstSignal = request.signal
            request.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            })
          }),
      )
      .mockReturnValueOnce(secondPreview)

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })

    await vi.waitFor(() => expect(streamPipelinePreview).toHaveBeenCalledTimes(1))
    expect(firstSignal?.aborted).toBe(false)

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.click()
    })
    await vi.waitFor(() => expect(streamPipelinePreview).toHaveBeenCalledTimes(2))
    await act(async () => {
      finishSecondPreview({
        runId: 'preview-run-2',
        candidateHash: 'candidate-2',
        format: 'logical-json',
        executionSpec: {},
        contexts: [],
        sample: { rootRows: 1, inputRows: 1 },
        documents: [{ id: 'customer-1' }],
        trace: [],
        sampleId: 'sample-2',
        rowCount: 1,
        failure: null,
      })
      await secondPreview
    })

    expect(firstSignal?.aborted).toBe(true)
    expect(previewPipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      expect.any(Number),
      expect.any(Function),
      expect.any(AbortSignal),
      expect.objectContaining({ mode: 'wizard', wizard: expect.any(Object) }),
    )
    expect(streamPipelinePreview.mock.calls[1]?.[0]).toMatchObject({
      pipelineId: initialDraft.pipelineId,
      drafts: [{ content: 'version: tapstate/v1' }],
      rootLimit: 1,
      signal: expect.any(AbortSignal),
    })
    expect(container?.querySelector('[data-live-preview-status="complete"]')).not.toBeNull()
    expect(container?.querySelector('[data-live-preview-run="preview-run-2"]')).not.toBeNull()
  })

  it('keeps a completed preview stable across status-driven rerenders', async () => {
    streamPipelinePreview.mockResolvedValue({
      runId: 'preview-run-stable',
      candidateHash: 'candidate-stable',
      format: 'logical-json',
      executionSpec: {},
      contexts: [],
      sample: { rootRows: 1, inputRows: 1 },
      documents: [{ id: 'customer-1' }],
      trace: [],
      sampleId: 'sample-stable',
      rowCount: 1,
      failure: null,
    })

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })

    await vi.waitFor(() =>
      expect(container?.querySelector('[data-live-preview-status="complete"]')).not.toBeNull(),
    )
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 400))
    })

    expect(streamPipelinePreview).toHaveBeenCalledTimes(1)
    expect(container?.querySelector('[data-live-preview-run="preview-run-stable"]')).not.toBeNull()
  })

  it('autosaves a transform draft, previews, publishes, then starts it', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50))
    })
    expect(container?.querySelector('[data-testid="change-wizard"]')).not.toBeNull()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.click()
    })
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 650))
    })

    expect(updatePipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      expect.objectContaining({
        mode: 'wizard',
        wizard: expect.objectContaining({
          transforms: [{ id: 'verify_filter', type: 'filter', fields: { expr: 'true' } }],
          output: expect.objectContaining({
            kind: 'source',
            config: expect.objectContaining({
              sourceId: 'mysql',
              table: 'codex_wizard_component_test',
              inputTable: 'AA_0716',
              writeMode: 'append',
            }),
          }),
        }),
      }),
      '"1"',
      expect.any(Function),
    )

    const startButton = Array.from(
      container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
    ).find((button) => button.textContent?.includes('Save & start'))
    await act(async () => startButton?.click())
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))

    expect(previewPipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      2,
      expect.any(Function),
    )
    expect(publishPipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      2,
      null,
      expect.any(Function),
    )
    expect(runPipeline).toHaveBeenCalledWith(initialDraft.pipelineId, expect.any(Function))
    expect(
      queryClient.getQueryData<{ draft: PipelineDraft }>([
        'pipelines',
        initialDraft.pipelineId,
        'draft-status',
      ])?.draft.publishedDraftRevision,
    ).toBe(2)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['pipelines', initialDraft.pipelineId, 'status'],
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['pipelines', initialDraft.pipelineId],
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['pipelines'] })
  })

  it('keeps a keyless upsert draft saved and explains how to make it publishable', async () => {
    const keylessDraft: PipelineDraft = {
      ...initialDraft,
      wizard: {
        ...initialDraft.wizard!,
        root: { id: 'root', sourceId: 'mysql', table: 'BB_0727', key: [], preTransforms: [] },
        output: {
          kind: 'source',
          config: { sourceId: 'mysql', table: 'k2', writeMode: 'upsert' },
        },
      },
    }
    getSourceSchema.mockResolvedValue({
      tables: [{ name: 'BB_0727', primaryKey: [], fields: [{ name: 'payload' }] }],
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={keylessDraft.pipelineId} draft={keylessDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.includes('Save & start'))
        ?.click()
      await Promise.resolve()
    })

    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('mysql.BB_0727')
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('Append')
    expect(previewPipelineDraft).not.toHaveBeenCalled()
    expect(publishPipelineDraft).not.toHaveBeenCalled()
    expect(runPipeline).not.toHaveBeenCalled()
  })

  it('keeps the Wizard and failure reason visible when starting fails', async () => {
    runPipeline.mockRejectedValueOnce(new Error('Runtime is unavailable'))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-workflow-header]')).not.toBeNull(),
    )
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.includes('Save & start'))
        ?.click()
    })
    await vi.waitFor(() =>
      expect(container?.querySelector('[role="alert"]')?.textContent).toContain(
        'Runtime is unavailable',
      ),
    )
    expect(container?.querySelector('.wizard-reference-editor-column')).not.toBeNull()
    expect(container?.querySelector('[data-workflow-header]')?.textContent).toContain(
      'Runtime is unavailable',
    )
  })

  it('shows startup feedback and treats a concurrent start as success when already RUNNING', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let rejectRun: ((reason: unknown) => void) | undefined
    runPipeline.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRun = reject
        }),
    )

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.includes('Save & start'))
        ?.click()
      await Promise.resolve()
    })

    expect(container?.textContent).toContain('Starting pipeline…')
    expect(container?.querySelector<HTMLButtonElement>('button[aria-busy="true"]')?.disabled).toBe(
      true,
    )
    await act(async () => {
      rejectRun?.(
        new PipelineClientError(
          'server',
          'Cannot start a pipeline in state RUNNING.',
          409,
          'lifecycle.illegal-transition',
          { from: 'RUNNING', verb: 'start' },
        ),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(container?.querySelector('[role="alert"]')).toBeNull()
    expect(container?.textContent).toContain(
      'The draft is saved and published, but this Pipeline is already running.',
    )
  })

  it('asks start checks in the shared dialog and saves on the draft the answer rewrote', async () => {
    const warning = answerable.findings.find(({ behavior }) => behavior === 'WARN')!
    const publishedDraft = {
      ...initialDraft,
      revision: 2,
      publishedDraftRevision: 2,
      publishedArtifactHash: 'a'.repeat(64),
    }
    const rewrittenDraft: PipelineDraft = {
      ...publishedDraft,
      revision: 3,
      publishedDraftRevision: 3,
      publishedArtifactHash: 'e'.repeat(64),
      wizard: {
        ...initialDraft.wizard,
        output: {
          kind: 'source',
          config: {
            sourceId: 'mysql',
            table: 'codex_wizard_component_test',
            writeMode: 'append',
            onFullLoad: 'clear',
          },
        },
      },
    }
    getPipelineDraft
      .mockResolvedValueOnce({ draft: publishedDraft, etag: '"2"' })
      .mockResolvedValueOnce({ draft: rewrittenDraft, etag: '"3"' })
    runPipeline.mockRejectedValueOnce(startRefusal(answerable)).mockResolvedValueOnce({
      pipelineId: initialDraft.pipelineId,
      startChecks: { ...answerable, outcome: 'READY', findings: [warning] },
      decisionsApplied: [
        {
          finding: leadFinding,
          action: 'clear',
          kind: 'CHANGE_DEFINITION',
          changes: [{ element: 'lead', field: 'on_full_load', from: 'append', to: 'clear' }],
          contentHash: 'e'.repeat(64),
        },
      ],
      staleDecisions: [],
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <WizardBuilder pipelineId={initialDraft.pipelineId} draft={initialDraft} etag='"1"' />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 50)))
    await act(async () => {
      Array.from(
        container?.querySelectorAll<HTMLButtonElement>('[data-workflow-header] button') || [],
      )
        .find((button) => button.textContent?.includes('Save & start'))
        ?.click()
    })

    await vi.waitFor(() => expect(startChecksDialog()).not.toBeNull())
    expect(startChecksDialog()?.getAttribute('role')).toBe('alertdialog')
    expect(publishPipelineDraft).toHaveBeenCalledTimes(1)
    expect(runPipeline).toHaveBeenCalledTimes(1)
    expect(container?.querySelector('[data-read-only="true"]')).not.toBeNull()
    expect(dialogButton('Start')?.disabled).toBe(true)
    await act(async () => answerRadio(leadFinding, 'clear')?.click())
    await act(async () => answerRadio(driftFinding, 'accept')?.click())
    await act(async () => dialogButton('Start')?.click())

    await vi.waitFor(() => expect(runPipeline).toHaveBeenCalledTimes(2))
    expect(runPipeline).toHaveBeenLastCalledWith(initialDraft.pipelineId, expect.any(Function), {
      decisions: [
        { finding: leadFinding, action: 'clear' },
        { finding: driftFinding, action: 'accept' },
      ],
      ifMatch: `"${answerable.contentHash}"`,
    })
    await vi.waitFor(() => expect(getPipelineDraft).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(startChecksDialog()).toBeNull())
    const notice = container?.querySelector('[data-testid="pipeline-start-notice"]')
    expect(notice?.textContent).toContain(warning.message)
    expect(notice?.textContent).toContain('lead: on_full_load append → clear')
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-read-only="false"]')).not.toBeNull(),
    )

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.click()
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 650)))
    expect(updatePipelineDraft).toHaveBeenLastCalledWith(
      initialDraft.pipelineId,
      expect.objectContaining({
        wizard: expect.objectContaining({
          output: expect.objectContaining({
            config: expect.objectContaining({ onFullLoad: 'clear' }),
          }),
        }),
      }),
      '"3"',
      expect.any(Function),
    )
    expect(container?.querySelector('[data-testid="pipeline-start-notice"]')).not.toBeNull()
  })
})
