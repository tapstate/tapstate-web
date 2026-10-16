import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ConnectionTestCheck, ConnectionTestReport } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
      <section
        className="border-destructive/30 bg-destructive/5 overflow-hidden rounded-lg border text-[13px] leading-relaxed"
        role="alert"
      >
        <div className="flex items-start gap-2 px-3 py-3">
          <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-foreground font-medium">{t('sources.test.failed')}</p>
            <p className="text-foreground">{summary}</p>
            {timedOut && (
              <p className="text-muted-foreground">{t('sources.test.errors.timeoutHint')}</p>
            )}
          </div>
        </div>
        {clientError && (clientError.code || technicalDetail || clientError.message) && (
          <details className="border-destructive/15 bg-background/70 border-t px-3 py-2.5">
            <summary className="text-muted-foreground focus-visible:ring-ring cursor-pointer rounded-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
              {t('sources.test.errors.technicalDetails')}
            </summary>
            <dl className="text-muted-foreground mt-2 grid gap-1.5 break-words">
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
                  <dd className="inline font-mono text-[12px]">{technicalDetail}</dd>
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
    <section
      aria-live="polite"
      className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed ${
        passed
          ? 'border-primary/30 bg-primary/5 text-foreground'
          : 'border-destructive/30 bg-destructive/10 text-foreground'
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {passed ? (
          <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden="true" />
        )}
        <span>{t(passed ? 'sources.test.passed' : 'sources.test.failed')}</span>
      </div>
      {report.checks.length > 0 && (
        <ul className="border-border grid gap-1.5 border-t pt-2">
          {report.checks.map((check) => {
            const detail = checkDetail(check)
            return (
              <li key={`${check.name}:${check.status}`} className="grid gap-0.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">{check.name}</span>
                  <span
                    className={
                      check.status === 'FAILED'
                        ? 'text-destructive shrink-0'
                        : 'text-muted-foreground shrink-0'
                    }
                  >
                    {t(`sources.test.status.${check.status.toLowerCase()}`)}
                  </span>
                </span>
                {detail && <span className="text-muted-foreground">{detail}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[560px]"
      >
        <DialogHeader>
          <DialogTitle>{t('sources.test.title')}</DialogTitle>
          <DialogDescription>{t('sources.test.description')}</DialogDescription>
        </DialogHeader>
        <ConnectionTestResult report={report} error={error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('ask.actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
