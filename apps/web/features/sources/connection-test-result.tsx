import { StatusDot } from '@langgenius/dify-ui/status-dot'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ConnectionTestCheck, ConnectionTestReport } from '@/service/source-client'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SourceClientError } from '@/service/source-client'

interface ConnectionTestResultProps {
  report: ConnectionTestReport | null
  error: unknown
}

function checkDetail(check: ConnectionTestCheck) {
  return check.message ?? check.reason ?? check.solution ?? null
}

function CheckResultRow({ check }: { check: ConnectionTestCheck }) {
  const { t } = useTranslation()
  const dotStatus =
    check.status === 'FAILED' ? 'error' : check.status === 'WARNING' ? 'warning' : 'success'

  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-1">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <p className="system-sm-medium text-text-primary min-w-0">{check.name}</p>
          <span
            className={`system-xs-medium inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${check.status === 'FAILED' ? 'text-text-destructive' : 'text-text-secondary'}`}
          >
            <StatusDot className="rounded-full" size="small" status={dotStatus} />
            {t(`sources.test.status.${check.status.toLowerCase()}`)}
          </span>
        </div>
        {checkDetail(check) && (
          <p className="system-xs-regular text-text-secondary mt-1 break-words">
            {checkDetail(check)}
          </p>
        )}
      </div>
    </li>
  )
}

export function ConnectionTestResult({ report, error }: ConnectionTestResultProps) {
  const { t } = useTranslation()

  if (error != null) {
    const clientError = error instanceof SourceClientError ? error : null
    const detail = clientError?.params.detail
    const technicalDetail = typeof detail === 'string' && detail.trim() ? detail : null
    const timedOut = technicalDetail != null && /timed out|timeout/i.test(technicalDetail)
    const summary = clientError
      ? clientError.code === 'connector.test-failed'
        ? t('sources.test.errors.connectorFailed')
        : t(`sources.test.errors.${clientError.kind}`)
      : t('sources.test.errors.unknown')

    return (
      <section className="bg-components-input-bg-normal grid gap-3 rounded-lg p-4" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="text-text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="system-sm-medium text-text-primary">{t('sources.test.failed')}</p>
            <p className="system-xs-regular text-text-secondary">{summary}</p>
            {timedOut && (
              <p className="system-xs-regular text-text-secondary">
                {t('sources.test.errors.timeoutHint')}
              </p>
            )}
          </div>
        </div>
        {clientError && (clientError.code || technicalDetail || clientError.message) && (
          <details className="border-divider-subtle border-t pt-3">
            <summary className="system-xs-medium text-text-secondary focus-visible:ring-state-accent-solid cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none">
              {t('sources.test.errors.technicalDetails')}
            </summary>
            <dl className="system-xs-regular text-text-secondary mt-2 grid gap-2 break-words">
              {clientError.code && (
                <div>
                  <dt className="inline font-medium">{t('sources.test.errors.code')}: </dt>
                  <dd className="inline font-mono">{clientError.code}</dd>
                </div>
              )}
              {typeof clientError.params.connector === 'string' && (
                <div>
                  <dt className="inline font-medium">{t('sources.test.errors.connector')}: </dt>
                  <dd className="inline">{clientError.params.connector}</dd>
                </div>
              )}
              {technicalDetail && (
                <div>
                  <dt className="inline font-medium">{t('sources.test.errors.detail')}: </dt>
                  <dd className="inline font-mono">{technicalDetail}</dd>
                </div>
              )}
              {clientError.message && (
                <div>
                  <dt className="inline font-medium">{t('sources.test.errors.serverMessage')}: </dt>
                  <dd className="inline">{clientError.message}</dd>
                </div>
              )}
            </dl>
          </details>
        )}
      </section>
    )
  }

  if (!report) return null

  const passed = report.outcome === 'PASSED'
  return (
    <div className="grid gap-4">
      <section className="flex items-start gap-3" role="status" aria-live="polite">
        {passed ? (
          <CheckCircle2 className="text-text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle
            className="text-text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
        )}
        <p className="system-sm-medium text-text-primary">
          {t(passed ? 'sources.test.passed' : 'sources.test.failed')}
        </p>
      </section>
      {report.checks.length > 0 && (
        <ul className="divide-divider-subtle bg-components-input-bg-normal divide-y rounded-lg px-3 py-2">
          {report.checks.map((check) => (
            <CheckResultRow key={`${check.name}:${check.status}`} check={check} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function ConnectionTestResultDialog({
  report,
  error,
  onOpenChange,
}: ConnectionTestResultProps & { onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const open = report !== null || error != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('ask.actions.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-[640px]"
      >
        <DialogHeader>
          <DialogTitle>{t('sources.test.title')}</DialogTitle>
          <DialogDescription>{t('sources.test.description')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4 px-6 py-5">
          <ConnectionTestResult report={report} error={error} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
