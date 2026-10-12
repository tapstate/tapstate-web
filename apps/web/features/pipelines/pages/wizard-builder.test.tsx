import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PipelineClientError, type PipelineDraft } from '@/service/pipelines/pipeline-client'

import type {
  DataSourceMeta,
  WizardViewState,
} from '../components/reference-wizard/ReferenceWizardBuilder'

const {
  getDeploymentProfile,
  getPipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  updatePipelineDraft,
  getSourceSchema,
  listConnectors,
  listSources,
} = vi.hoisted(() => ({
  getDeploymentProfile: vi.fn(),
  getPipelineDraft: vi.fn(),
  previewPipelineDraft: vi.fn(),
  publishPipelineDraft: vi.fn(),
  runPipeline: vi.fn(),
  updatePipelineDraft: vi.fn(),
  getSourceSchema: vi.fn(),
  listConnectors: vi.fn(),
  listSources: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  getPipelineDraft,
  previewPipelineDraft,
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

vi.mock('../model/deployment-profile', () => ({ getDeploymentProfile }))

vi.mock('../model/pipeline-target-connectors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../model/pipeline-target-connectors')>()
  return {
    ...actual,
    // Exercise the compiled local-build default while retaining the actual target policy.
    targetSources: (...args: Parameters<typeof actual.targetSources>) =>
      actual.targetSources(args[0], args[1], args[2], args[3] ?? true),
  }
})

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) =>
    selector({ apiFetch: vi.fn() as unknown as typeof fetch }),
}))

vi.mock('../components/reference-wizard/ReferenceWizardBuilder', () => ({
  ReferenceWizardBuilder: ({
    onChange,
    footer,
    actions,
    readOnly,
    initial,
    catalog,
    destinationName,
  }: {
    initial?: WizardViewState
    catalog?: DataSourceMeta[]
    destinationName?: string
    onChange: (state: WizardViewState) => void
    footer: React.ReactNode
    actions?: React.ReactNode
    readOnly?: boolean
  }) => (
    <section
      className="wizard-reference-editor-column"
      data-read-only={readOnly ? 'true' : 'false'}
      data-destination-name={destinationName}
      data-destination-source={initial?.destinationSourceId}
      data-mongo-sink={
        catalog?.find((source) => source.id === 'mongo_out')?.sink === true ? 'true' : 'false'
      }
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
  getDeploymentProfile.mockReturnValue('on-prem')
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
  it('keeps Cloud wizard output aligned with its Atlas picker in a local build', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    listSources.mockResolvedValue([
      { id: 'mongo_out', connector: 'mongodb' },
      { id: 'atlas_out', connector: 'mongodb-atlas' },
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
    expect(container?.querySelector('[data-mongo-sink="true"]')).not.toBeNull()
    expect(
      container?.querySelector('[data-destination-name]')?.getAttribute('data-destination-name'),
    ).toBe('MongoDB Atlas (atlas_out)')
    await vi.waitFor(() =>
      expect(container?.querySelector('[data-destination-source="atlas_out"]')).not.toBeNull(),
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
