import type { ISchema } from '@formily/json-schema'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  LoaderCircle,
  Server,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorDetail, ConnectorSummary, SourceView } from '@/service/source-client'

import {
  Dialog,
  DialogContent,
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
import {
  createSource,
  getConnector,
  listConnectors,
  SourceClientError,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectorFormily } from './connector-formily'
import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
} from './connector-spec-formily-schema'
import { buildSourceConfig, createInitialConfig, type SourceConfigState } from './source-form'

interface SourceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
}

function errorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (!(error instanceof SourceClientError)) return t('sources.create.errors.unknown')
  if (error.kind === 'network') return t('sources.create.errors.network')
  if (error.code === 'source.already-exists') return t('sources.create.errors.exists')
  return t('sources.create.errors.server')
}

function connectorIcon(id: string) {
  const connector = id.toLowerCase()
  if (connector.includes('cloud') || connector.includes('s3') || connector.includes('bigquery'))
    return Cloud
  if (connector.includes('kafka') || connector.includes('pulsar')) return Server
  return Database
}

export function SourceCreateDialog({ open, onOpenChange, onCreated }: SourceCreateDialogProps) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([])
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [connectorId, setConnectorId] = useState('')
  const [step, setStep] = useState<'connector' | 'form'>('connector')
  const [sourceMode, setSourceMode] = useState('')
  const [config, setConfig] = useState<SourceConfigState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadingConnectors, setLoadingConnectors] = useState(false)
  const [loadingConnector, setLoadingConnector] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!open) return
    setSourceId('')
    setConnectorId('')
    setStep('connector')
    setSourceMode('')
    setConnector(null)
    setSchema(null)
    setConfig({})
    setFieldErrors({})
    setRequestError('')
    if (connectors.length === 0) {
      setLoadingConnectors(true)
      listConnectors(apiFetch)
        .then(setConnectors)
        .catch((error) => setRequestError(errorMessage(error, t)))
        .finally(() => setLoadingConnectors(false))
    }
  }, [apiFetch, connectors.length, open, t])

  useEffect(() => {
    setConnector(null)
    setSchema(null)
    setSourceMode('')
    setConfig({})
    setFieldErrors({})
    setRequestError('')
    if (!connectorId) return

    setLoadingConnector(true)
    getConnector(connectorId, apiFetch)
      .then((detail) => {
        if (detail.spec.text === null) {
          setRequestError(t('sources.create.errors.specUnavailable'))
          return
        }
        try {
          const nextSchema = connectorSpecConnectionSchema(detail.spec.text, detail.config)
          const initialValues = connectorSpecInitialValues(detail.spec.text)
          setSchema(nextSchema)
          setConfig({ ...createInitialConfig(detail.config), ...initialValues })
        } catch {
          setRequestError(t('sources.create.errors.specInvalid'))
          return
        }
        setConnector(detail)
        setSourceMode(detail.modes[0] ?? '')
      })
      .catch((error) => setRequestError(errorMessage(error, t)))
      .finally(() => setLoadingConnector(false))
  }, [apiFetch, connectorId, t])

  async function submit() {
    const nextErrors: Record<string, string> = {}
    setRequestError('')

    if (!sourceId.trim()) nextErrors.id = t('sources.create.validation.required')
    else if (sourceId.includes('.')) nextErrors.id = t('sources.create.validation.id')
    if (!connectorId) nextErrors.connector = t('sources.create.validation.required')
    if (Object.keys(nextErrors).length > 0 || connector === null || schema === null) {
      setFieldErrors(nextErrors)
      return
    }

    const result = buildSourceConfig(connector.config, config)
    for (const [name, code] of Object.entries(result.errors))
      nextErrors[name] = t(`sources.create.validation.${code}`)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const created = await createSource(
        {
          id: sourceId.trim(),
          connector: connectorId,
          config: result.config,
          ...(sourceMode ? { mode: sourceMode } : {}),
        },
        apiFetch,
      )
      onCreated(created.source)
      onOpenChange(false)
    } catch (error) {
      setRequestError(errorMessage(error, t))
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (submitting && !nextOpen) return
    onOpenChange(nextOpen)
  }

  function continueToForm() {
    if (!connectorId) {
      setFieldErrors({ connector: t('sources.create.validation.required') })
      return
    }
    setFieldErrors({})
    setRequestError('')
    setStep('form')
  }

  function chooseAnotherConnector() {
    if (submitting) return
    setConnectorId('')
    setConnector(null)
    setSchema(null)
    setConfig({})
    setRequestError('')
    setStep('connector')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeDisabled={submitting}
        closeLabel={t('ask.actions.close')}
        className="source-create-dialog sm:max-w-[920px]"
      >
        <DialogHeader className="source-create-dialog__create-header">
          <DialogTitle>{t('sources.create.title')}</DialogTitle>
        </DialogHeader>

        <div className="source-create-dialog__body source-create-dialog__create-body">
          {requestError && (
            <div className="source-create-dialog__alert" role="alert">
              <AlertCircle size={16} />
              <span>{requestError}</span>
            </div>
          )}

          {step === 'connector' ? (
            <section
              className="source-create-dialog__picker"
              aria-labelledby="connector-picker-title"
            >
              <div className="source-create-dialog__step-heading">
                <div>
                  <span className="source-create-dialog__eyebrow">
                    {t('sources.create.stepSelect')}
                  </span>
                  <h3 id="connector-picker-title">{t('sources.create.chooseConnector')}</h3>
                </div>
              </div>
              {loadingConnectors ? (
                <div className="source-create-dialog__loading">
                  <LoaderCircle className="animate-spin" size={18} />
                  {t('sources.create.loadingConnectors')}
                </div>
              ) : connectors.length === 0 ? (
                <div className="source-create-dialog__no-fields">
                  {t('sources.create.noConnectors')}
                </div>
              ) : (
                <div className="source-create-dialog__connector-grid" role="list">
                  {connectors.map((item) => {
                    const Icon = connectorIcon(item.id)
                    const selected = item.id === connectorId
                    return (
                      <button
                        key={item.id}
                        className="source-create-dialog__connector-card"
                        data-selected={selected || undefined}
                        type="button"
                        role="listitem"
                        aria-pressed={selected}
                        onClick={() => {
                          setConnectorId(item.id)
                          setFieldErrors((current) => ({ ...current, connector: '' }))
                        }}
                      >
                        <span className="source-create-dialog__connector-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span className="source-create-dialog__connector-copy">
                          <span className="source-create-dialog__connector-name">{item.name}</span>
                          <span className="source-create-dialog__connector-tags">
                            <span>{item.group}</span>
                            {item.modes.slice(0, 1).map((mode) => (
                              <span key={mode}>{mode}</span>
                            ))}
                          </span>
                        </span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-gray-900" />}
                      </button>
                    )
                  })}
                </div>
              )}
              {fieldErrors.connector && (
                <span className="source-field__error">{fieldErrors.connector}</span>
              )}
            </section>
          ) : (
            <>
              {loadingConnector ? (
                <div className="source-create-dialog__loading">
                  <LoaderCircle className="animate-spin" size={18} />
                  {t('sources.create.loadingSchema')}
                </div>
              ) : connector && schema ? (
                <section className="source-create-dialog__authoring">
                  <div className="source-create-dialog__form-column">
                    <div className="source-create-dialog__connection-heading">
                      <button
                        className="source-create-dialog__back"
                        type="button"
                        onClick={chooseAnotherConnector}
                      >
                        <ArrowLeft size={14} />
                        {t('sources.create.chooseAnother')}
                      </button>
                      <div>
                        <span className="source-create-dialog__eyebrow">
                          {t('sources.create.stepConfigure')}
                        </span>
                        <h3>{connector.name}</h3>
                      </div>
                    </div>
                    <label className="source-field">
                      <span className="source-field__label">{t('sources.create.idLabel')}</span>
                      <input
                        value={sourceId}
                        placeholder={t('sources.create.idPlaceholder')}
                        className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                        onChange={(event) => {
                          setSourceId(event.target.value)
                          setFieldErrors((current) => ({ ...current, id: '' }))
                        }}
                      />
                      {fieldErrors.id ? (
                        <span className="source-field__error">{fieldErrors.id}</span>
                      ) : (
                        <span className="source-field__hint">{t('sources.create.idHint')}</span>
                      )}
                    </label>

                    {connector.modes.length > 0 && (
                      <label className="source-field">
                        <span className="source-field__label">{t('sources.create.modeLabel')}</span>
                        <Select
                          value={sourceMode}
                          onValueChange={(value) => value !== null && setSourceMode(value)}
                        >
                          <SelectTrigger aria-label={t('sources.create.modeLabel')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {connector.modes.map((mode) => (
                              <SelectItem key={mode} value={mode}>
                                {mode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    )}

                    <ConnectorFormily
                      fields={connector.config}
                      schema={schema}
                      resetKey={`${connector.id}:${connector.spec.contentHash}`}
                      initialValues={config}
                      errors={fieldErrors}
                      disabled={submitting}
                      onValuesChange={setConfig}
                    />
                  </div>
                  <aside className="source-create-dialog__documentation">
                    <span className="source-create-dialog__documentation-icon">
                      <Database size={16} />
                    </span>
                    <h4>{t('sources.create.documentationTitle')}</h4>
                    <p>{t('sources.create.documentationPlaceholder')}</p>
                    <span className="source-create-dialog__origin">
                      <Check size={13} /> {connector.origin}
                    </span>
                  </aside>
                </section>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="source-create-dialog__footer mt-5">
          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700"
            type="button"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t('sources.create.cancel')}
          </button>
          {step === 'connector' ? (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
              type="button"
              disabled={!connectorId || loadingConnectors}
              onClick={continueToForm}
            >
              {t('sources.create.continue')} <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
              type="button"
              disabled={connector === null || schema === null || submitting}
              onClick={() => void submit()}
            >
              {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? t('sources.create.submitting') : t('sources.create.submit')}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
