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
