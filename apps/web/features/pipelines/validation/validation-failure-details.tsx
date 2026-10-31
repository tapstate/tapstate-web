import { Button } from '@tapstate-web/ui/button'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ValidationReport } from '@/service/pipelines/validation-client'

export function ValidationFailureDetails({
  failure,
  terminal,
}: {
  failure: ValidationReport['failure']
  terminal?: ValidationReport['terminal']
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const cancelled =
    terminal === 'STOPPED' && failure?.code === 'validation.execution-cancelled' && !failure.fatal
  const text = failure?.technical ?? null
  const available = text !== null && text.length > 0
  async function copy() {
    if (!available) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }
  return (
    <section
      className="validation-failure space-y-4"
      aria-label={t('dataValidation.failure.title')}
    >
      <div
        role={cancelled ? 'status' : 'alert'}
        className={`border-divider-subtle rounded-xl border p-4 ${cancelled ? 'text-text-secondary bg-background-section' : 'text-text-destructive'}`}
      >
        <h3 className="system-sm-semibold">
          {cancelled
            ? t('dataValidation.failure.cancelled')
            : failure
              ? (failure.message ?? failure.code ?? failure.exceptionType)
              : t('dataValidation.failure.missingDetails')}
        </h3>
        {failure && (
          <p className="system-xs-regular mt-2 break-words">
            {failure.code} · {failure.exceptionType}
          </p>
        )}
      </div>
      <div className="border-divider-subtle relative border-y py-3">
        <Button
          size="small"
          variant="secondary"
          className="absolute top-2 right-0"
          disabled={!available}
          onClick={() => void copy()}
        >
          {t('dataValidation.failure.copy')}
        </Button>
        <details>
          <summary className="system-sm-medium cursor-pointer py-2 pr-44">
            {t('dataValidation.failure.stack')}
          </summary>
          {available ? (
            <pre
              tabIndex={0}
              aria-label={t('dataValidation.failure.stackText')}
              className="system-xs-regular bg-background-section-burn border-divider-subtle mt-3 max-h-[360px] overflow-auto rounded-lg border p-4 font-mono break-normal whitespace-pre [tab-size:4]"
            >
              {text}
            </pre>
          ) : (
            <p className="system-sm-regular text-text-secondary mt-3">
              {t('dataValidation.failure.unavailable')}
            </p>
          )}
        </details>
      </div>
      {copied && (
        <p role="status" className="system-xs-regular text-text-secondary">
          {t(`dataValidation.failure.${copied}`)}
        </p>
      )}
    </section>
  )
}
