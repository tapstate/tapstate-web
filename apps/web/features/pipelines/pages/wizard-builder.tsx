import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getPipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  updatePipelineDraft,
  PipelineClientError,
  type PipelineDraft,
  type PipelineDraftMutation,
  type PipelineDraftPreview,
  type PipelineRuntimeState,
} from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { isDataSource } from '@/service/state-store-source'
import { useAuthStore } from '@/stores/auth-store'

import type {
  PipelineDraftBasicInfo,
  SavePipelineDraftBasicInfo,
} from '../model/pipeline-draft-document'

import {
  CUSTOMER_360_GUIDE_STEPS,
  PipelineBuilderGuide,
  type Customer360GuideMode,
} from '../components/pipeline-builder-guide'
import {
  ReferenceWizardBuilder,
  type DataSourceMeta,
  type WizardViewState,
} from '../components/reference-wizard/ReferenceWizardBuilder'
import {
  readWizard,
  writeWizard,
  wizardPublicationIssue,
  wizardUpsertKeylessInput,
} from '../components/reference-wizard/wizard-adapter'
import {
  createCustomer360Wizard,
  createCustomerLifetimeValueTransform,
  findCustomer360Preset,
} from '../model/customer-360-guide'
import { getDeploymentProfile } from '../model/deployment-profile'
import { targetSources } from '../model/pipeline-target-connectors'
import { sourceScopedTableNames } from '../model/source-table-scope'
import { PipelineWorkflowHeader } from '../workflow-app/components/pipeline-workflow-header'

export function WizardBuilder({
  pipelineId,
  draft,
  etag,
  readOnly = false,
  runtimeStatus,
  runtimeObservationPending = false,
  runtimeObservationError = false,
  onRetryRuntimeObservation,
  onRegisterBasicInfoSaver,
  stopAction,
}: {
  pipelineId: string
  draft: PipelineDraft
  etag: string
  readOnly?: boolean
  runtimeStatus?: PipelineRuntimeState
  runtimeObservationPending?: boolean
  runtimeObservationError?: boolean
  onRetryRuntimeObservation?: () => void
  onRegisterBasicInfoSaver?: (save: SavePipelineDraftBasicInfo | null) => void
  stopAction?: ReactNode
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const queryClient = useQueryClient()
  const sourcesQuery = useQuery({
    queryKey: ['wizard', 'sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectorsQuery = useQuery({
    queryKey: ['wizard', 'connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const connectors = connectorsQuery.data || []
  const sources = sourcesQuery.data || []
  const inputSources = useMemo(() => sources.filter(isDataSource), [sources])
  const deploymentProfile = getDeploymentProfile()
  const schemas = useQueries({
    queries: inputSources.map((s) => ({
      queryKey: ['wizard', 'source-schema', s.id],
      queryFn: () => getSourceSchema(s.id, apiFetch),
      retry: false,
    })),
  })
  const catalog = useMemo<DataSourceMeta[]>(
    () =>
      inputSources.map((s, i) => {
        const details = schemas[i]?.data?.tables || []
        const names = sourceScopedTableNames(
          s,
          details.map((table) => table.name),
        )
        const connector = connectors.find((c) => c.id === s.connector)
        return {
          id: s.id,
          name: s.id,
          badge: connector?.name || s.connector,
          connector: s.connector,
          connectorName: connector?.name || s.connector,
          iconPath: connector?.icon || null,
          sink: connector?.sink || false,
          writeModes: connector?.writeModes || [],
          tables: names.map((name) => {
            const detail = details.find((t) => t.name === name)
            return {
              name,
              primaryKey: detail?.primaryKey?.[0] || '',
              keys: detail?.primaryKey || [],
              discovered: Boolean(detail),
              rowCount: '—',
              columns: (detail?.fields || []).map((f) => f.name),
            }
          }),
        }
      }),
    [connectors, inputSources, schemas],
  )
  const customer360Preset = useMemo(() => findCustomer360Preset(catalog), [catalog])
  const [wizard, setWizard] = useState(draft.wizard)
  const [builderRevision, setBuilderRevision] = useState(0)
  const [guideOpen, setGuideOpen] = useState(() => !readOnly && isEmptyWizard(draft.wizard))
  const [guideStep, setGuideStep] = useState(0)
  const [guideMode, setGuideMode] = useState<Customer360GuideMode>('storyboard')
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<'save' | 'start' | null>(null)
  const [startPhase, setStartPhase] = useState<
    'saving' | 'validating' | 'publishing' | 'starting' | 'checking' | null
  >(null)
  const [preview, setPreview] = useState<PipelineDraftPreview | null>(null)
  const editorReadOnly = readOnly || (busy && action === 'start')
  const currentDraft = useRef(draft)
  const currentEtag = useRef(etag)
  const pending = useRef<Promise<void> | null>(null)
  const savedFingerprint = useRef(JSON.stringify(draft.wizard))
  const currentWizard = useRef(wizard)
  currentWizard.current = wizard
  const emptyWizardDraft = isEmptyWizard(wizard)
  const presetApplied = hasCustomer360Preset(wizard, customer360Preset)
  const formulaAdded = hasCustomerLifetimeValue(wizard)
  const outputConfig = draft.wizard?.output as
    | { kind?: string; config?: { sourceId?: string; writeMode?: string } }
    | undefined
  const availableDestinationSources = targetSources(sources, connectors, deploymentProfile)
  const destination =
    availableDestinationSources.find((source) => source.id === outputConfig?.config?.sourceId) ||
    availableDestinationSources[0]
  const destinationConnector = connectors.find(
    (connector) => connector.id === destination?.connector,
  )
  useEffect(() => {
    if (!guideOpen || readOnly) return
    const targetId = CUSTOMER_360_GUIDE_STEPS[guideStep]?.targetId
    if (!targetId) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      if (!target) return
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
      target.scrollIntoView({ behavior, block: 'center', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [builderRevision, guideMode, guideOpen, guideStep, readOnly])

  function applyCustomer360Preset() {
    if (!customer360Preset || !emptyWizardDraft) return
    setWizard(
      createCustomer360Wizard(
        customer360Preset,
        destination?.id ?? '',
        destinationConnector?.writeModes?.[0] ?? 'upsert',
        deploymentProfile,
      ),
    )
    setBuilderRevision((revision) => revision + 1)
    setGuideStep(0)
  }

  function addCustomerLifetimeValue() {
    if (!customer360Preset || formulaAdded) return
    const transform = createCustomerLifetimeValueTransform(customer360Preset)
    if (!transform) return
    setWizard((current) => ({
      ...current,
      transforms: [...(Array.isArray(current?.transforms) ? current.transforms : []), transform],
    }))
    setBuilderRevision((revision) => revision + 1)
  }
  useEffect(() => {
    if (!destination || readOnly) return
    const expectedKind = deploymentProfile === 'cloud' ? 'atlas' : 'source'
    const writeModes = destinationConnector?.writeModes || []
    const mode = writeModes[0] || 'upsert'
    setWizard((current) => {
      const output = current?.output as
        | { kind?: string; config?: Record<string, unknown> }
        | undefined
      const config = output?.config || {}
      if (
        output?.kind === expectedKind &&
        config.sourceId === destination.id &&
        typeof config.table === 'string' &&
        (writeModes.includes(String(config.writeMode || 'upsert')) || writeModes.length === 0)
      )
        return current
      return {
        ...current,
        output: {
          ...output,
          kind: expectedKind,
          config: {
            ...config,
            sourceId: destination.id,
            writeMode:
              writeModes.includes(String(config.writeMode || 'upsert')) || writeModes.length === 0
                ? config.writeMode
                : mode,
          },
        },
      }
    })
  }, [destination, destinationConnector, deploymentProfile, readOnly])
  const persist = useCallback(
    async (basicInfo?: PipelineDraftBasicInfo) => {
      if (readOnly) return currentDraft.current
      const basicInfoIsDirty = () =>
        Boolean(
          basicInfo &&
          (currentDraft.current.name !== basicInfo.name ||
            currentDraft.current.description !== basicInfo.description),
        )
      while (
        JSON.stringify(currentWizard.current) !== savedFingerprint.current ||
        basicInfoIsDirty()
      ) {
        if (pending.current) {
          await pending.current
          continue
        }
        const snapshot = currentWizard.current
        const fingerprint = JSON.stringify(snapshot)
        const mutation: PipelineDraftMutation = {
          pipelineId,
          mode: 'wizard',
          name: basicInfo?.name ?? currentDraft.current.name,
          description: basicInfo ? basicInfo.description : currentDraft.current.description,
          graph: null,
          wizard: snapshot,
          baseArtifactHash: currentDraft.current.baseArtifactHash,
        }
        setStatus('saving')
        const save = updatePipelineDraft(pipelineId, mutation, currentEtag.current, apiFetch).then(
          (result) => {
            currentDraft.current = result.draft
            currentEtag.current = result.etag
            savedFingerprint.current = fingerprint
            setStatus('saved')
            queryClient.setQueryData(['pipelines', pipelineId, 'draft'], {
              mode: 'wizard',
              ...result,
            })
            queryClient.setQueryData(['pipelines', pipelineId, 'draft-status'], result)
          },
        )
        pending.current = save
        try {
          await save
        } catch (cause) {
          setStatus('error')
          throw cause
        } finally {
          if (pending.current === save) pending.current = null
        }
      }
      return currentDraft.current
    },
    [apiFetch, pipelineId, queryClient, readOnly],
  )
  const saveBasicInfo = useCallback(
    async (basicInfo: PipelineDraftBasicInfo) => {
      await persist(basicInfo)
      return { draft: currentDraft.current, etag: currentEtag.current }
    },
    [persist],
  )
  useEffect(() => {
    if (readOnly) {
      onRegisterBasicInfoSaver?.(null)
      return
    }
    onRegisterBasicInfoSaver?.(saveBasicInfo)
    return () => onRegisterBasicInfoSaver?.(null)
  }, [onRegisterBasicInfoSaver, readOnly, saveBasicInfo])
  useEffect(() => {
    if (readOnly) return
    if (JSON.stringify(wizard) === savedFingerprint.current) return
    const timer = window.setTimeout(() => {
      void persist().catch((cause) =>
        setError(cause instanceof Error ? cause.message : t('wizard.errors.save')),
      )
    }, 550)
    return () => window.clearTimeout(timer)
  }, [persist, readOnly, t, wizard])
  const onChange = useCallback(
    (state: WizardViewState) => {
      if (editorReadOnly) return
      setError('')
      setNotice('')
      setPreview(null)
      setWizard((previous) =>
        writeWizard(
          state,
          previous,
          state.destinationSourceId || destination?.id || '',
          deploymentProfile,
        ),
      )
    },
    [destination?.id, deploymentProfile, editorReadOnly],
  )
  async function savePipeline(start: boolean) {
    if (busy || readOnly) return
    setBusy(true)
    setAction(start ? 'start' : 'save')
    setStartPhase(start ? 'saving' : null)
    setError('')
    setNotice('')
    try {
      const saved = await persist()
      if (!start) {
        await queryClient.invalidateQueries({ queryKey: ['pipelines', 'drafts'] })
        return
      }

      setStartPhase('validating')
      const issue = wizardPublicationIssue(currentWizard.current)
      if (issue) throw new Error(issue)
      const keylessInput = wizardUpsertKeylessInput(currentWizard.current, catalog)
      if (keylessInput) throw new Error(t('wizard.errors.upsertNeedsKey', keylessInput))
      const result = await previewPipelineDraft(pipelineId, saved.revision, apiFetch)
      setPreview(result)
      setStartPhase('publishing')
      await publishPipelineDraft(pipelineId, saved.revision, saved.publishedArtifactHash, apiFetch)
      const published = await getPipelineDraft(pipelineId, apiFetch)
      currentDraft.current = published.draft
      currentEtag.current = published.etag
      queryClient.setQueryData(['pipelines', pipelineId, 'draft'], { mode: 'wizard', ...published })
      queryClient.setQueryData(['pipelines', pipelineId, 'draft-status'], published)
      if (start) {
        setStartPhase('starting')
        let alreadyRunning = false
        try {
          await runPipeline(pipelineId, apiFetch)
        } catch (cause) {
          // Do not auto-stop an active run: that can interrupt ingestion and requires a
          // separate state-retention decision. Explain that publish succeeded but restart did not.
          if (
            !(cause instanceof PipelineClientError) ||
            cause.code !== 'lifecycle.illegal-transition' ||
            cause.params.from !== 'RUNNING'
          )
            throw cause
          alreadyRunning = true
        }
        if (alreadyRunning) setNotice(t('wizard.alreadyRunning'))
      }
      setStartPhase('checking')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      ])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
    } finally {
      setStartPhase(null)
      setAction(null)
      setBusy(false)
    }
  }
  if (sourcesQuery.isPending || connectorsQuery.isPending || schemas.some((s) => s.isPending))
    return (
      <div className="text-muted-foreground p-8 text-sm" role="status">
        {t('wizard.loading')}
      </div>
    )
  const isDirty = JSON.stringify(wizard) !== savedFingerprint.current
  const runtimeCheckPending =
    runtimeObservationPending ||
    (draft.publishedDraftRevision !== null && !runtimeStatus && !runtimeObservationError)
  const saveStatusLabel = error
    ? error
    : runtimeStatus === 'RUNNING' && startPhase === 'checking'
      ? t('pipelines.workspace.runtime.states.RUNNING')
      : startPhase
        ? t(`wizard.startPhases.${startPhase}`)
        : runtimeObservationError
          ? t('wizard.runtimeStatusError')
          : runtimeCheckPending
            ? t('wizard.checkingRuntime')
            : runtimeStatus
              ? t(`pipelines.workspace.runtime.states.${runtimeStatus}`)
              : readOnly
                ? t('pipelines.workspace.readOnly.editorStatus')
                : t(
                    status === 'saving' || action === 'save'
                      ? 'wizard.autosaving'
                      : status === 'error'
                        ? 'wizard.autosaveError'
                        : isDirty
                          ? 'wizard.unsavedChanges'
                          : 'wizard.autosaved',
                  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PipelineBuilderGuide
        open={guideOpen}
        step={guideStep}
        mode={guideMode}
        preset={customer360Preset}
        emptyDraft={emptyWizardDraft}
        presetApplied={presetApplied}
        formulaAdded={formulaAdded}
        onOpen={() => setGuideOpen(true)}
        onClose={() => setGuideOpen(false)}
        onStepChange={setGuideStep}
        onModeChange={setGuideMode}
        onApplyPreset={applyCustomer360Preset}
        onAddFormula={addCustomerLifetimeValue}
        onSaveDraft={() => void savePipeline(false)}
        onLaunch={() => void savePipeline(true)}
      />
      <ReferenceWizardBuilder
        key={builderRevision}
        catalog={catalog}
        initial={readWizard(
          wizard,
          catalog,
          destination?.id,
          destinationConnector?.writeModes?.[0] || 'upsert',
        )}
        onChange={onChange}
        destinationName={
          destination
            ? (connectors.find((connector) => connector.id === destination.connector)?.name ||
                destination.connector) +
              ' (' +
              destination.id +
              ')'
            : ''
        }
        deploymentProfile={deploymentProfile}
        readOnly={editorReadOnly}
        activeGuideTarget={guideOpen ? CUSTOMER_360_GUIDE_STEPS[guideStep]?.targetId : undefined}
        actions={
          <PipelineWorkflowHeader
            placement="sticky"
            runButtonId="step-publish-action"
            runButtonActiveGuide={guideOpen && guideStep === 4}
            dockStatus={
              <div className="wizard-reference-action-dock__status min-w-0 flex-1 text-[11px] text-[var(--pipeline-text-muted)]">
                <span
                  className={
                    error ||
                    runtimeObservationError ||
                    runtimeStatus === 'FAILED' ||
                    status === 'error'
                      ? 'bg-destructive size-2 shrink-0 rounded-full'
                      : status === 'saving' ||
                          action === 'start' ||
                          runtimeCheckPending ||
                          runtimeStatus === 'RUNNING' ||
                          isDirty
                        ? 'bg-primary size-2 shrink-0 rounded-full'
                        : 'bg-muted-foreground size-2 shrink-0 rounded-full'
                  }
                  aria-hidden="true"
                />
                <span className="truncate" role="status" title={saveStatusLabel}>
                  {saveStatusLabel}
                </span>
                {runtimeObservationError && onRetryRuntimeObservation && (
                  <button
                    type="button"
                    className="text-primary shrink-0 font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={onRetryRuntimeObservation}
                  >
                    {t('pipelines.workspace.actions.retry')}
                  </button>
                )}
              </div>
            }
            stopAction={stopAction}
            isDirty={isDirty}
            isSaving={busy && action === 'save'}
            isRunning={busy && action === 'start'}
            isBusy={busy}
            isReadOnly={readOnly}
            canSave
            saveLabel={t('wizard.savePipeline')}
            savePendingLabel={t('pipelines.workspace.actions.saving')}
            runLabel={t('wizard.startPipeline')}
            runPendingLabel={t('wizard.starting')}
            onSave={() => void savePipeline(false)}
            onRun={() => void savePipeline(true)}
          />
        }
        sourceError={sourcesQuery.error?.message || schemas.find((s) => s.error)?.error?.message}
        compiledSpec={preview?.dsl || JSON.stringify(wizard, null, 2)}
        footer={
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 text-[11px]">
            {error && (
              <p
                role="alert"
                className="w-full rounded border border-red-200 bg-red-50 p-3 text-red-700"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                className="border-border bg-muted text-muted-foreground rounded-control w-full border p-3"
                role="status"
              >
                {notice}
              </p>
            )}
          </div>
        }
      />
    </div>
  )
}

function isEmptyWizard(value: PipelineDraft['wizard']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true
  const root = value.root
  const related = value.related
  const transforms = value.transforms
  const rootTable = isObjectRecord(root) ? root.table : null
  return (
    (typeof rootTable !== 'string' || rootTable.length === 0) &&
    (!Array.isArray(related) || related.length === 0) &&
    (!Array.isArray(transforms) || transforms.length === 0)
  )
}

function hasCustomer360Preset(
  value: PipelineDraft['wizard'],
  preset: ReturnType<typeof findCustomer360Preset>,
) {
  if (!value || !preset) return false
  const root = value.root
  const relations = value.related
  if (!isObjectRecord(root) || !Array.isArray(relations)) return false
  const hasTable = (table: string) =>
    relations.some((relation) => isObjectRecord(relation) && relation.table === table)
  return (
    root.sourceId === preset.sourceId &&
    root.table === preset.root.name &&
    hasTable(preset.orders.name) &&
    hasTable(preset.items.name)
  )
}

function hasCustomerLifetimeValue(value: PipelineDraft['wizard']) {
  if (!value || !Array.isArray(value.transforms)) return false
  return value.transforms.some((transform) => {
    if (!isObjectRecord(transform)) return false
    const fields = transform.fields
    if (!isObjectRecord(fields)) return false
    return (
      transform.type === 'map' &&
      typeof fields.lifetime_value === 'string' &&
      fields.lifetime_value.startsWith('=')
    )
  })
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
