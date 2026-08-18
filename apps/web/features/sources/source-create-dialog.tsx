import { AlertCircle, Check, Database, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorDetail, ConnectorSummary, SourceView } from '@/service/source-client'

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
  SelectGroup,
} from '@/components/ui/select'
import {
  createSource,
  getConnector,
  listConnectors,
  SourceClientError,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectorFormily } from './connector-formily'
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
  const [sourceId, setSourceId] = useState('')
  const [connectorId, setConnectorId] = useState('')
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
    setSourceMode('')
    setConnector(null)
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
    setSourceMode('')
    setConfig({})
    setFieldErrors({})
    setRequestError('')
    if (!connectorId) return

    setLoadingConnector(true)
    getConnector(connectorId, apiFetch)
      .then((detail) => {
        setConnector(detail)
        setConfig(createInitialConfig(detail.config))
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
    if (Object.keys(nextErrors).length > 0 || connector === null) {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeDisabled={submitting}
        closeLabel={t('ask.actions.close')}
        className="source-create-dialog sm:max-w-[680px]"
      >
        <DialogHeader className="source-create-dialog__header mb-5">
          <span className="source-create-dialog__icon">
            <Database size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>{t('sources.create.title')}</DialogTitle>
            <DialogDescription>{t('sources.create.subtitle')}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="source-create-dialog__body">
          {requestError && (
            <div className="source-create-dialog__alert" role="alert">
              <AlertCircle size={16} />
              <span>{requestError}</span>
            </div>
          )}

          <div className="source-create-dialog__identity">
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

            <label className="source-field">
              <span className="source-field__label">{t('sources.create.connectorLabel')}</span>
              <Select
                value={connectorId}
                disabled={loadingConnectors}
                onValueChange={(value) => {
                  if (value === null) return
                  setConnectorId(value)
                  setFieldErrors((current) => ({ ...current, connector: '' }))
                }}
              >
                <SelectTrigger aria-label={t('sources.create.connectorLabel')}>
                  <SelectValue placeholder={t('sources.create.connectorPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {connectors.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors.connector && (
                <span className="source-field__error">{fieldErrors.connector}</span>
              )}
            </label>
          </div>

          {loadingConnector && (
            <div className="source-create-dialog__loading">
              <LoaderCircle className="animate-spin" size={18} />
              {t('sources.create.loadingSchema')}
            </div>
          )}

          {!loadingConnector && connector && (
            <>
              <div className="source-create-dialog__section-heading">
                <div>
                  <h3>{t('sources.create.connectionTitle')}</h3>
                  <p>{t('sources.create.connectionSubtitle', { connector: connector.name })}</p>
                </div>
                <span className="source-create-dialog__origin">
                  <Check size={13} /> {connector.origin}
                </span>
              </div>

              {connector.modes.length > 0 && (
                <label className="source-field">
                  <span className="source-field__label">{t('sources.create.modeLabel')}</span>
                  <Select
                    value={sourceMode}
                    onValueChange={(value) => {
                      if (value === null) return
                      setSourceMode(value)
                    }}
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

              {connector.config.length > 0 ? (
                <ConnectorFormily
                  fields={connector.config}
                  resetKey={connector.id}
                  initialValues={config}
                  errors={fieldErrors}
                  disabled={submitting}
                  onValuesChange={setConfig}
                />
              ) : (
                <div className="source-create-dialog__no-fields">
                  {t('sources.create.noConfig')}
                </div>
              )}
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
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            type="button"
            disabled={connector === null || submitting}
            onClick={() => void submit()}
          >
            {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? t('sources.create.submitting') : t('sources.create.submit')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
