import { ChevronDown, ChevronUp, LoaderCircle, Play, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { StartCheckPlanEntry } from '@/service/pipelines/pipeline-client'

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

const plainText = 'text-muted-foreground font-mono text-[11px] leading-relaxed break-words'

function StartCheckPlan({ plan }: { plan: readonly StartCheckPlanEntry[] }) {
  const { t } = useTranslation()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid gap-2" data-start-check-plan>
      <h3 id={headingId} className="text-muted-foreground text-xs font-medium">
        {t('pipelines.startChecks.plan.title')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">{t('pipelines.startChecks.plan.target')}</th>
              <th className="py-1 pr-3 font-medium">{t('pipelines.startChecks.plan.load')}</th>
              <th className="py-1 font-medium">{t('pipelines.startChecks.plan.onFullLoad')}</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {plan.map((entry) => (
              <tr key={`${entry.element}:${entry.target.connection}:${entry.target.table}`}>
                <td className="py-2 pr-3 align-top">
                  <span className="text-foreground block font-medium break-words">
                    {entry.element}
                  </span>
                  <span className={`block ${plainText}`}>
                    {entry.target.connection} / {entry.target.table}
                  </span>
                </td>
                <td className={`py-2 pr-3 align-top ${plainText}`}>{entry.load}</td>
                <td className={`py-2 align-top ${plainText}`}>{entry.onFullLoad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Holds the answers being picked; a new report remounts it so answers are taken afresh. */
function StartChecksBody({
  session,
  onConfirm,
  onCancel,
}: {
  session: StartChecksSession
  onConfirm: StartChecksDialogState['onConfirm']
  onCancel: StartChecksDialogState['onCancel']
}) {
  const { t } = useTranslation()
  const [choices, setChoices] = useState<StartChoices>(() => choicesFrom(session.decisions))
  const [showPassed, setShowPassed] = useState(false)
  const { pipelineId, report, submitting } = session
  const findings = groupFindings(report)
  const blocked = startBlocked(report)
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
    ? 'pipelines.startChecks.descriptionBlocked'
    : findings.confirm.length > 0
      ? 'pipelines.startChecks.descriptionConfirm'
      : 'pipelines.startChecks.descriptionReady'

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('pipelines.startChecks.title', { id: pipelineId })}</AlertDialogTitle>
        <AlertDialogDescription>{t(description)}</AlertDialogDescription>
      </AlertDialogHeader>

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
            className="justify-self-start"
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

      {report.plan.length > 0 ? <StartCheckPlan plan={report.plan} /> : null}

      <AlertDialogFooter>
        {blocked ? (
          <Button type="button" variant="outline" className="px-3 text-[13px]" onClick={onCancel}>
            {t('pipelines.startChecks.close')}
          </Button>
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
export function StartChecksDialog({ open, session, onConfirm, onCancel }: StartChecksDialogState) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
    >
      <AlertDialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[560px]"
        data-testid="start-checks-dialog"
      >
        {session ? (
          <StartChecksBody
            key={session.version}
            session={session}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
