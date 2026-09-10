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

interface ConnectionTestResultProps {
  report: ConnectionTestReport | null
  error: string
}

function checkDetail(check: ConnectionTestCheck) {
  return check.message ?? check.reason ?? check.solution ?? null
}

export function ConnectionTestResult({ report, error }: ConnectionTestResultProps) {
  const { t } = useTranslation()

  if (error) {
    return (
      <div
        className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed"
        role="alert"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
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
  const open = report !== null || Boolean(error)

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
