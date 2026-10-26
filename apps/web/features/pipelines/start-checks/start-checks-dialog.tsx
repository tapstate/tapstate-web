import { ChevronDown, ChevronUp, LoaderCircle, Play, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CheckList, type CheckGroup } from '@/components/checks/check-list'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import type { StartChecksDialogState, StartChecksSession } from './use-start-pipeline'

import { startCheckItem, startCheckQuestion } from './start-check-items'
import {
  canStart,
  choicesFrom,
  decisionLine,
  groupFindings,
  startBlocked,
  startDecisions,
  type StartChoices,
} from './start-check-model'
import { StartCheckPlan } from './start-check-plan'

const plainText = 'text-muted-foreground font-mono text-[11px] leading-relaxed break-words'

/** Holds the answers being picked; a new report remounts it so answers are taken afresh. */
function StartChecksBody({
  session,
  onConfirm,
  onCancel,
  onRecheck,
}: {
  session: StartChecksSession
  onConfirm: StartChecksDialogState['onConfirm']
  onCancel: StartChecksDialogState['onCancel']
  onRecheck: StartChecksDialogState['onRecheck']
}) {
  const { t } = useTranslation()
  const [choices, setChoices] = useState<StartChoices>(() => choicesFrom(session.decisions))
  const [showPassed, setShowPassed] = useState(false)
  const { pipelineId, report, submitting } = session
  const findings = groupFindings(report)
  const blocked = startBlocked(report)
  const unavailable = report.findings.filter((finding) => finding.evaluation === 'UNAVAILABLE')
  const groups: CheckGroup[] = [
    {
      id: 'block',
      title: t('pipelines.startChecks.groups.block'),
      items: findings.block.map((finding) => startCheckItem(finding, t)),
    },
    {
      id: 'confirm',
      title: t('pipelines.startChecks.groups.confirm'),
      items: findings.confirm.map((finding) =>
        startCheckQuestion(finding, choices[finding.key], t),
      ),
    },
    {
      id: 'warn',
      title: t('pipelines.startChecks.groups.warn'),
      items: findings.warn.map((finding) => startCheckItem(finding, t)),
    },
  ]
  const description = blocked
    ? unavailable.length > 0
      ? 'pipelines.startChecks.descriptionUnavailable'
      : 'pipelines.startChecks.descriptionBlocked'
    : findings.confirm.length > 0
      ? 'pipelines.startChecks.descriptionConfirm'
      : 'pipelines.startChecks.descriptionReady'

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('pipelines.startChecks.title', { id: pipelineId })}</AlertDialogTitle>
        <AlertDialogDescription>{t(description)}</AlertDialogDescription>
      </AlertDialogHeader>

      {/* Only the findings scroll, so the question stays titled and Cancel / Start stay in reach. */}
      <div className="-mx-4 grid min-h-0 flex-1 gap-4 overflow-y-auto px-4" data-start-checks-body>
        {session.changedWhileConfirming ? (
          <p
            role="alert"
            className="border-warning/40 bg-warning/10 text-foreground flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] leading-relaxed"
            data-start-checks-changed
          >
            <TriangleAlert className="text-warning mt-1 size-3.5 shrink-0" aria-hidden="true" />
            <span>{t('pipelines.startChecks.changedWhileConfirming', { id: pipelineId })}</span>
          </p>
        ) : null}

        {session.staleDecisions.length > 0 ? (
          <div className="grid gap-1" data-start-checks-stale>
            <p className="text-muted-foreground text-xs font-medium">
              {t('pipelines.startChecks.staleTitle')}
            </p>
            <ul className="grid">
              {session.staleDecisions.map((decision) => (
                <li key={`${decision.finding}:${decision.action}`} className={plainText}>
                  {decisionLine(decision)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <CheckList
          groups={groups}
          disabled={submitting}
          onChoose={(findingKey, actionId) =>
            setChoices((current) => ({ ...current, [findingKey]: actionId }))
          }
        />

        {findings.pass.length > 0 ? (
          <div className="grid gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 justify-self-start"
              aria-expanded={showPassed}
              onClick={() => setShowPassed((current) => !current)}
            >
              {showPassed ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              {showPassed
                ? t('pipelines.startChecks.hidePassed')
                : t('pipelines.startChecks.showPassed', { count: findings.pass.length })}
            </Button>
            {showPassed ? (
              <CheckList
                groups={[
                  {
                    id: 'pass',
                    title: t('pipelines.startChecks.groups.pass'),
                    items: findings.pass.map((finding) => startCheckItem(finding, t)),
                  },
                ]}
              />
            ) : null}
          </div>
        ) : null}

        {session.recheckFailed ? (
          <p role="alert">{t('pipelines.startChecks.recheckFailed')}</p>
        ) : null}
        {unavailable.length > 0 ? (
          <details>
            <summary className="text-muted-foreground cursor-pointer text-[13px]">
              {t('pipelines.startChecks.details')}
            </summary>
            {unavailable.map((finding) => (
              <p key={finding.key} className={plainText}>
                {finding.check} · {finding.evaluation} · {finding.message}
              </p>
            ))}
          </details>
        ) : null}
        {report.plan.length > 0 ? <StartCheckPlan plan={report.plan} /> : null}
      </div>

      <AlertDialogFooter>
        {blocked ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="px-3 text-[13px]"
              disabled={submitting}
              onClick={onCancel}
            >
              {t('pipelines.startChecks.close')}
            </Button>
            {unavailable.length > 0 && onRecheck ? (
              <Button
                type="button"
                disabled={submitting}
                aria-busy={submitting}
                onClick={onRecheck}
              >
                {t(
                  submitting ? 'pipelines.startChecks.rechecking' : 'pipelines.startChecks.recheck',
                )}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="px-3 text-[13px]"
              disabled={submitting}
              onClick={onCancel}
            >
              {t('pipelines.startChecks.cancel')}
            </Button>
            <Button
              type="button"
              className="px-3 text-[13px]"
              disabled={submitting || !canStart(report, choices)}
              aria-busy={submitting}
              onClick={() => onConfirm(startDecisions(report, choices))}
            >
              {submitting ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
              {submitting ? t('pipelines.startChecks.starting') : t('pipelines.startChecks.start')}
            </Button>
          </>
        )}
      </AlertDialogFooter>
    </>
  )
}

/**
 * Asks the start-check questions a start stopped on. A blocked start offers only Close; otherwise
 * Start stays disabled until every question has an answer.
 */
export function StartChecksDialog({
  open,
  session,
  onConfirm,
  onCancel,
  onRecheck,
}: StartChecksDialogState) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
    >
      <AlertDialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-[560px]"
        data-testid="start-checks-dialog"
      >
        {session ? (
          <StartChecksBody
            key={session.version}
            session={session}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onRecheck={onRecheck}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
