import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getPipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  updatePipelineDraft,
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
import { sourceScopedTableNames } from '../model/source-table-scope'

export function WizardBuilder({
  pipelineId,
  draft,
  etag,
}: {
  pipelineId: string
  draft: PipelineDraft
  etag: string
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
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<PipelineDraftPreview | null>(null)
  const currentDraft = useRef(draft)
  const currentEtag = useRef(etag)
  const pending = useRef<Promise<void> | null>(null)
  const savedFingerprint = useRef(JSON.stringify(draft.wizard))
  const currentWizard = useRef(wizard)
  currentWizard.current = wizard
  const originalOutput = draft.wizard?.output as { config?: { sourceId?: string } } | undefined
  const destination =
    sources.find((s) => s.id === originalOutput?.config?.sourceId) ||
    sources.find((s) => s.connector === 'mongodb-atlas') ||
    sources.find((s) => s.connector === 'mongodb' && /target|destination|sink|out/i.test(s.id)) ||
    sources.find((s) => s.connector === 'mongodb')
  const persist = useCallback(async () => {
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
  }, [apiFetch, pipelineId, queryClient])
  useEffect(() => {
    if (JSON.stringify(wizard) === savedFingerprint.current) return
    const timer = window.setTimeout(() => {
      void persist().catch((cause) =>
        setError(cause instanceof Error ? cause.message : t('wizard.errors.save')),
      )
    }, 550)
    return () => window.clearTimeout(timer)
  }, [persist, t, wizard])
  const onChange = useCallback(
    (state: WizardViewState) => {
      setError('')
      setPreview(null)
      setWizard((previous) => writeWizard(state, previous, destination?.id || ''))
    },
    [destination?.id],
  )
  async function publish(start: boolean) {
    if (busy) return
    setBusy(true)
    setError('')
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
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      if (start) await runPipeline(pipelineId, apiFetch)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
    } finally {
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
    <ReferenceWizardBuilder
      catalog={catalog}
      initial={readWizard(draft.wizard, catalog)}
      onChange={onChange}
      destinationName={
        destination
          ? (destination.connector === 'mongodb-atlas' ? 'MongoDB Atlas' : 'MongoDB') +
            ' (' +
            destination.id +
            ')'
          : ''
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
          <span role="status" className="text-gray-500">
            {t(
              status === 'saving'
                ? 'wizard.autosaving'
                : status === 'error'
                  ? 'wizard.autosaveError'
                  : 'wizard.autosaved',
            )}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publish(false)}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-gray-600 shadow-xs disabled:opacity-50"
          >
            {t('wizard.savePipeline')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publish(true)}
            className="rounded bg-blue-600 px-3 py-1.5 text-white shadow-xs disabled:opacity-50"
          >
            {t('wizard.startPipeline')}
          </button>
        </div>
      }
    />
  )
}
