import { useChat } from '@ai-sdk/react'
import { Button as SharedUIButton } from '@tapstate-web/ui/button'
import { DefaultChatTransport, type UIMessage } from 'ai'
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import { Button } from '@/components/ui/button'
import {
  validateAssistantProposal,
  assistantStreamFetch,
  assistantErrorKind,
  AssistantClientError,
  type AssistantProposal,
} from '@/service/pipelines/pipeline-assistant-client'
import { useAuthStore } from '@/stores/auth-store'

import { AssistantComposer } from './AssistantComposer'
import { AssistantProviderForm } from './AssistantProviderForm'

const AssistantMarkdown = lazy(() => import('./AssistantMarkdown'))

function ProposalDiff({ diff }: { diff: unknown }) {
  const { t } = useTranslation()
  const value = isRecord(diff) ? diff : {}
  const changes = Array.isArray(value.changes) ? value.changes.filter(isRecord) : []
  const before = typeof value.before === 'string' ? value.before : ''
  const after = typeof value.after === 'string' ? value.after : ''
  const display = (item: unknown) =>
    item === undefined || item === null
      ? '—'
      : typeof item === 'string'
        ? item
        : JSON.stringify(item)
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-semibold text-gray-700">
        {t('wizard.assistant.changeSummary')}
      </h4>
      <ul className="space-y-2 text-[11px] text-gray-700">
        {changes.map((change, index) => (
          <li key={index} className="rounded border border-gray-200 p-2 break-all">
            <div className="font-medium">{display(change.path)}</div>
            <div className="text-red-700">− {display(change.before)}</div>
            <div className="text-green-700">+ {display(change.after)}</div>
          </li>
        ))}
      </ul>
      <h4 className="text-[11px] font-semibold text-gray-700">{t('wizard.assistant.dslDiff')}</h4>
      <div className="overflow-x-auto rounded border border-gray-200 bg-gray-50 font-mono text-[11px] whitespace-pre">
        {dslLines(before, after).map((line, index) => (
          <div
            key={index}
            className={
              line.kind === '+'
                ? 'bg-green-50 text-green-800'
                : line.kind === '-'
                  ? 'bg-red-50 text-red-800'
                  : 'text-gray-600'
            }
          >
            {line.kind} {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function dslLines(before: string, after: string) {
  const oldLines = before ? before.replace(/\n$/, '').split('\n') : []
  const newLines = after ? after.replace(/\n$/, '').split('\n') : []
  // Bound the comparison so large generated documents do not block the editor.
  if (oldLines.length * newLines.length > 250000)
    return [
      ...oldLines.map((text) => ({ kind: '-', text })),
      ...newLines.map((text) => ({ kind: '+', text })),
    ]
  const lengths = Array.from(
    { length: oldLines.length + 1 },
    () => new Uint32Array(newLines.length + 1),
  )
  for (let i = oldLines.length - 1; i >= 0; i--)
    for (let j = newLines.length - 1; j >= 0; j--)
      lengths[i][j] =
        oldLines[i] === newLines[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1])
  const result: { kind: string; text: string }[] = []
  let i = 0,
    j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ kind: ' ', text: oldLines[i++] })
      j++
    } else if (
      i < oldLines.length &&
      (j === newLines.length || lengths[i + 1][j] >= lengths[i][j + 1])
    )
      result.push({ kind: '-', text: oldLines[i++] })
    else result.push({ kind: '+', text: newLines[j++] })
  }
  return result
}

export interface BuilderAssistantContext {
  pipelineId: string
  revision: number
  blocked: boolean
  sendBlocked?: boolean
  prepareRequest?: () => Promise<number>
  onPromptRequestHandled?: (requestId: number) => void
  undoBlocked?: boolean
  onApply: (candidate: PipelineJsonObject) => void
  onUndoApply?: () => boolean
}
type AssistantMessage = UIMessage<unknown, { status: unknown; proposal: AssistantProposal }>
interface AssistantValidationDiagnostic {
  code: string
  path?: string
  reason?: string
}
function isRecord(value: unknown): value is PipelineJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function readAssistantValidationDiagnostics(value: unknown): AssistantValidationDiagnostic[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!isRecord(raw) || typeof raw.code !== 'string') return []
    const params = isRecord(raw.params) ? raw.params : {}
    return [
      {
        code: raw.code.slice(0, 256),
        ...(typeof params.path === 'string' && params.path.length <= 256
          ? { path: params.path }
          : {}),
        ...(typeof params.reason === 'string' && params.reason.length <= 500
          ? { reason: params.reason }
          : {}),
      },
    ]
  })
}
export function isAssistantProposal(value: unknown): value is AssistantProposal {
  return isRecord(value) && Number.isInteger(value.baseRevision) && isRecord(value.candidateWizard)
}
export function PipelineAiCopilot({
  context,
  focus,
  focusLabel,
  promptRequest,
  onClose,
}: {
  context: BuilderAssistantContext
  focus: string
  focusLabel: string
  promptRequest: { id: number; text: string; submit?: boolean } | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const latest = useRef({ context, focus })
  latest.current = { context, focus }
  const [tab, setTab] = useState<'chat' | 'diff' | 'settings'>('chat')
  const [input, setInput] = useState('')
  const [proposal, setProposal] = useState<AssistantProposal | null>(null)
  const [candidateText, setCandidateText] = useState('')
  const [diff, setDiff] = useState<unknown>(null)
  const [complete, setComplete] = useState(false)
  const [applying, setApplying] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [sending, setSending] = useState(false)
  const [prepareError, setPrepareError] = useState(false)
  const [applied, setApplied] = useState(false)
  const [undoError, setUndoError] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [validationDiagnostics, setValidationDiagnostics] = useState<
    AssistantValidationDiagnostic[]
  >([])
  const [progress, setProgress] = useState('connecting')
  const [streamErrorCode, setStreamErrorCode] = useState('')
  const [canceled, setCanceled] = useState(false)
  const reviewedCandidate = useRef('')
  const streamCompleted = useRef(false)
  const applyingRef = useRef(false)
  const sendingRef = useRef(false)
  const generation = useRef(0)
  const requestRevision = useRef<number | null>(null)
  const composerInput = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (tab === 'chat' && promptRequest && !promptRequest.submit) composerInput.current?.focus()
  }, [tab, promptRequest])
  const end = useRef<HTMLDivElement>(null)
  const followOutput = useRef(true)
  const handledPromptRequest = useRef<number | null>(null)
  const sendRef = useRef<(text: string) => boolean>(() => false)
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantMessage>({
        api: `/api/pipelines/${encodeURIComponent(context.pipelineId)}/draft:assistant`,
        fetch: (input, init) =>
          assistantStreamFetch(apiFetch, input, init, (complete) => {
            streamCompleted.current = complete
          }),
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            revision: requestRevision.current ?? latest.current.context.revision,
            focus: {
              kind:
                latest.current.focus === 'root'
                  ? 'root'
                  : latest.current.focus === 'doc_process'
                    ? 'transforms'
                    : 'relation',
              nodeId: latest.current.focus,
            },
            messages: messages
              .filter((message) => message.role !== 'system')
              .map((message) => ({
                role: message.role,
                text: message.parts
                  .map((part) => {
                    if (part.type === 'text') return part.text
                    if (
                      part.type === 'data-status' &&
                      isRecord(part.data) &&
                      part.data.state === 'needs-input'
                    ) {
                      const diagnostics = readAssistantValidationDiagnostics(part.data.diagnostics)
                      return `\nValidation findings: ${JSON.stringify(diagnostics)}`
                    }
                    return ''
                  })
                  .join(''),
              }))
              .filter((message) => message.text.trim().length > 0),
          },
        }),
      }),
    [apiFetch, context.pipelineId],
  )
  const chat = useChat<AssistantMessage>({
    id: `pipeline-assistant-${context.pipelineId}`,
    transport,
    onData: (part) => {
      if (part.type === 'data-status' && isRecord(part.data)) {
        const state = part.data.state ?? part.data.status
        if (
          typeof state === 'string' &&
          [
            'connecting',
            'streaming',
            'validating',
            'ready',
            'complete',
            'needs-input',
            'error',
          ].includes(state)
        )
          setProgress(state)
        if (typeof part.data.code === 'string') setStreamErrorCode(part.data.code)
        if (Array.isArray(part.data.diagnostics))
          setValidationDiagnostics(readAssistantValidationDiagnostics(part.data.diagnostics))
      }
      if (part.type === 'data-proposal' && isAssistantProposal(part.data)) {
        reviewedCandidate.current = JSON.stringify(part.data.candidateWizard)
        setProposal(part.data)
        setCandidateText(JSON.stringify(part.data.candidateWizard, null, 2))
        setDiff(part.data.diff)
      }
    },
    onFinish: ({ isAbort, isDisconnect, isError }) =>
      setComplete(!isAbort && !isDisconnect && !isError && streamCompleted.current),
  })
  const streaming = chat.status === 'streaming' || chat.status === 'submitted'
  const responseHasText =
    chat.messages.at(-1)?.role === 'assistant' &&
    chat.messages.at(-1)?.parts.some((part) => part.type === 'text' && part.text.trim().length > 0)
  const contextSendBlocked = context.sendBlocked ?? context.blocked
  const sendBlocked = contextSendBlocked || streaming || applying || preparing || sending
  const blocked = context.blocked || streaming || applying || preparing || sending
  const stale = proposal !== null && proposal.baseRevision !== context.revision
  useEffect(() => {
    if (followOutput.current) end.current?.scrollIntoView?.({ block: 'nearest' })
  }, [chat.messages, streaming])
  useEffect(
    () => () => {
      generation.current += 1
      void chat.stop()
    },
    [chat.stop],
  )
  function stop() {
    generation.current += 1
    sendingRef.current = false
    setPreparing(false)
    setSending(false)
    setComplete(false)
    setCanceled(true)
    void chat.stop()
  }
  function send(text: string): boolean {
    const prompt = text.trim()
    const currentContext = latest.current.context
    if (
      !prompt ||
      (currentContext.sendBlocked ?? currentContext.blocked) ||
      streaming ||
      applying ||
      sendingRef.current
    )
      return false
    sendingRef.current = true
    setSending(true)
    const requestGeneration = ++generation.current
    streamCompleted.current = false
    setProposal(null)
    setComplete(false)
    setPrepareError(false)
    setApplied(false)
    setUndoError(false)
    setReviewError('')
    setValidationDiagnostics([])
    setProgress('connecting')
    setStreamErrorCode('')
    setCanceled(false)
    followOutput.current = true
    setInput('')
    setTab('chat')
    setPreparing(true)
    void (async () => {
      let revision: number
      try {
        revision = currentContext.prepareRequest
          ? await currentContext.prepareRequest()
          : currentContext.revision
        if (!Number.isSafeInteger(revision) || revision < 0)
          throw new Error('assistant-draft-revision-unavailable')
      } catch {
        if (requestGeneration === generation.current) {
          setPrepareError(true)
          setInput(prompt)
          setPreparing(false)
          sendingRef.current = false
          setSending(false)
        }
        return false
      }
      if (requestGeneration !== generation.current) return
      requestRevision.current = revision
      setPreparing(false)
      try {
        await chat.sendMessage({ text: prompt })
      } catch {
        // useChat exposes request failures through chat.error for the existing error UI.
      } finally {
        if (requestGeneration === generation.current) {
          sendingRef.current = false
          setSending(false)
        }
      }
    })()
    return true
  }
  useEffect(() => {
    sendRef.current = send
  })
  useEffect(() => {
    if (!promptRequest) return
    setTab('chat')
    if (!promptRequest.submit) {
      if (handledPromptRequest.current !== promptRequest.id) {
        setInput(promptRequest.text)
        handledPromptRequest.current = promptRequest.id
      }
      return
    }
    if (handledPromptRequest.current === promptRequest.id || sendBlocked) return
    if (sendRef.current(promptRequest.text)) {
      handledPromptRequest.current = promptRequest.id
      latest.current.context.onPromptRequestHandled?.(promptRequest.id)
    }
  }, [promptRequest, sendBlocked])
  async function apply() {
    if (!proposal || !complete || blocked || stale || applied || applyingRef.current) return
    applyingRef.current = true
    const token = generation.current
    const revision = context.revision
    setApplying(true)
    setReviewError('')
    setValidationDiagnostics([])
    try {
      const candidate: unknown = JSON.parse(candidateText)
      if (!isRecord(candidate)) throw new Error('invalid-json')
      const validated = await validateAssistantProposal(
        context.pipelineId,
        revision,
        candidate,
        apiFetch,
      )
      if (
        token !== generation.current ||
        latest.current.context.blocked ||
        latest.current.context.revision !== revision
      ) {
        setReviewError(t('wizard.assistant.stale'))
        return
      }
      setDiff(validated.diff)
      if (!validated.valid) {
        const diagnostics = readAssistantValidationDiagnostics(
          isRecord(validated.validation) ? validated.validation.diagnostics : undefined,
        )
        setValidationDiagnostics(diagnostics)
        setReviewError(
          t(
            `wizard.assistant.errors.${assistantErrorKind(diagnostics[0]?.code ?? 'pipeline-draft.invalid')}`,
          ),
        )
        return
      }
      // Edited candidates need review of the newly computed canonical diff.
      if (reviewedCandidate.current !== JSON.stringify(candidate)) {
        reviewedCandidate.current = JSON.stringify(validated.candidateWizard)
        setCandidateText(JSON.stringify(validated.candidateWizard, null, 2))
        setReviewError(t('wizard.assistant.editedReview'))
        return
      }
      // Canonical normalization can change the proposed edit. Require review of that result.
      if (JSON.stringify(validated.candidateWizard) !== JSON.stringify(candidate)) {
        reviewedCandidate.current = JSON.stringify(validated.candidateWizard)
        setCandidateText(JSON.stringify(validated.candidateWizard, null, 2))
        setReviewError(t('wizard.assistant.normalized'))
        return
      }
      latest.current.context.onApply(validated.candidateWizard)
      setApplied(true)
      setUndoError(false)
      setTab('chat')
    } catch (error) {
      setReviewError(
        error instanceof AssistantClientError
          ? t(`wizard.assistant.errors.${assistantErrorKind(error.code)}`)
          : t('wizard.assistant.applyFailed'),
      )
    } finally {
      applyingRef.current = false
      setApplying(false)
    }
  }
  function rejectOrUndo() {
    if (applied) {
      if (latest.current.context.onUndoApply?.()) {
        setProposal(null)
        setComplete(false)
        setApplied(false)
        setUndoError(false)
        setTab('chat')
      } else {
        setUndoError(true)
      }
      return
    }
    generation.current += 1
    setProposal(null)
    setComplete(false)
    setTab('chat')
  }
  const proposalActions =
    proposal && complete ? (
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={t('wizard.assistant.diffTitle')}
      >
        <SharedUIButton
          variant={applied ? 'secondary' : 'secondary-accent'}
          size="medium"
          loading={applying}
          type="button"
          onClick={() => void apply()}
          disabled={blocked || stale || applied}
          focusableWhenDisabled={applied}
          className="shrink-0"
        >
          {applied ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t(applied ? 'wizard.assistant.applied' : 'wizard.assistant.apply')}
        </SharedUIButton>
        <SharedUIButton
          variant="secondary"
          type="button"
          disabled={applying || (applied && context.undoBlocked)}
          onClick={rejectOrUndo}
        >
          {t(applied ? 'wizard.assistant.undoApply' : 'wizard.assistant.reject')}
        </SharedUIButton>
      </div>
    ) : null
  const suggestions = ['assemble', 'relations', 'clean', 'metrics', 'diagnose'] as const
  const visibleMessages = chat.messages.filter(
    (message) =>
      message.role === 'user' ||
      message.parts.some((part) => part.type === 'text' && part.text.trim().length > 0),
  )
  return (
    <aside
      className="pipeline-ai-copilot flex h-full min-h-0 min-w-0 flex-col bg-white"
      aria-label={t('wizard.assistant.title')}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/70 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[13px] leading-none font-semibold text-gray-900">
              {t('wizard.assistant.title')}
            </h2>
            <p className="mt-1 text-[11px] leading-none text-gray-500">
              {t('wizard.assistant.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {[
            {
              icon: Settings2,
              label: 'configure',
              action: () => setTab(tab === 'settings' ? 'chat' : 'settings'),
            },
            {
              icon: RotateCcw,
              label: 'reset',
              action: () => {
                generation.current += 1
                sendingRef.current = false
                setPreparing(false)
                setSending(false)
                void chat.stop()
                chat.setMessages([])
                if (promptRequest?.submit) {
                  latest.current.context.onPromptRequestHandled?.(promptRequest.id)
                }
                setProposal(null)
                setComplete(false)
                setReviewError('')
                setCanceled(false)
                setStreamErrorCode('')
              },
            },
            { icon: X, label: 'close', action: onClose },
          ].map(({ icon: Icon, label, action }) => (
            <Button
              variant="ghost"
              size="icon"
              key={label}
              type="button"
              aria-label={t(`wizard.assistant.${label}`)}
              onClick={action}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
      {tab !== 'settings' && (
        <div className="flex items-center justify-between gap-2 border-b border-blue-100/60 bg-blue-50/40 px-4 py-1.5 text-[11px] text-blue-900">
          <span className="min-w-0 truncate">
            <span className="mr-1.5 text-gray-500">{t('wizard.assistant.focus')}</span>
            <span className="font-semibold">{focusLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setTab(tab === 'diff' ? 'chat' : 'diff')}
            className="shrink-0 text-blue-700 hover:underline"
          >
            {t(tab === 'diff' ? 'wizard.assistant.back' : 'wizard.assistant.diff')}
          </button>
        </div>
      )}
      {tab === 'settings' ? (
        <AssistantProviderForm onBack={() => setTab('chat')} />
      ) : (
        <>
          <div
            className="pipeline-ai-transcript min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
            onScroll={(event) => {
              const viewport = event.currentTarget
              followOutput.current =
                viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 48
            }}
          >
            {tab === 'chat' ? (
              <>
                {chat.messages.length === 0 && (
                  <div className="pipeline-ai-welcome">{t('wizard.assistant.welcome')}</div>
                )}
                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="mb-1 px-0.5 text-[10px] font-medium text-gray-400">
                      {t(
                        message.role === 'user' ? 'wizard.assistant.you' : 'wizard.assistant.name',
                      )}
                    </span>
                    <div
                      className={`pipeline-ai-bubble ${message.role === 'user' ? 'pipeline-ai-bubble-user' : 'pipeline-ai-bubble-answer'}`}
                    >
                      {message.role === 'user' ? (
                        <span className="whitespace-pre-wrap">
                          {message.parts
                            .filter((part) => part.type === 'text')
                            .map((part) => part.text)
                            .join('')}
                        </span>
                      ) : (
                        <div
                          className="pipeline-ai-message"
                          aria-busy={streaming && message.id === chat.messages.at(-1)?.id}
                        >
                          <Suspense
                            fallback={
                              <span className="whitespace-pre-wrap">
                                {message.parts
                                  .filter((part) => part.type === 'text')
                                  .map((part) => part.text)
                                  .join('')}
                              </span>
                            }
                          >
                            <AssistantMarkdown
                              content={message.parts
                                .filter((part) => part.type === 'text')
                                .map((part) => part.text)
                                .join('')}
                              responding={streaming && message.id === chat.messages.at(-1)?.id}
                            />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {streaming && (!responseHasText || progress === 'validating') && (
                  <p role="status" className="flex items-center gap-2 text-[12px] text-gray-600">
                    {!responseHasText ? (
                      <span className="pipeline-ai-waiting" aria-hidden="true">
                        <span />
                      </span>
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    )}
                    {t(`wizard.assistant.progress.${progress}`)}
                  </p>
                )}
                {proposal && complete && (
                  <div className="space-y-2">
                    <ProposalDiff diff={diff} />
                    <Button
                      variant="secondary"
                      className="w-full justify-between"
                      type="button"
                      onClick={() => setTab('diff')}
                    >
                      <span>{t('wizard.assistant.review')}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    {proposalActions}
                    {undoError && (
                      <p role="status" className="text-[11px] text-amber-700">
                        {t('wizard.assistant.undoStale')}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-[12px] font-semibold">{t('wizard.assistant.diffTitle')}</h3>
                {!proposal || !complete ? (
                  <p className="text-[12px] text-gray-500">{t('wizard.assistant.noProposal')}</p>
                ) : (
                  <>
                    <ProposalDiff diff={diff} />
                    <label className="block text-[11px] font-medium text-gray-600">
                      {t('wizard.assistant.editProposal')}
                      <textarea
                        aria-label={t('wizard.assistant.editProposal')}
                        value={candidateText}
                        onChange={(e) => {
                          setCandidateText(e.target.value)
                          setReviewError('')
                        }}
                        disabled={applied || applying}
                        className="mt-2 min-h-52 w-full resize-y rounded-lg border border-gray-300 bg-white p-3 font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      />
                    </label>
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      {t('wizard.assistant.reviewHint')}
                    </p>
                    {proposalActions}
                    {undoError && (
                      <p role="status" className="text-[11px] text-amber-700">
                        {t('wizard.assistant.undoStale')}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {chat.error && (
              <p role="alert" className="text-[12px] leading-relaxed text-red-700">
                {t(
                  `wizard.assistant.errors.${assistantErrorKind(streamErrorCode || (chat.error instanceof AssistantClientError ? chat.error.code : chat.error.message))}`,
                )}
              </p>
            )}
            {canceled && (
              <p role="status" className="text-[12px] text-gray-600">
                {t('wizard.assistant.canceled')}
              </p>
            )}
            {reviewError && (
              <p role="alert" className="text-[12px] leading-relaxed text-red-700">
                {reviewError}
              </p>
            )}
            {progress === 'needs-input' && (
              <p role="status" className="text-[12px] leading-relaxed text-amber-800">
                {t('wizard.assistant.needsInput')}
              </p>
            )}
            {validationDiagnostics.length > 0 && (
              <ul className="space-y-1 text-[10px] leading-relaxed text-red-700" role="list">
                {validationDiagnostics.map(({ code, path, reason }) => (
                  <li key={`${code}:${path || ''}`}>
                    <code className="font-mono">{code}</code>
                    {path && <span> · {path}</span>}
                    {reason && <span> · {reason}</span>}
                  </li>
                ))}
              </ul>
            )}
            {stale && !applied && (
              <p role="alert" className="text-[12px] leading-relaxed text-amber-800">
                {t('wizard.assistant.stale')}
              </p>
            )}
            <div ref={end} />
          </div>
          {chat.messages.length === 0 && tab === 'chat' && (
            <div className="pipeline-ai-suggestions shrink-0 p-3">
              <div className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400">
                {t('wizard.assistant.suggestions')}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={sendBlocked}
                    onClick={() => send(t(`wizard.assistant.prompts.${key}`))}
                    className="pipeline-ai-suggestion"
                  >
                    <span>{t(`wizard.assistant.intents.${key}`)}</span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="pipeline-ai-compose-area shrink-0 p-3">
            {context.blocked && !contextSendBlocked && !preparing && (
              <p role="status" className="mb-2 text-[11px] leading-relaxed text-amber-800">
                {t('wizard.assistant.saveBeforeSend')}
              </p>
            )}
            {context.blocked && contextSendBlocked && (
              <p role="status" className="mb-2 text-[11px] leading-relaxed text-amber-800">
                {t('wizard.assistant.waitForSave')}
              </p>
            )}
            {prepareError && (
              <p role="alert" className="mb-2 text-[11px] leading-relaxed text-red-700">
                {t('wizard.assistant.saveBeforeSendFailed')}
              </p>
            )}
            <AssistantComposer
              inputRef={composerInput}
              value={input}
              onValueChange={setInput}
              onSend={() => send(input)}
              onStop={stop}
              label={t('wizard.assistant.prompt')}
              placeholder={t('wizard.assistant.placeholder')}
              sendLabel={t('wizard.assistant.send')}
              stopLabel={t('wizard.assistant.stop')}
              disabled={sendBlocked}
              state={
                preparing || sending || streaming
                  ? preparing || !responseHasText
                    ? 'waiting'
                    : 'streaming'
                  : 'idle'
              }
              hint={t('wizard.assistant.newline')}
            />
          </div>
        </>
      )}
    </aside>
  )
}
