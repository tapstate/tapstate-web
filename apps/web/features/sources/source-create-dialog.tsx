import type { ISchema } from '@formily/json-schema'

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Database,
  LoaderCircle,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConnectorIcon } from '@/components/connector-icon'

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

export function SourceCreateDialog({ open, onOpenChange, onCreated }: SourceCreateDialogProps) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([])
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [connectorId, setConnectorId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'picker' | 'form'>('picker')
  const [sourceMode, setSourceMode] = useState('')
  const [config, setConfig] = useState<SourceConfigState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadingConnectors, setLoadingConnectors] = useState(false)
  const [loadingConnector, setLoadingConnector] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const connectorButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!open) return
    setSourceId('')
    setConnectorId('')
    setSearchTerm('')
    setView('picker')
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
    if (!connectorId || view !== 'form') return

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
  }, [apiFetch, connectorId, t, view])

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

  function chooseConnector(id: string) {
    setConnectorId(id)
    setFieldErrors((current) => ({ ...current, connector: '' }))
    setRequestError('')
    setView('form')
  }

  function chooseAnotherConnector() {
    if (submitting) return
    const previousConnectorId = connectorId
    setConnectorId('')
    setConnector(null)
    setSchema(null)
    setConfig({})
    setRequestError('')
    setView('picker')
    requestAnimationFrame(() => connectorButtonRefs.current[previousConnectorId]?.focus())
  }

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase()
  const visibleConnectors = normalizedSearch
    ? connectors.filter((item) =>
        [item.name, item.id, item.group, ...item.modes].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        ),
      )
    : connectors

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeDisabled={submitting}
        closeLabel={t('ask.actions.close')}
        className="source-create-dialog sm:max-w-[1020px]"
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

          {view === 'picker' ? (
            <section
              className="source-create-dialog__picker"
              aria-labelledby="connector-picker-title"
            >
              <div className="source-create-dialog__section-heading">
                <h3 id="connector-picker-title">{t('sources.create.chooseConnector')}</h3>
                <span className="source-create-dialog__catalog-count">
                  {visibleConnectors.length}/{connectors.length}
                </span>
              </div>
              <label className="source-create-dialog__search">
                <Search size={15} aria-hidden="true" />
                <Input
                  value={searchTerm}
                  placeholder={t('sources.create.searchConnectors')}
                  aria-label={t('sources.create.searchConnectors')}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              {loadingConnectors ? (
                <div className="source-create-dialog__loading">
                  <LoaderCircle className="animate-spin" size={18} />
                  {t('sources.create.loadingConnectors')}
                </div>
              ) : connectors.length === 0 ? (
                <div className="source-create-dialog__no-fields">
                  {t('sources.create.noConnectors')}
                </div>
              ) : visibleConnectors.length === 0 ? (
                <div className="source-create-dialog__no-fields">
                  {t('sources.create.noMatchingConnectors')}
                </div>
              ) : (
                <div className="source-create-dialog__connector-grid" role="list">
                  {visibleConnectors.map((item) => {
                    return (
                      <button
                        key={item.id}
                        className="source-create-dialog__connector-card"
                        type="button"
                        role="listitem"
                        ref={(element) => {
                          connectorButtonRefs.current[item.id] = element
                        }}
                        onClick={() => chooseConnector(item.id)}
                      >
                        <ConnectorIcon
                          connectorId={item.id}
                          name={item.name}
                          iconPath={item.icon}
                          size={56}
                          className="source-create-dialog__connector-icon"
                        />
                        <span className="source-create-dialog__connector-copy">
                          <span className="source-create-dialog__connector-name">{item.name}</span>
                          <span className="source-create-dialog__connector-tags">
                            <span>{item.group}</span>
                            {item.modes.slice(0, 1).map((mode) => (
                              <span key={mode}>{mode}</span>
                            ))}
                          </span>
                        </span>
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
                      <h3>{connector.name}</h3>
                    </div>
                    <label className="source-field">
                      <span className="source-field__label">{t('sources.create.idLabel')}</span>
                      <Input
                        value={sourceId}
                        placeholder={t('sources.create.idPlaceholder')}
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
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t('sources.create.cancel')}
          </Button>
          {view === 'form' && (
            <Button
              size="sm"
              type="button"
              disabled={connector === null || schema === null || submitting}
              onClick={() => void submit()}
            >
              {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? t('sources.create.submitting') : t('sources.create.submit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
