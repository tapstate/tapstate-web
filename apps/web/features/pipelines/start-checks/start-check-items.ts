import type { TFunction } from 'i18next'

import type { CheckItem, CheckTone } from '@/components/checks/check-list'
import type { StartCheckFinding } from '@/service/pipelines/pipeline-client'

import {
  changeLine,
  findingBehavior,
  isKnownBehavior,
  type StartCheckBehavior,
} from './start-check-model'

const behaviorTones: Record<StartCheckBehavior, CheckTone> = {
  BLOCK: 'blocking',
  CONFIRM: 'question',
  WARN: 'warning',
  PASS: 'passed',
}

/**
 * A finding as a check-list item. Every text is shown exactly as the server rendered it, and the
 * values of open sets (subject kind, check, evaluation, an unknown behavior) are shown as written.
 */
export function startCheckItem(finding: StartCheckFinding, t: TFunction): CheckItem {
  const behavior = findingBehavior(finding)
  return {
    id: finding.key,
    tone: behaviorTones[behavior],
    toneLabel: t(`pipelines.startChecks.behavior.${behavior}`),
    title: finding.subject.label,
    meta:
      finding.evaluation === 'UNAVAILABLE'
        ? []
        : [
            finding.subject.kind,
            ...(behavior === 'BLOCK' ? [] : [finding.check, finding.evaluation]),
            ...(isKnownBehavior(finding) ? [] : [finding.behavior]),
          ],
    message:
      finding.evaluation === 'UNAVAILABLE'
        ? t('pipelines.startChecks.temporarilyUnavailable')
        : finding.message,
  }
}

/**
 * A question with its answers as choices. An answer is styled from `destructive` and previews its
 * `changes`; its kind is shown as text and never decides anything.
 */
export function startCheckQuestion(
  finding: StartCheckFinding,
  selected: string | undefined,
  t: TFunction,
): CheckItem {
  return {
    ...startCheckItem(finding, t),
    choiceLabel: t('pipelines.startChecks.choiceLabel', { subject: finding.subject.label }),
    selected: selected ?? null,
    choices: finding.actions.map((action) => ({
      value: action.id,
      label: action.message,
      detail: action.kind,
      destructive: action.destructive,
      preview: action.changes.map(changeLine),
    })),
  }
}
