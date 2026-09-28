import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import {
  ReferenceWizardBuilder,
  type DataSourceMeta,
  type WizardViewState,
} from '../components/reference-wizard/ReferenceWizardBuilder'
import {
  readWizard,
  writeWizard,
  wizardPublicationIssue,
} from '../components/reference-wizard/wizard-adapter'
import { getDeploymentProfile } from '../model/deployment-profile'
import { targetSources } from '../model/pipeline-target-connectors'
import { sourceScopedTableNames } from '../model/source-table-scope'
import { PipelineWorkflowHeader } from '../workflow-app/components/pipeline-workflow-header'

export function WizardBuilder({
  pipelineId,
  draft,
  etag,
  readOnly = false,
}: {
  pipelineId: string
  draft: PipelineDraft
  etag: string
  readOnly?: boolean
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
  const deploymentProfile = getDeploymentProfile()
  const schemas = useQueries({
    queries: sources.map((s) => ({
      queryKey: ['wizard', 'source-schema', s.id],
      queryFn: () => getSourceSchema(s.id, apiFetch),
      retry: false,
    })),
  })
  const catalog = useMemo<DataSourceMeta[]>(
    () =>
      sources.map((s, i) => {
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
              rowCount: '—',
              columns: (detail?.fields || []).map((f) => f.name),
            }
          }),
        }
      }),
    [connectors, sources, schemas],
  )
  const [wizard, setWizard] = useState(draft.wizard)
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<'save' | 'start' | null>(null)
  const [preview, setPreview] = useState<PipelineDraftPreview | null>(null)
  const currentDraft = useRef(draft)
  const currentEtag = useRef(etag)
  const pending = useRef<Promise<void> | null>(null)
  const savedFingerprint = useRef(JSON.stringify(draft.wizard))
  const currentWizard = useRef(wizard)
  currentWizard.current = wizard
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
  const persist = useCallback(async () => {
    if (readOnly) return currentDraft.current
    while (JSON.stringify(currentWizard.current) !== savedFingerprint.current) {
      if (pending.current) {
        await pending.current
        continue
      }
      const snapshot = currentWizard.current
      const fingerprint = JSON.stringify(snapshot)
      const mutation: PipelineDraftMutation = {
        pipelineId,
        mode: 'wizard',
        name: currentDraft.current.name,
        description: currentDraft.current.description,
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
  }, [apiFetch, pipelineId, queryClient, readOnly])
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
      if (readOnly) return
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
    [destination?.id, deploymentProfile, readOnly],
  )
  async function publish(start: boolean) {
    if (busy || readOnly) return
    setBusy(true)
    setAction(start ? 'start' : 'save')
    setError('')
    setNotice('')
    try {
      const saved = await persist()
      const issue = wizardPublicationIssue(currentWizard.current)
      if (issue) throw new Error(issue)
      const result = await previewPipelineDraft(pipelineId, saved.revision, apiFetch)
      setPreview(result)
      await publishPipelineDraft(pipelineId, saved.revision, saved.publishedArtifactHash, apiFetch)
      const published = await getPipelineDraft(pipelineId, apiFetch)
      currentDraft.current = published.draft
      currentEtag.current = published.etag
      queryClient.setQueryData(['pipelines', pipelineId, 'draft'], { mode: 'wizard', ...published })
      if (start) {
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      ])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
    } finally {
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
  return (
    <>
      <ReferenceWizardBuilder
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
        readOnly={readOnly}
        actions={
          <PipelineWorkflowHeader
            placement="sticky"
            isDirty={JSON.stringify(wizard) !== savedFingerprint.current}
            isSaving={busy && action === 'save'}
            isRunning={busy && action === 'start'}
            isBusy={busy}
            isReadOnly={readOnly}
            canSave
            saveLabel={t('wizard.savePipeline')}
            savePendingLabel={t('pipelines.workspace.actions.saving')}
            runLabel={t('wizard.startPipeline')}
            runPendingLabel={t('wizard.starting')}
            onSave={() => void publish(false)}
            onRun={() => void publish(true)}
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
            <span role="status" className="text-gray-500">
              {readOnly
                ? t('pipelines.workspace.readOnly.editorStatus')
                : action === 'start'
                  ? t('wizard.starting')
                  : t(
                      status === 'saving'
                        ? 'wizard.autosaving'
                        : status === 'error'
                          ? 'wizard.autosaveError'
                          : 'wizard.autosaved',
                    )}
            </span>
          </div>
        }
      />
    </>
  )
}
