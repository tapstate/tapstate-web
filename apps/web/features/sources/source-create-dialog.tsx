import type { ISchema } from '@formily/json-schema'

import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@langgenius/dify-ui/dialog'
import { Input } from '@langgenius/dify-ui/input'
import RadioCard from '@langgenius/dify-ui/radio-card'
import { RadioGroup } from '@langgenius/dify-ui/radio-group'
import { SearchInput } from '@langgenius/dify-ui/search-input'
import { AlertCircle, ArrowLeft, Check, Database, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  ConnectionTestReport,
  ConnectorDetail,
  ConnectorSummary,
  SourceView,
} from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import {
  createSource,
  getConnector,
  listConnectors,
  SourceClientError,
  testConnection,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

import { ConnectionTestResultDialog } from './connection-test-result'
import { ConnectorFormily } from './connector-formily'
import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
  normalizeConnectorConfigFields,
  normalizeConnectorConfigValues,
} from './connector-spec-formily-schema'
import { buildSourceConfig, createInitialConfig, type SourceConfigState } from './source-form'

interface SourceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
  initialConnectorId?: string | null
}

type CreateSourceStep = 'select' | 'configure'

function errorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (!(error instanceof SourceClientError)) return t('sources.create.errors.unknown')
  if (error.kind === 'network') return t('sources.create.errors.network')
  if (error.code === 'source.already-exists') return t('sources.create.errors.exists')
  return t('sources.create.errors.server')
}

function RequestError({ message }: { message: string }) {
  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function ConnectorEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-lg">
          <span className="border-divider-regular bg-components-card-bg flex size-full min-w-px items-center justify-center overflow-hidden rounded-xl border border-dashed p-1">
            <span className="i-ri-database-2-line text-text-tertiary size-6" aria-hidden="true" />
          </span>
        </span>
        <p className="system-sm-regular text-text-tertiary">{message}</p>
      </div>
    </div>
  )
}

export function SourceCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialConnectorId,
}: SourceCreateDialogProps) {
  const { i18n, t } = useTranslation()
  const currentLocale = i18n.resolvedLanguage ?? i18n.language
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([])
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [connectorId, setConnectorId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [step, setStep] = useState<CreateSourceStep>('select')
  const [sourceMode, setSourceMode] = useState('')
  const [config, setConfig] = useState<SourceConfigState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadingConnectors, setLoadingConnectors] = useState(false)
  const [loadingConnector, setLoadingConnector] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testReport, setTestReport] = useState<ConnectionTestReport | null>(null)
  const [testError, setTestError] = useState<unknown>(null)
  const connectorButtonRefs = useRef<Record<string, HTMLElement | null>>({})
  const initializedForOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false
      return
    }
    if (initializedForOpen.current) return
    initializedForOpen.current = true
    setSourceId('')
    setConnectorId(initialConnectorId ?? '')
    setSearchTerm('')
    setStep(initialConnectorId ? 'configure' : 'select')
    setSourceMode('')
    setConnector(null)
    setSchema(null)
    setConfig({})
    setFieldErrors({})
    setRequestError('')
    setTestReport(null)
    setTestError(null)
    if (connectors.length === 0) {
      setLoadingConnectors(true)
      listConnectors(apiFetch)
        .then(setConnectors)
        .catch((error) => setRequestError(errorMessage(error, t)))
        .finally(() => setLoadingConnectors(false))
    }
  }, [apiFetch, connectors.length, initialConnectorId, open, t])

  useEffect(() => {
    if (!open) return
    setConnector(null)
    setSchema(null)
    setSourceMode('')
    setConfig({})
    setFieldErrors({})
    setRequestError('')
    setTestReport(null)
    setTestError(null)
    if (!connectorId || step !== 'configure') return

    setLoadingConnector(true)
    let cancelled = false
    getConnector(connectorId, apiFetch)
      .then((detail) => {
        if (cancelled) return
        if (detail.spec.text === null) {
          setRequestError(t('sources.create.errors.specUnavailable'))
          return
        }
        try {
          const normalizedFields = normalizeConnectorConfigFields(detail.id, detail.config)
          const nextSchema = connectorSpecConnectionSchema(
            detail.spec.text,
            currentLocale,
            detail.id,
          )
          const initialValues = normalizeConnectorConfigValues(
            detail.id,
            connectorSpecInitialValues(detail.spec.text, detail.id),
          )
          setSchema(nextSchema)
          setConfig({ ...createInitialConfig(normalizedFields), ...initialValues })
          setConnector({ ...detail, config: normalizedFields })
        } catch {
          setRequestError(t('sources.create.errors.specInvalid'))
          return
        }
        setSourceMode(detail.modes[0] ?? '')
      })
      .catch((error) => {
        if (!cancelled) setRequestError(errorMessage(error, t))
      })
      .finally(() => {
        if (!cancelled) setLoadingConnector(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiFetch, connectorId, currentLocale, open, step, t])

  function connectionDraft() {
    const nextErrors: Record<string, string> = {}

    if (!sourceId.trim()) nextErrors.id = t('sources.create.validation.required')
    else if (sourceId.includes('.')) nextErrors.id = t('sources.create.validation.id')
    if (!connectorId) nextErrors.connector = t('sources.create.validation.required')
    if (Object.keys(nextErrors).length > 0 || connector === null || schema === null) {
      setFieldErrors(nextErrors)
      return null
    }

    const result = buildSourceConfig(connector.config, config)
    for (const [name, code] of Object.entries(result.errors))
      nextErrors[name] = t(`sources.create.validation.${code}`)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return null
    }

    return { id: sourceId.trim(), connectorId, settings: result.config }
  }

  async function submit() {
    setRequestError('')
    const draft = connectionDraft()
    if (!draft) return

    setSubmitting(true)
    try {
      const created = await createSource(
        {
          id: draft.id,
          connector: draft.connectorId,
          config: draft.settings,
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

  async function runConnectionTest() {
    setTestError(null)
    setTestReport(null)
    const draft = connectionDraft()
    if (!draft) return

    setTesting(true)
    try {
      setTestReport(await testConnection(draft, apiFetch))
    } catch (error) {
      setTestError(error)
    } finally {
      setTesting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if ((submitting || testing) && !nextOpen) return
    onOpenChange(nextOpen)
  }

  function chooseConnector(id: string) {
    setConnectorId(id)
    setFieldErrors((current) => ({ ...current, connector: '' }))
    setRequestError('')
    setTestReport(null)
    setTestError(null)
    setStep('configure')
  }

  function chooseAnotherConnector() {
    if (submitting || testing) return
    const previousConnectorId = connectorId
    setConnectorId('')
    setConnector(null)
    setSchema(null)
    setConfig({})
    setRequestError('')
    setTestReport(null)
    setTestError(null)
    setStep('select')
    requestAnimationFrame(() => connectorButtonRefs.current[previousConnectorId]?.focus())
  }

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase()
  const sourceConnectors =
    getDeploymentProfile() === 'cloud'
      ? connectors.filter((item) => item.id !== 'mongodb-atlas')
      : connectors
  const visibleConnectors = normalizedSearch
    ? sourceConnectors.filter((item) =>
        [item.name, item.id, item.group, ...item.modes].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        ),
      )
    : sourceConnectors
  const selectedConnector = connectors.find((item) => item.id === connectorId)
  const configuredConnectorName = connector?.name ?? selectedConnector?.name

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-slot="dialog-content"
        className={cn(
          'flex max-w-none flex-col gap-0 overflow-hidden p-0 shadow-xl',
          step === 'select'
            ? 'h-[min(560px,calc(100dvh-2rem))] w-[min(760px,calc(100vw-2rem))]'
            : 'h-[min(800px,calc(100dvh-2rem))] w-[min(1120px,calc(100vw-2rem))]',
        )}
      >
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('sources.create.chooseConnector')}</DialogTitle>
              <DialogCloseButton
                disabled={submitting || testing}
                aria-label={t('ask.actions.close')}
              />
            </DialogHeader>

            <DialogBody className="bg-components-panel-bg flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
              <section
                className="flex min-h-0 flex-1 flex-col gap-4"
                aria-label={t('sources.create.chooseConnector')}
              >
                <div className="w-full max-w-[400px]">
                  <SearchInput
                    value={searchTerm}
                    placeholder={t('sources.create.searchConnectors')}
                    aria-label={t('sources.create.searchConnectors')}
                    clearLabel={t('sources.create.clearSearch')}
                    onValueChange={setSearchTerm}
                  />
                </div>

                {loadingConnectors ? (
                  <div className="system-sm-regular text-text-tertiary flex min-h-24 flex-1 items-center justify-center gap-2">
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                    {t('sources.create.loadingConnectors')}
                  </div>
                ) : requestError ? (
                  <ConnectorEmptyState message={requestError} />
                ) : sourceConnectors.length === 0 ? (
                  <ConnectorEmptyState message={t('sources.create.noConnectors')} />
                ) : visibleConnectors.length === 0 ? (
                  <ConnectorEmptyState message={t('sources.create.noMatchingConnectors')} />
                ) : (
                  <RadioGroup
                    aria-label={t('sources.create.chooseConnector')}
                    value={connectorId}
                    onValueChange={chooseConnector}
                    className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {visibleConnectors.map((item) => (
                      <RadioCard
                        key={item.id}
                        value={item.id}
                        icon={
                          <ConnectorIcon
                            connectorId={item.id}
                            name={item.name}
                            iconPath={item.icon}
                            size={24}
                            className="border-divider-regular bg-text-primary-on-surface size-6 rounded-md border-[0.5px]"
                          />
                        }
                        iconBgClassName="bg-components-panel-on-panel-item-bg"
                        title={item.name}
                        description={item.group || item.id}
                        className={cn(
                          'h-full transition-[border-color,background-color,box-shadow]',
                          'hover:border-components-option-card-option-border-hover hover:bg-components-option-card-option-bg-hover hover:shadow-md',
                        )}
                        ref={(element) => {
                          connectorButtonRefs.current[item.id] = element
                        }}
                      />
                    ))}
                  </RadioGroup>
                )}

                {fieldErrors.connector && (
                  <span className="text-destructive text-[12px] leading-relaxed">
                    {fieldErrors.connector}
                  </span>
                )}
              </section>
            </DialogBody>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="medium"
                  type="button"
                  disabled={submitting || testing}
                  aria-label={t('sources.create.chooseAnother')}
                  className="size-8 shrink-0 p-0"
                  onClick={chooseAnotherConnector}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <span className="bg-border hidden h-5 w-px shrink-0 sm:block" aria-hidden="true" />
                {selectedConnector && (
                  <ConnectorIcon
                    connectorId={selectedConnector.id}
                    name={selectedConnector.name}
                    iconPath={selectedConnector.icon}
                    size={24}
                    className="hidden size-6 shrink-0 sm:block"
                  />
                )}
                <DialogTitle>
                  {configuredConnectorName ?? t('sources.create.connectionTitle')}
                </DialogTitle>
              </div>
              <DialogCloseButton
                disabled={submitting || testing}
                aria-label={t('ask.actions.close')}
              />
            </DialogHeader>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                  <section className="mx-auto grid w-full max-w-3xl gap-6 p-6 lg:p-8">
                    {requestError && <RequestError message={requestError} />}

                    {loadingConnector ? (
                      <div className="text-muted-foreground flex min-h-24 items-center justify-center gap-2 text-[13px]">
                        <LoaderCircle className="size-4 animate-spin" />
                        {t('sources.create.loadingSchema')}
                      </div>
                    ) : connector && schema ? (
                      <>
                        <label className="source-field">
                          <span className="source-field__label">{t('sources.create.idLabel')}</span>
                          <span className="source-field__hint">{t('sources.create.idHint')}</span>
                          <Input
                            value={sourceId}
                            disabled={submitting || testing}
                            aria-invalid={Boolean(fieldErrors.id)}
                            onChange={(event) => {
                              setSourceId(event.target.value)
                              setFieldErrors((current) => ({ ...current, id: '' }))
                              setTestReport(null)
                              setTestError(null)
                            }}
                          />
                          {fieldErrors.id ? (
                            <span className="source-field__error">{fieldErrors.id}</span>
                          ) : null}
                        </label>

                        {connector.modes.length > 1 && (
                          <div className="source-field">
                            <span className="source-field__label">
                              {t('sources.create.modeLabel')}
                            </span>
                            <div
                              className="border-border bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border p-1"
                              role="group"
                              aria-label={t('sources.create.modeLabel')}
                            >
                              {connector.modes.map((mode) => {
                                const selected = sourceMode === mode
                                return (
                                  <Button
                                    key={mode}
                                    type="button"
                                    variant={selected ? 'secondary' : 'ghost'}
                                    size="small"
                                    aria-pressed={selected}
                                    disabled={submitting || testing}
                                    className={`h-11 shrink-0 rounded-md px-5 text-[13px] font-medium sm:h-8 sm:px-3 ${
                                      selected
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={() => {
                                      setSourceMode(mode)
                                      setTestReport(null)
                                      setTestError(null)
                                    }}
                                  >
                                    {mode}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <ConnectorFormily
                          fields={connector.config}
                          schema={schema}
                          resetKey={`${connector.id}:${connector.spec.contentHash}`}
                          initialValues={config}
                          errors={fieldErrors}
                          disabled={submitting || testing}
                          onValuesChange={(values) => {
                            setConfig(values)
                            setTestReport(null)
                            setTestError(null)
                          }}
                        />
                      </>
                    ) : null}
                  </section>
                </div>

                <footer className="border-border bg-background shrink-0 border-t px-6 pb-4 sm:px-8">
                  <div className="mx-auto flex w-full max-w-3xl justify-end gap-3 pt-4 sm:pt-6">
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={submitting || testing}
                      size="large"
                      onClick={() => onOpenChange(false)}
                    >
                      {t('sources.create.cancel')}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={connector === null || schema === null || submitting || testing}
                      size="large"
                      onClick={() => void runConnectionTest()}
                    >
                      {testing && <LoaderCircle className="size-4 animate-spin" />}
                      {testing ? t('sources.test.testing') : t('sources.test.action')}
                    </Button>
                    <Button
                      type="button"
                      disabled={connector === null || schema === null || submitting || testing}
                      variant="primary"
                      size="large"
                      onClick={() => void submit()}
                    >
                      {submitting && <LoaderCircle className="size-4 animate-spin" />}
                      {submitting ? t('sources.create.submitting') : t('sources.create.submit')}
                    </Button>
                  </div>
                </footer>
              </div>

              <aside className="border-border bg-background hidden w-[360px] shrink-0 overflow-y-auto border-l p-6 lg:block xl:w-[420px]">
                <div className="grid gap-5">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                      <Database className="size-4" />
                    </span>
                    <div className="grid gap-0.5">
                      <h3 className="text-foreground text-sm font-semibold">
                        {t('sources.create.documentationTitle')}
                      </h3>
                      {configuredConnectorName && (
                        <span className="text-muted-foreground text-[12px]">
                          {configuredConnectorName}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    {t('sources.create.documentationPlaceholder')}
                  </p>
                  {connector && (
                    <span className="text-muted-foreground inline-flex w-fit items-center gap-1.5 text-[12px]">
                      <Check className="size-3.5" />
                      {connector.origin}
                    </span>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
        <ConnectionTestResultDialog
          report={testReport}
          error={testError}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setTestReport(null)
              setTestError(null)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
