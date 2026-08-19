import { AlertCircle, Database, LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  ConnectorDetail,
  JsonValue,
  SourceDraft,
  SourceEnvelope,
  SourceSrs,
  SourceView,
} from '@/service/source-client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getConnector, getSource, SourceClientError, updateSource } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectorFormily, type SecretDraft } from './connector-formily'
import { buildSourceConfig, createInitialConfig, type SourceConfigState } from './source-form'
import { TableSelectionEditor } from './table-selection-editor'

interface SourceEditDialogProps {
  open: boolean
  source: SourceView
  etag: string
  onOpenChange: (open: boolean) => void
  onSaved: (result: SourceEnvelope) => void
}

function errorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (!(error instanceof SourceClientError)) return t('sources.edit.errors.unknown')
  if (error.kind === 'network') return t('sources.edit.errors.network')
  if (error.code === 'source.version-conflict') return t('sources.edit.errors.conflict.body')
  if (error.code === 'source.precondition-required') return t('sources.edit.errors.precondition')
  return t('sources.edit.errors.server')
}

function metadataText(source: SourceView) {
  return source.metadata ? JSON.stringify(source.metadata, null, 2) : '{}'
}

interface EditableSrs {
  key: string
  retention: string
  schemaEvolution: string
  queryable: boolean
  enabled: boolean
}

function stringValue(value: JsonValue | undefined) {
  return typeof value === 'string' ? value : ''
}

function booleanValue(value: JsonValue | undefined) {
  return typeof value === 'boolean' ? value : false
}

function srsValue(source: SourceView): EditableSrs {
  return {
    key: stringValue(source.srs?.key),
    retention: stringValue(source.srs?.retention),
    schemaEvolution: stringValue(source.srs?.schemaEvolution),
    queryable: booleanValue(source.srs?.queryable),
    enabled: booleanValue(source.srs?.enabled),
  }
}

export function serializeSourceSrs(srs: EditableSrs): SourceSrs | null {
  const hasTextValue = Boolean(srs.key || srs.retention || srs.schemaEvolution)
  if (!hasTextValue && !srs.queryable && !srs.enabled) return null

  return {
    ...(srs.key ? { key: srs.key } : {}),
    ...(srs.retention ? { retention: srs.retention } : {}),
    ...(srs.schemaEvolution ? { schemaEvolution: srs.schemaEvolution } : {}),
    queryable: srs.queryable,
    enabled: srs.enabled,
  }
}

export function buildSourceEditConfig(
  fields: ConnectorDetail['config'],
  config: SourceConfigState,
  secretDrafts: Record<string, SecretDraft>,
) {
  const clearSecrets: string[] = []
  const secretValues: Record<string, JsonValue> = {}
  const retainedRequiredSecrets: string[] = []
  for (const [name, draft] of Object.entries(secretDrafts)) {
    if (draft.action === 'clear') clearSecrets.push(name)
    if (draft.action === 'keep') retainedRequiredSecrets.push(name)
    if (draft.action === 'replace' && draft.value) secretValues[name] = draft.value
  }

  return {
    ...buildSourceConfig(fields, { ...config, ...secretValues }, retainedRequiredSecrets),
    clearSecrets,
  }
}

export function SourceEditDialog({
  open,
  source,
  etag,
  onOpenChange,
  onSaved,
}: SourceEditDialogProps) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [currentSource, setCurrentSource] = useState(source)
  const [currentEtag, setCurrentEtag] = useState(etag)
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [config, setConfig] = useState<SourceConfigState>({})
  const [secretDrafts, setSecretDrafts] = useState<Record<string, SecretDraft>>({})
  const [tables, setTables] = useState(source.tables ?? [])
  const [mode, setMode] = useState(source.mode ?? '')
  const [metadata, setMetadata] = useState(metadataText(source))
  const [srs, setSrs] = useState<EditableSrs>(srsValue(source))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function reset(nextSource: SourceView, nextEtag: string) {
    setCurrentSource(nextSource)
    setCurrentEtag(nextEtag)
    setConfig({ ...nextSource.config })
    setTables(nextSource.tables ?? [])
    setMode(nextSource.mode ?? '')
    setMetadata(metadataText(nextSource))
    setSrs(srsValue(nextSource))
    setFieldErrors({})
    setRequestError('')
    setConflict(false)
    setSecretDrafts(
      Object.fromEntries(
        nextSource.configuredSecrets.map((name) => [name, { action: 'keep', value: '' }]),
      ),
    )
  }

  useEffect(() => {
    if (!open) return
    reset(source, etag)
    setConnector(null)
    setLoading(true)
    getConnector(source.connector, apiFetch)
      .then((detail) => {
        setConnector(detail)
        setConfig((current) => ({ ...createInitialConfig(detail.config), ...current }))
      })
      .catch((error) => setRequestError(errorMessage(error, t)))
      .finally(() => setLoading(false))
  }, [apiFetch, etag, open, source, t])

  async function refreshLatest(replaceDraft: boolean) {
    setRefreshing(true)
    try {
      const latest = await getSource(currentSource.id, apiFetch)
      if (replaceDraft) reset(latest.source, latest.etag)
      else {
        setCurrentSource(latest.source)
        setCurrentEtag(latest.etag)
        setConflict(false)
        setRequestError('')
      }
    } catch (error) {
      setRequestError(errorMessage(error, t))
    } finally {
      setRefreshing(false)
    }
  }

  async function submit() {
    if (!connector) return
    setRequestError('')
    const nextErrors: Record<string, string> = {}
    const sourceConfig = buildSourceEditConfig(connector.config, config, secretDrafts)
    for (const [name, code] of Object.entries(sourceConfig.errors)) {
      nextErrors[name] = t(`sources.edit.validation.${code}`)
    }

    let metadataValue: Record<string, JsonValue> | null = null
    try {
      const parsed: unknown = JSON.parse(metadata)
      if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed)))
        throw new Error('metadata')
      metadataValue = parsed as Record<string, JsonValue> | null
    } catch {
      nextErrors.metadata = t('sources.edit.validation.metadata')
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const resultEnvelope = await updateSource(
        currentSource.id,
        {
          id: currentSource.id,
          connector: currentSource.connector,
          config: { ...currentSource.config, ...sourceConfig.config },
          metadata: metadataValue,
          mode: mode || undefined,
          tables,
          options: currentSource.options,
          srs: serializeSourceSrs(srs),
          experimental: currentSource.experimental,
          clearSecrets: sourceConfig.clearSecrets,
        } satisfies SourceDraft,
        currentEtag,
        apiFetch,
      )
      onSaved(resultEnvelope)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof SourceClientError && error.code === 'source.version-conflict') {
        setConflict(true)
      }
      setRequestError(errorMessage(error, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!submitting ? onOpenChange(nextOpen) : undefined)}
    >
      <DialogContent
        closeDisabled={submitting}
        closeLabel={t('ask.actions.close')}
        className="source-edit-dialog max-h-[90vh] overflow-hidden sm:max-w-[760px]"
      >
        <DialogHeader className="source-create-dialog__header">
          <span className="source-create-dialog__icon">
            <Database size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>{t('sources.edit.title', { id: currentSource.id })}</DialogTitle>
            <DialogDescription>
              {t('sources.edit.subtitle', { connector: currentSource.connector })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
          {requestError && (
            <div className="source-create-dialog__alert" role="alert">
              <AlertCircle size={16} />
              <span>{requestError}</span>
            </div>
          )}
          {conflict && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
              <p className="font-medium">{t('sources.edit.errors.conflict.title')}</p>
              <p className="mt-1">{t('sources.edit.errors.conflict.body')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50"
                  onClick={() => void refreshLatest(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {t('sources.edit.reload')}
                </button>
                <button
                  type="button"
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50"
                  onClick={() => void refreshLatest(false)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {t('sources.edit.keepDraft')}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="source-field">
              <span className="source-field__label">{t('sources.edit.idLabel')}</span>
              <input
                disabled
                value={currentSource.id}
                className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px]"
              />
            </label>
            <label className="source-field">
              <span className="source-field__label">{t('sources.edit.connectorLabel')}</span>
              <input
                disabled
                value={currentSource.connector}
                className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px]"
              />
            </label>
          </div>

          {loading ? (
            <div className="source-create-dialog__loading">
              <LoaderCircle className="animate-spin" size={18} />{' '}
              {t('sources.create.loadingSchema')}
            </div>
          ) : connector ? (
            <>
              {connector.modes.length > 0 && (
                <label className="source-field">
                  <span className="source-field__label">{t('sources.edit.modeLabel')}</span>
                  <Select
                    value={mode}
                    onValueChange={(value) => value !== null && setMode(value)}
                    disabled={submitting}
                  >
                    <SelectTrigger aria-label={t('sources.edit.modeLabel')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {connector.modes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
              <section>
                <h3 className="source-create-dialog__section-heading">
                  {t('sources.edit.configuration')}
                </h3>
                <ConnectorFormily
                  fields={connector.config}
                  resetKey={`${currentSource.id}:${currentEtag}`}
                  initialValues={config}
                  configuredSecrets={currentSource.configuredSecrets}
                  secretDrafts={secretDrafts}
                  errors={fieldErrors}
                  disabled={submitting}
                  onValuesChange={setConfig}
                  onSecretChange={(name, draft) =>
                    setSecretDrafts((current) => ({ ...current, [name]: draft }))
                  }
                />
              </section>
            </>
          ) : null}

          <section>
            <h3 className="source-create-dialog__section-heading">{t('sources.edit.metadata')}</h3>
            <textarea
              rows={4}
              value={metadata}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 font-mono text-[12px]"
              onChange={(event) => setMetadata(event.target.value)}
            />
            {fieldErrors.metadata && (
              <span className="source-field__error">{fieldErrors.metadata}</span>
            )}
          </section>

          <section>
            <h3 className="source-create-dialog__section-heading">{t('sources.edit.tables')}</h3>
            <TableSelectionEditor value={tables} disabled={submitting} onChange={setTables} />
          </section>

          <section>
            <h3 className="source-create-dialog__section-heading">{t('sources.edit.srs')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                value={srs.key}
                disabled={submitting}
                placeholder={t('sources.edit.srsKey')}
                onChange={(event) => setSrs((current) => ({ ...current, key: event.target.value }))}
              />
              <input
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                value={srs.retention}
                disabled={submitting}
                placeholder={t('sources.edit.srsRetention')}
                onChange={(event) =>
                  setSrs((current) => ({ ...current, retention: event.target.value }))
                }
              />
              <input
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                value={srs.schemaEvolution}
                disabled={submitting}
                placeholder={t('sources.edit.srsSchemaEvolution')}
                onChange={(event) =>
                  setSrs((current) => ({ ...current, schemaEvolution: event.target.value }))
                }
              />
              <div className="flex items-center gap-4 text-[12px] text-gray-600">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={srs.queryable}
                    disabled={submitting}
                    onChange={(event) =>
                      setSrs((current) => ({ ...current, queryable: event.target.checked }))
                    }
                  />
                  {t('sources.edit.srsQueryable')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={srs.enabled}
                    disabled={submitting}
                    onChange={(event) =>
                      setSrs((current) => ({ ...current, enabled: event.target.checked }))
                    }
                  />
                  {t('sources.edit.srsEnabled')}
                </label>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="source-create-dialog__footer mt-3">
          <button
            type="button"
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700"
            onClick={() => onOpenChange(false)}
          >
            {t('sources.edit.cancel')}
          </button>
          <button
            type="button"
            disabled={submitting || loading || !connector}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? t('sources.edit.submitting') : t('sources.edit.save')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
