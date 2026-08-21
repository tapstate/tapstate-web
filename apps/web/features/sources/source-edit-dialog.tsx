import type { ISchema } from '@formily/json-schema'

import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react'
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

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getConnector, getSource, SourceClientError, updateSource } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectorFormily, type SecretDraft } from './connector-formily'
import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
} from './connector-spec-formily-schema'
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

function RequestError({ message }: { message: string }) {
  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function SourceEditDialog({
  open,
  source,
  etag,
  onOpenChange,
  onSaved,
}: SourceEditDialogProps) {
  const { i18n, t } = useTranslation()
  const currentLocale = i18n.resolvedLanguage ?? i18n.language
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [currentSource, setCurrentSource] = useState(source)
  const [currentEtag, setCurrentEtag] = useState(etag)
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
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

  function sourceConfig(sourceToEdit: SourceView, detail = connector) {
    if (!detail?.spec.text) return { ...sourceToEdit.config }

    try {
      return {
        ...createInitialConfig(detail.config),
        ...connectorSpecInitialValues(detail.spec.text),
        ...sourceToEdit.config,
      }
    } catch {
      return { ...sourceToEdit.config }
    }
  }

  function reset(nextSource: SourceView, nextEtag: string) {
    setCurrentSource(nextSource)
    setCurrentEtag(nextEtag)
    setConfig(sourceConfig(nextSource))
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

    let active = true
    reset(source, etag)
    setConnector(null)
    setSchema(null)
    setLoading(true)

    getConnector(source.connector, apiFetch)
      .then((detail) => {
        if (!active) return
        if (detail.spec.text === null) {
          setRequestError(t('sources.create.errors.specUnavailable'))
          return
        }

        try {
          const nextSchema = connectorSpecConnectionSchema(detail.spec.text, currentLocale)
          const initialValues = connectorSpecInitialValues(detail.spec.text)
          setConnector(detail)
          setSchema(nextSchema)
          setMode((current) => current || detail.modes[0] || '')
          setConfig({
            ...createInitialConfig(detail.config),
            ...initialValues,
            ...source.config,
          })
        } catch {
          setRequestError(t('sources.create.errors.specUnavailable'))
        }
      })
      .catch((error) => {
        if (active) setRequestError(errorMessage(error, t))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [apiFetch, currentLocale, etag, open, source, t])

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
    if (!connector || !schema) return

    setRequestError('')
    const nextErrors: Record<string, string> = {}
    const sourceConfigValues = buildSourceEditConfig(connector.config, config, secretDrafts)
    for (const [name, code] of Object.entries(sourceConfigValues.errors)) {
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
          config: { ...currentSource.config, ...sourceConfigValues.config },
          metadata: metadataValue,
          mode: mode || undefined,
          tables,
          options: currentSource.options,
          srs: serializeSourceSrs(srs),
          experimental: currentSource.experimental,
          clearSecrets: sourceConfigValues.clearSecrets,
        } satisfies SourceDraft,
        currentEtag,
        apiFetch,
      )
      onSaved(resultEnvelope)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof SourceClientError && error.code === 'source.version-conflict')
        setConflict(true)
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
        className="bg-background border-border flex h-[90vh] max-h-[800px] w-full max-w-[1100px] flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl ring-0 sm:max-w-[1100px]"
      >
        <DialogHeader className="border-border bg-background flex h-14 shrink-0 flex-row items-center border-b px-6 pr-12">
          <DialogTitle className="text-foreground text-base font-semibold">
            {t('sources.edit.title', { id: currentSource.id })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="bg-muted/20 flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 lg:p-8">
                {requestError && <RequestError message={requestError} />}

                {conflict && (
                  <div className="border-border bg-background rounded-lg border p-3 text-[13px] leading-relaxed">
                    <p className="text-foreground font-medium">
                      {t('sources.edit.errors.conflict.title')}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {t('sources.edit.errors.conflict.body')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={refreshing}
                        onClick={() => void refreshLatest(true)}
                      >
                        <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
                        {t('sources.edit.reload')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        disabled={refreshing}
                        onClick={() => void refreshLatest(false)}
                      >
                        <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
                        {t('sources.edit.keepDraft')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-foreground text-[13px] font-medium">
                      {t('sources.edit.idLabel')}
                    </span>
                    <Input disabled value={currentSource.id} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-foreground text-[13px] font-medium">
                      {t('sources.edit.connectorLabel')}
                    </span>
                    <Input disabled value={currentSource.connector} />
                  </label>
                </div>

                {loading ? (
                  <div className="text-muted-foreground flex min-h-24 items-center justify-center gap-2 text-[13px]">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    {t('sources.create.loadingSchema')}
                  </div>
                ) : connector && schema ? (
                  <>
                    {connector.modes.length > 1 && (
                      <div className="grid gap-1.5">
                        <span className="text-foreground text-[13px] font-medium">
                          {t('sources.edit.modeLabel')}
                        </span>
                        <div
                          className="border-border bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border p-1"
                          role="group"
                          aria-label={t('sources.edit.modeLabel')}
                        >
                          {connector.modes.map((item) => {
                            const selected = mode === item
                            return (
                              <Button
                                key={item}
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-pressed={selected}
                                disabled={submitting}
                                className={
                                  selected
                                    ? 'bg-background text-foreground hover:bg-background shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                                }
                                onClick={() => setMode(item)}
                              >
                                {item}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <ConnectorFormily
                      fields={connector.config}
                      schema={schema}
                      resetKey={`${currentSource.id}:${currentEtag}:${connector.spec.contentHash}`}
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
                  </>
                ) : null}

                <section className="flex flex-col gap-3" aria-labelledby="source-metadata-heading">
                  <h3
                    id="source-metadata-heading"
                    className="text-foreground text-[13px] font-semibold"
                  >
                    {t('sources.edit.metadata')}
                  </h3>
                  <Textarea
                    rows={4}
                    value={metadata}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.metadata)}
                    className="min-h-24 font-mono text-[12px]"
                    onChange={(event) => setMetadata(event.target.value)}
                  />
                  {fieldErrors.metadata && (
                    <span className="text-destructive text-[12px] leading-relaxed">
                      {fieldErrors.metadata}
                    </span>
                  )}
                </section>

                <section className="flex flex-col gap-3" aria-labelledby="source-tables-heading">
                  <h3
                    id="source-tables-heading"
                    className="text-foreground text-[13px] font-semibold"
                  >
                    {t('sources.edit.tables')}
                  </h3>
                  <TableSelectionEditor value={tables} disabled={submitting} onChange={setTables} />
                </section>

                <section className="flex flex-col gap-4" aria-labelledby="source-srs-heading">
                  <h3 id="source-srs-heading" className="text-foreground text-[13px] font-semibold">
                    {t('sources.edit.srs')}
                  </h3>
                  <label className="grid gap-1.5">
                    <span className="text-foreground text-[13px] font-medium">
                      {t('sources.edit.srsKey')}
                    </span>
                    <Input
                      value={srs.key}
                      disabled={submitting}
                      onChange={(event) =>
                        setSrs((current) => ({ ...current, key: event.target.value }))
                      }
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-foreground text-[13px] font-medium">
                      {t('sources.edit.srsRetention')}
                    </span>
                    <Input
                      value={srs.retention}
                      disabled={submitting}
                      onChange={(event) =>
                        setSrs((current) => ({ ...current, retention: event.target.value }))
                      }
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-foreground text-[13px] font-medium">
                      {t('sources.edit.srsSchemaEvolution')}
                    </span>
                    <Input
                      value={srs.schemaEvolution}
                      disabled={submitting}
                      onChange={(event) =>
                        setSrs((current) => ({ ...current, schemaEvolution: event.target.value }))
                      }
                    />
                  </label>
                  <div className="flex flex-col gap-3 text-[13px]">
                    <label className="text-foreground flex items-center gap-2">
                      <Checkbox
                        checked={srs.queryable}
                        disabled={submitting}
                        onCheckedChange={(checked) =>
                          setSrs((current) => ({ ...current, queryable: Boolean(checked) }))
                        }
                      />
                      {t('sources.edit.srsQueryable')}
                    </label>
                    <label className="text-foreground flex items-center gap-2">
                      <Checkbox
                        checked={srs.enabled}
                        disabled={submitting}
                        onCheckedChange={(checked) =>
                          setSrs((current) => ({ ...current, enabled: Boolean(checked) }))
                        }
                      />
                      {t('sources.edit.srsEnabled')}
                    </label>
                  </div>
                </section>
              </section>
            </div>

            <footer className="border-border bg-background shrink-0 border-t px-6 py-4 sm:px-8">
              <div className="mx-auto flex w-full max-w-3xl justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                >
                  {t('sources.edit.cancel')}
                </Button>
                <Button
                  type="button"
                  disabled={submitting || loading || !connector || !schema}
                  onClick={() => void submit()}
                >
                  {submitting && <LoaderCircle className="size-3.5 animate-spin" />}
                  {submitting ? t('sources.edit.submitting') : t('sources.edit.save')}
                </Button>
              </div>
            </footer>
          </div>

          <aside className="border-border bg-background hidden w-[360px] shrink-0 overflow-y-auto border-l p-6 lg:block xl:w-[420px]">
            <div className="flex flex-col gap-3">
              <h2 className="text-foreground text-sm font-semibold">
                {t('sources.edit.helpTitle')}
              </h2>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                {t('sources.edit.helpBody', { connector: currentSource.connector })}
              </p>
              <div className="border-border mt-3 border-t pt-4 text-[12px] leading-relaxed">
                <p className="text-muted-foreground">{t('sources.edit.secretConfiguredHint')}</p>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
