import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PipelineClientError, type PipelineDraft } from '@/service/pipelines/pipeline-client'

import type { WizardViewState } from '../components/reference-wizard/ReferenceWizardBuilder'

const {
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
} = vi.hoisted(() => ({
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

vi.mock('@/service/source-client', () => ({ getSourceSchema, listConnectors, listSources }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))

vi.mock('../components/reference-wizard/ReferenceWizardBuilder', () => ({
  ReferenceWizardBuilder: ({
    onChange,
    footer,
    actions,
    readOnly,
    livePreview,
    livePreviewStatus,
  }: {
    onChange: (state: WizardViewState) => void
    footer: React.ReactNode
    actions?: React.ReactNode
    readOnly?: boolean
    livePreview: { runId: string } | null
    livePreviewStatus: string
  }) => (
    <section
      className="wizard-reference-editor-column"
      data-read-only={readOnly ? 'true' : 'false'}
      data-live-preview-status={livePreviewStatus}
      data-live-preview-run={livePreview?.runId || ''}
    >
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
      {footer}
      {actions}
    </section>
  ),
}))

import { WizardBuilder } from './wizard-builder'

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
  root = undefined
  container = undefined
})

describe('WizardBuilder publish flow', () => {
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

  it('hides save and start actions while the runtime is active', async () => {
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
          />
        </QueryClientProvider>,
      )
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 650)))

    expect(container?.querySelector('[data-read-only="true"]')).not.toBeNull()
    expect(
      container?.querySelector<HTMLButtonElement>('[data-testid="change-wizard"]')?.disabled,
    ).toBe(true)
    expect(container?.textContent).toContain('Pipeline configuration is read-only')
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
    expect(previewPipelineDraft).not.toHaveBeenCalled()
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

  it('aborts a stale preview when the candidate changes and streams the new saved revision', async () => {
    let firstSignal: AbortSignal | undefined
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
      .mockResolvedValueOnce({
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

    expect(firstSignal?.aborted).toBe(true)
    expect(updatePipelineDraft).toHaveBeenCalledTimes(1)
    expect(previewPipelineDraft).toHaveBeenCalledWith(
      initialDraft.pipelineId,
      2,
      expect.any(Function),
      expect.any(AbortSignal),
    )
    expect(streamPipelinePreview.mock.calls[1]?.[0]).toMatchObject({
      pipelineId: initialDraft.pipelineId,
      drafts: [{ content: 'version: tapstate/v1' }],
      rootLimit: 100,
      signal: expect.any(AbortSignal),
    })
    expect(container?.querySelector('[data-live-preview-status="complete"]')).not.toBeNull()
    expect(container?.querySelector('[data-live-preview-run="preview-run-2"]')).not.toBeNull()
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
})
