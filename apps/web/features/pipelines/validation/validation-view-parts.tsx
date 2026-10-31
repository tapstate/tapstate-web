import { useTranslation } from 'react-i18next'

import { PipelineClientError } from '@/service/pipelines/pipeline-client'

export function validationMetadataBusy(error: unknown): error is PipelineClientError {
  return (
    error instanceof PipelineClientError &&
    error.kind === 'server' &&
    error.status === 429 &&
    error.code === 'validation.value-limit-exceeded' &&
    error.params.limit === 'validation.metadataFrames'
  )
}

/** Only fresh save attempts may use these refusals to disprove a write; replay/readback stays uncertain. */
export function validationSavePrewriteRefusal(error: unknown): boolean {
  return (
    validationMetadataBusy(error) ||
    (error instanceof PipelineClientError &&
      error.kind === 'server' &&
      error.status === 400 &&
      error.code === 'validation.rule-unsupported')
  )
}

export function ValidationRequestError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const known = error instanceof PipelineClientError ? error : null
  const busy = validationMetadataBusy(error)
  return (
    <div
      role="alert"
      className="system-sm-regular text-text-destructive bg-background-section-burn my-3 space-y-2 rounded-lg p-3 break-words"
    >
      <p>
        {busy
          ? t('dataValidation.metadataBusy')
          : known?.kind === 'server'
            ? known.message
            : t('dataValidation.requestFailed')}
      </p>
      {known && (
        <details className="system-xs-regular">
          <summary className="cursor-pointer">{t('dataValidation.technicalDetails')}</summary>
          <p className="mt-2 font-mono">
            {known.code ?? known.kind}
            {known.status == null ? '' : ` · HTTP ${known.status}`}
          </p>
          {(known.kind !== 'server' || busy) && (
            <p className="mt-2 whitespace-pre-wrap">{known.message}</p>
          )}
        </details>
      )}
    </div>
  )
}

export function ValidationProgressReadError({
  error,
  hasObservation,
}: {
  error: unknown
  hasObservation: boolean
}) {
  const { t } = useTranslation()
  if (!validationMetadataBusy(error)) return <ValidationRequestError error={error} />
  return (
    <div
      role="status"
      className="system-sm-regular text-text-secondary border-divider-subtle my-3 space-y-2 rounded-lg border p-3 break-words"
    >
      <p>
        {t(hasObservation ? 'dataValidation.run.refreshBusy' : 'dataValidation.run.waitingBusy')}
      </p>
      <details className="system-xs-regular">
        <summary className="cursor-pointer">{t('dataValidation.technicalDetails')}</summary>
        <p className="mt-2 font-mono">
          {error.code} · HTTP {error.status}
        </p>
        <p className="mt-2 font-mono">{String(error.params.limit)}</p>
        <p className="mt-2 whitespace-pre-wrap">{error.message}</p>
      </details>
    </div>
  )
}
