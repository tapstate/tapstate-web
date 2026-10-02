import type {
  StartCheckChange,
  StartCheckFinding,
  StartCheckReport,
  StartDecision,
  StartDecisionApplied,
} from '@/service/pipelines/pipeline-client'

/**
 * The behaviors a client acts on. Reports are rendered from what they say, never from which check
 * produced them, and anything that decides whether a start may go ahead fails closed: a behavior or
 * an outcome this client does not know refuses the start.
 */
export type StartCheckBehavior = 'BLOCK' | 'CONFIRM' | 'WARN' | 'PASS'

const KNOWN_BEHAVIORS: readonly string[] = ['BLOCK', 'CONFIRM', 'WARN', 'PASS']
const PROCEEDING_OUTCOMES: readonly string[] = ['READY', 'NEEDS_CONFIRMATION']

/** Answers by finding key: the action id picked for each question. */
export type StartChoices = Readonly<Record<string, string>>

export function isKnownBehavior(finding: StartCheckFinding) {
  return KNOWN_BEHAVIORS.includes(finding.behavior)
}

/** A finding's behavior, with a value this client does not know read as BLOCK. */
export function findingBehavior(finding: StartCheckFinding): StartCheckBehavior {
  return isKnownBehavior(finding) ? (finding.behavior as StartCheckBehavior) : 'BLOCK'
}

/** Whether nothing the person answers can let this start go ahead. */
export function startBlocked(report: StartCheckReport) {
  return (
    !PROCEEDING_OUTCOMES.includes(report.outcome) ||
    report.findings.some((finding) => findingBehavior(finding) === 'BLOCK')
  )
}

export interface StartCheckGroups {
  block: StartCheckFinding[]
  confirm: StartCheckFinding[]
  warn: StartCheckFinding[]
  pass: StartCheckFinding[]
}

/** Findings by what they ask of the person, each group in the report's order. */
export function groupFindings(report: StartCheckReport): StartCheckGroups {
  const groups: StartCheckGroups = { block: [], confirm: [], warn: [], pass: [] }
  for (const finding of report.findings) {
    const behavior = findingBehavior(finding)
    if (behavior === 'BLOCK') groups.block.push(finding)
    else if (behavior === 'CONFIRM') groups.confirm.push(finding)
    else if (behavior === 'WARN') groups.warn.push(finding)
    else groups.pass.push(finding)
  }
  return groups
}

export function warningFindings(report: StartCheckReport | null) {
  return report ? groupFindings(report).warn : []
}

function chosenAction(finding: StartCheckFinding, choices: StartChoices) {
  const actionId = choices[finding.key]
  return actionId === undefined ? undefined : finding.actions.find(({ id }) => id === actionId)
}

/** The questions still without an answer the finding offers. */
export function openQuestions(report: StartCheckReport, choices: StartChoices) {
  return groupFindings(report).confirm.filter((finding) => !chosenAction(finding, choices))
}

/** Whether the start can be sent: nothing refuses it and every question has an answer. */
export function canStart(report: StartCheckReport, choices: StartChoices) {
  return !startBlocked(report) && openQuestions(report, choices).length === 0
}

/** One answer per question, naming the finding and action exactly as the report does. */
export function startDecisions(report: StartCheckReport, choices: StartChoices): StartDecision[] {
  return groupFindings(report).confirm.flatMap((finding) => {
    const action = chosenAction(finding, choices)
    return action ? [{ finding: finding.key, action: action.id }] : []
  })
}

/**
 * Carries earlier answers into a report evaluated again. An answer stays where its question is still
 * asked and still offers that action; any other answer is stale and is listed, never re-applied.
 */
export function carryDecisions(previous: readonly StartDecision[], report: StartCheckReport) {
  const questions = new Map(groupFindings(report).confirm.map((finding) => [finding.key, finding]))
  const kept: StartDecision[] = []
  const stale: StartDecision[] = []
  for (const decision of previous) {
    const finding = questions.get(decision.finding)
    if (finding?.actions.some(({ id }) => id === decision.action)) kept.push(decision)
    else stale.push(decision)
  }
  return { kept, stale }
}

export function choicesFrom(decisions: readonly StartDecision[]): StartChoices {
  return Object.fromEntries(decisions.map(({ finding, action }) => [finding, action]))
}

/** One change as a person reads it, for example `lead: on_full_load append → clear`. */
export function changeLine(change: StartCheckChange) {
  return change.from
    ? `${change.element}: ${change.field} ${change.from} → ${change.to}`
    : `${change.element}: ${change.field} → ${change.to}`
}

export function decisionLine(decision: StartDecision) {
  return `${decision.finding} → ${decision.action}`
}

export function appliedChanges(applied: readonly StartDecisionApplied[]): StartCheckChange[] {
  return applied.flatMap((decision) => decision.changes)
}

/** Whether an answer rewrote the stored definition, which also moves the stored draft. */
export function definitionRewritten(applied: readonly StartDecisionApplied[]) {
  return applied.some(
    (decision) => typeof decision.contentHash === 'string' && decision.contentHash.length > 0,
  )
}
