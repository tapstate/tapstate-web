import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { useOptionalToast } from '@/components/ui/toast'
import {
  getStartChecks,
  runPipeline,
  type PipelineStartResult,
  type StartCheckChange,
  type StartCheckFinding,
  type StartCheckReport,
  type StartDecision,
  type StartDecisionApplied,
} from '@/service/pipelines/pipeline-client'

import {
  appliedChanges,
  carryDecisions,
  definitionRewritten,
  warningFindings,
} from './start-check-model'

/** How a start ended for the caller: it went ahead, or the person chose not to start. */
export type PipelineStartOutcome =
  | { status: 'started'; result: PipelineStartResult }
  | { status: 'cancelled' }

/** What stays in front of the person after a start until they dismiss it. */
export interface PipelineStartNotice {
  id: number
  pipelineId: string
  /** False when the start was refused after it had already changed the definition. */
  started: boolean
  /** Why a start that changed the definition was then refused, as the server said it. */
  failure?: string
  warnings: StartCheckFinding[]
  changes: StartCheckChange[]
  staleDecisions: StartDecision[]
}

/** The questions in front of the person while a start waits for their answers. */
export interface StartChecksSession {
  pipelineId: string
  /** Changes whenever a new report is shown, so answers are taken afresh for it. */
  version: number
  report: StartCheckReport
  /** Answers carried over from before the report was evaluated again. */
  decisions: StartDecision[]
  /** Earlier answers to questions the report no longer asks. */
  staleDecisions: StartDecision[]
  /** The definition moved while the person was answering, so the checks were run again. */
  changedWhileConfirming: boolean
  submitting: boolean
  recheckFailed?: boolean
}

export interface StartChecksDialogState {
  open: boolean
  session: StartChecksSession | null
  onConfirm: (decisions: StartDecision[]) => void
  onCancel: () => void
  onRecheck?: () => void
}

export interface StartPipelineOptions {
  apiFetch: ApiFetcher
  /**
   * Runs after an answer rewrote the stored definition, whether or not the start then went ahead:
   * the server moved the stored draft with it, so a surface holding the draft reloads it.
   */
  onDefinitionChanged?: (pipelineId: string) => Promise<unknown> | void
}

const START_REFUSALS: readonly string[] = [
  'lifecycle.start-needs-confirmation',
  'lifecycle.start-blocked',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The report a start was stopped with, when the start checks stopped it. */
function refusalReport(error: unknown): StartCheckReport | null {
  if (!isRecord(error) || typeof error.code !== 'string' || !START_REFUSALS.includes(error.code)) {
    return null
  }
  return isRecord(error.startChecks) ? (error.startChecks as unknown as StartCheckReport) : null
}

function isVersionConflict(error: unknown) {
  return isRecord(error) && (error.code === 'pipeline.version-conflict' || error.status === 412)
}

function decisionsAppliedBy(error: unknown): StartDecisionApplied[] {
  return isRecord(error) && Array.isArray(error.decisionsApplied)
    ? (error.decisionsApplied as StartDecisionApplied[])
    : []
}

function listOf<T>(value: readonly T[] | undefined | null): T[] {
  return Array.isArray(value) ? [...value] : []
}

type Settlement = { outcome: PipelineStartOutcome } | { error: unknown }

/**
 * Starts Pipelines through their start checks: the one flow every start entry point shares. A start
 * the checks stop opens the start-check dialog and resolves once the person answers or cancels; a
 * successful start reports warnings through the app toast and keeps definition changes in a notice.
 * Any other error rejects, for the caller to report as before.
 */
export function useStartPipeline({ apiFetch, onDefinitionChanged }: StartPipelineOptions) {
  const { t } = useTranslation()
  const toast = useOptionalToast()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<StartChecksSession | null>(null)
  const [notices, setNotices] = useState<PipelineStartNotice[]>([])
  const sessionRef = useRef<StartChecksSession | null>(null)
  const pendingRef = useRef<{
    resolve: (outcome: PipelineStartOutcome) => void
    reject: (error: unknown) => void
  } | null>(null)
  const noticeSequence = useRef(0)
  const apiFetchRef = useRef(apiFetch)
  const onDefinitionChangedRef = useRef(onDefinitionChanged)
  apiFetchRef.current = apiFetch
  onDefinitionChangedRef.current = onDefinitionChanged

  const showSession = useCallback((next: StartChecksSession) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  /** Shows a report to answer, keeping the earlier answers it still asks for. */
  const ask = useCallback(
    (
      pipelineId: string,
      report: StartCheckReport,
      previous: readonly StartDecision[],
      changedWhileConfirming: boolean,
    ) => {
      const carried = carryDecisions(previous, report)
      showSession({
        pipelineId,
        version: (sessionRef.current?.version ?? 0) + 1,
        report,
        decisions: carried.kept,
        staleDecisions: carried.stale,
        changedWhileConfirming,
        submitting: false,
      })
      setOpen(true)
    },
    [showSession],
  )

  const settle = useCallback(
    (settlement: Settlement) => {
      const pending = pendingRef.current
      pendingRef.current = null
      setOpen(false)
      const current = sessionRef.current
      if (current?.submitting) showSession({ ...current, submitting: false })
      if (!pending) return
      if ('outcome' in settlement) pending.resolve(settlement.outcome)
      else pending.reject(settlement.error)
    },
    [showSession],
  )

  useEffect(
    () => () => {
      // A start still asking when its surface goes away ends as not started.
      pendingRef.current?.resolve({ status: 'cancelled' })
      pendingRef.current = null
    },
    [],
  )

  const pushNotice = useCallback((notice: Omit<PipelineStartNotice, 'id'>) => {
    if (
      notice.warnings.length === 0 &&
      notice.changes.length === 0 &&
      notice.staleDecisions.length === 0
    ) {
      return
    }
    noticeSequence.current += 1
    const id = noticeSequence.current
    setNotices((current) => [...current, { ...notice, id }])
  }, [])

  const definitionChanged = useCallback(async (pipelineId: string) => {
    try {
      await onDefinitionChangedRef.current?.(pipelineId)
    } catch {
      // A reload that fails leaves the surface as it was; its next read or save reports the conflict.
    }
  }, [])

  /**
   * Records what a refused start had already changed in the definition, with the reason it was
   * refused, so both stay in front of the person after the surface reloads its draft.
   */
  const noteRefusedChanges = useCallback(
    async (pipelineId: string, error: unknown) => {
      const applied = decisionsAppliedBy(error)
      if (!definitionRewritten(applied)) return
      const failure = isRecord(error) && typeof error.message === 'string' ? error.message : ''
      pushNotice({
        pipelineId,
        started: false,
        ...(failure ? { failure } : {}),
        warnings: [],
        changes: appliedChanges(applied),
        staleDecisions: [],
      })
      await definitionChanged(pipelineId)
    },
    [definitionChanged, pushNotice],
  )

  const started = useCallback(
    async (pipelineId: string, raw: PipelineStartResult): Promise<PipelineStartOutcome> => {
      const result: PipelineStartResult = {
        ...raw,
        startChecks: raw?.startChecks ?? null,
        decisionsApplied: listOf(raw?.decisionsApplied),
        staleDecisions: listOf(raw?.staleDecisions),
      }
      const warnings = warningFindings(result.startChecks)
      const warningsInToast = warnings.length > 0 && toast !== null
      if (warningsInToast) {
        const messages = warnings
          .map(({ message }) => message.trim())
          .filter(Boolean)
          .join(' ')

        toast.show({
          tone: 'warning',
          title: t('pipelines.startChecks.notice.titleStarted', { id: pipelineId }),
          description: t('pipelines.startChecks.notice.warningDescription', {
            messages: messages || t('pipelines.startChecks.notice.warningFallback'),
          }),
          duration: 6000,
        })
      }
      pushNotice({
        pipelineId,
        started: true,
        // The app toast owns transient successful-start warnings; retain the panel fallback when
        // a host has no app-level toast provider.
        warnings: warningsInToast ? [] : warnings,
        changes: appliedChanges(result.decisionsApplied),
        staleDecisions: result.staleDecisions,
      })
      if (definitionRewritten(result.decisionsApplied)) await definitionChanged(pipelineId)
      return { status: 'started', result }
    },
    [definitionChanged, pushNotice, t, toast],
  )

  const startPipeline = useCallback(
    async (pipelineId: string): Promise<PipelineStartOutcome> => {
      let result: PipelineStartResult
      try {
        result = await runPipeline(pipelineId, apiFetchRef.current)
      } catch (error) {
        const report = refusalReport(error)
        if (!report) throw error
        pendingRef.current?.resolve({ status: 'cancelled' })
        return new Promise<PipelineStartOutcome>((resolve, reject) => {
          pendingRef.current = { resolve, reject }
          ask(pipelineId, report, [], false)
        })
      }
      return started(pipelineId, result)
    },
    [ask, started],
  )

  const answer = useCallback(
    async (current: StartChecksSession, decisions: StartDecision[]) => {
      const { pipelineId, report } = current
      let result: PipelineStartResult
      try {
        result = await runPipeline(pipelineId, apiFetchRef.current, {
          decisions,
          ifMatch: `"${report.contentHash}"`,
        })
      } catch (error) {
        await noteRefusedChanges(pipelineId, error)
        const nextReport = refusalReport(error)
        if (nextReport) {
          ask(pipelineId, nextReport, decisions, false)
          return
        }
        if (!isVersionConflict(error)) {
          settle({ error })
          return
        }
        let fresh: StartCheckReport
        try {
          fresh = await getStartChecks(pipelineId, 'start', apiFetchRef.current)
        } catch (refreshError) {
          settle({ error: refreshError })
          return
        }
        ask(pipelineId, fresh, decisions, true)
        return
      }
      setOpen(false)
      settle({ outcome: await started(pipelineId, result) })
    },
    [ask, noteRefusedChanges, settle, started],
  )

  const onConfirm = useCallback(
    (decisions: StartDecision[]) => {
      const current = sessionRef.current
      if (!current || current.submitting || !pendingRef.current) return
      showSession({ ...current, submitting: true })
      void answer(current, decisions)
    },
    [answer, showSession],
  )

  const onRecheck = useCallback(() => {
    const current = sessionRef.current
    if (!current || current.submitting || !pendingRef.current) return
    showSession({ ...current, submitting: true, recheckFailed: false })
    void (async () => {
      try {
        const report = await getStartChecks(current.pipelineId, 'start', apiFetchRef.current)
        if (!pendingRef.current || sessionRef.current?.version !== current.version) return
        // A recheck never starts a pipeline or carries answers across a new report.
        ask(current.pipelineId, report, [], report.contentHash !== current.report.contentHash)
      } catch {
        if (!pendingRef.current || sessionRef.current?.version !== current.version) return
        showSession({ ...current, submitting: false, recheckFailed: true })
      }
    })()
  }, [ask, showSession])

  const onCancel = useCallback(() => {
    if (sessionRef.current?.submitting) return
    settle({ outcome: { status: 'cancelled' } })
  }, [settle])

  const dismissNotice = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])

  const dialog: StartChecksDialogState = { open, session, onConfirm, onCancel, onRecheck }
  return { startPipeline, dialog, notices, dismissNotice }
}
