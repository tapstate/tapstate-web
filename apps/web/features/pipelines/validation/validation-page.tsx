import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tapstate-web/ui/button'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getPipeline } from '@/service/pipelines/pipeline-client'
import {
  createValidationClient,
  type ValidationOperation,
  type ValidationReference,
  type ValidationExecution,
  type ValidationDisable,
  type ValidationSave,
  type ValidationSchedule,
  type ValidationTask,
} from '@/service/pipelines/validation-client'
import { useAuthStore } from '@/stores/auth-store'

import { ValidationBulkSettings } from './validation-bulk-settings'
import { ValidationHistoryPanel } from './validation-history-panel'
import {
  validationLoadedFieldHints,
  savedValidationMappingHints,
  validationMappingHints,
  type ValidationMappingHint,
} from './validation-mapping-hints'
import { sameValidationOperation, validationStartBusy } from './validation-operation'
import { validationClientKey } from './validation-query-key'
import { ValidationRunPanel } from './validation-run-panel'
import { ValidationScheduleSettings } from './validation-schedule-settings'
import { savedValidationSelection, sameValidationSchedule } from './validation-selection'
import { validationSessionFetcher } from './validation-session-fetcher'
import { ValidationRequestError, validationSavePrewriteRefusal } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
export function ValidationPage({ pipelineId }: { pipelineId: string }) {
  const apiFetch = useAuthStore((state) => state.apiFetch),
    session = useAuthStore((state) => state.sessionRevision)
  const scopedFetch = useMemo(
    () =>
      validationSessionFetcher(apiFetch, session, () => useAuthStore.getState().sessionRevision),
    [apiFetch, session],
  )
  const client = useMemo(() => createValidationClient(scopedFetch), [scopedFetch])
  const [reload, setReload] = useState(0)
  const initialKey = [
    'validation',
    session,
    pipelineId,
    'initial',
    reload,
    validationClientKey(client),
  ] as const
  const initial = useQuery({
    // The reviewed snapshot belongs to this workspace lifetime, not a later visit.
    queryKey: initialKey,
    queryFn: async ({ signal }) => {
      const [pipeline, task] = await Promise.all([
        getPipeline(pipelineId, scopedFetch),
        client.task(pipelineId, 'full', signal),
      ])
      return { pipeline, task, hints: savedValidationMappingHints(task) }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0,
  })
  const mappings = useQuery({
    queryKey: [...initialKey, 'mapping-suggestions'],
    enabled: initial.isSuccess,
    queryFn: ({ signal }) =>
      validationMappingHints(
        initial.data!.pipeline,
        (source) => client.sourceHints(source, signal),
        initial.data!.task,
      ),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0,
  })
  const mappingHints = mappings.data ?? initial.data?.hints ?? []
  const fields = useQuery({
    queryKey: [...initialKey, 'field-suggestions', mappings.data],
    enabled: initial.isSuccess && !mappings.isPending,
    queryFn: async ({ signal }) => {
      const base = initial.data!
      let firstError: unknown = null
      const hints = await validationLoadedFieldHints(
        base.pipeline,
        mappingHints,
        async (source) => {
          try {
            return await client.sourceFieldHints(source, signal)
          } catch (error) {
            if (signal.aborted) throw error
            firstError ??= error
            return null
          }
        },
      )
      return { hints, error: firstError }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0,
  })
  const { t } = useTranslation()
  if (initial.isPending)
    return (
      <p role="status" className="system-sm-regular text-text-secondary">
        {t('dataValidation.loading')}
      </p>
    )
  if (initial.isError)
    return (
      <>
        <ValidationRequestError error={initial.error} />
        <Button onClick={() => void initial.refetch()}>{t('dataValidation.retryRead')}</Button>
      </>
    )
  return (
    <ValidationWorkspace
      key={`${session}:${pipelineId}:${reload}`}
      pipelineId={pipelineId}
      client={client}
      initialTask={initial.data.task}
      hints={mappingHints}
      fieldHints={fields.data?.hints ?? mappingHints}
      mappingError={mappings.error}
      mappingHintsLoading={mappings.isFetching}
      onRetryMappings={() => void mappings.refetch()}
      fieldError={fields.isError ? fields.error : fields.data?.error}
      fieldHintsLoading={fields.isFetching}
      onRetryFields={() => void fields.refetch()}
      onReload={() => setReload((value) => value + 1)}
    />
  )
}
function ValidationWorkspace({
  pipelineId,
  client,
  initialTask,
  hints,
  fieldHints,
  fieldError,
  mappingError,
  mappingHintsLoading,
  onRetryMappings,
  fieldHintsLoading,
  onRetryFields,
  onReload,
}: {
  pipelineId: string
  client: Client
  initialTask: ValidationTask | null
  hints: readonly ValidationMappingHint[]
  fieldHints: readonly ValidationMappingHint[]
  fieldError: unknown
  mappingError: unknown
  mappingHintsLoading: boolean
  onRetryMappings: () => void
  fieldHintsLoading: boolean
  onRetryFields: () => void
  onReload: () => void
}) {
  const { t } = useTranslation()
  const [basis, setBasis] = useState(initialTask),
    [version, setVersion] = useState(0)
  const [section, setSection] = useState<'bulk' | 'run' | 'schedule' | 'history'>(
    initialTask && validationStartBusy(initialTask, null) ? 'run' : 'bulk',
  )
  const runLink = useRef<HTMLButtonElement | null>(null),
    bulkFocus = useRef<HTMLDivElement | null>(null),
    runFocus = useRef<HTMLDivElement | null>(null),
    returningFromRun = useRef(false)
  useEffect(() => {
    if (section === 'run') runFocus.current?.focus()
    if (section === 'bulk' && returningFromRun.current) {
      returningFromRun.current = false
      ;(runLink.current ?? bulkFocus.current)?.focus()
    }
  }, [section])
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState('')
  const [needsReload, setNeedsReload] = useState(false)
  const mutation = useRef(false)
  const [uncertain, setUncertain] = useState<{
    request: ValidationSave
    comparison: string
  } | null>(null)
  const offOriginal = useRef<ValidationDisable | null>(null)
  const [offUnknown, setOffUnknown] = useState(false)
  const [preparingStart, setPreparingStart] = useState(false)
  const [startNotSent, setStartNotSent] = useState(false)
  const [operation, setOperation] = useState<ValidationOperation | null>(null)
  const [terminalReceipt, setTerminalReceipt] = useState<ValidationExecution | null>(null)
  const [executionObservation, setExecutionObservation] = useState<ValidationExecution | null>(null)
  const [historyReference, setHistoryReference] = useState<ValidationReference | null>(null)
  const queryClient = useQueryClient()
  const taskKey = [
    'validation',
    'live',
    pipelineId,
    initialTask?.taskGeneration ?? 'new',
    validationClientKey(client),
  ] as const
  const taskQuery = useQuery({
    queryKey: taskKey,
    queryFn: ({ signal }) => client.task(pipelineId, 'full', signal),
    retry: false,
    refetchInterval: preparingStart ? false : 3000,
  })
  useEffect(() => {
    if (!operation) return
    const live = taskQuery.data,
      permission = live?.permission
    const anotherWinner =
      live?.taskGeneration === operation.taskGeneration &&
      permission?.taskGeneration === operation.taskGeneration &&
      permission.sequence === operation.sequence &&
      permission.command !== operation.command &&
      BigInt(live.nextStartSequence) > BigInt(operation.sequence)
    if (anotherWinner) {
      setNotice(t('dataValidation.run.otherAdmitted'))
      setOperation(null)
      setTerminalReceipt(null)
      return
    }
    // Durable admission can reopen after an entry restart without a physical-drain observation.
    // This permits only a fresh request; it never upgrades UNKNOWN resource exit to DRAINED.
    const admissionClosed =
      live?.taskGeneration === operation.taskGeneration &&
      permission?.taskGeneration === operation.taskGeneration &&
      permission.phase === 'CLOSED' &&
      permission.command === operation.command &&
      permission.sequence === operation.sequence &&
      permission.revision === operation.revision &&
      BigInt(live.nextStartSequence) > BigInt(operation.sequence) &&
      !validationStartBusy(live)
    if (admissionClosed) {
      setOperation(null)
      setTerminalReceipt(null)
      return
    }
    if (!terminalReceipt || !sameValidationOperation(terminalReceipt.original, operation)) return
    const reflected =
      live?.taskGeneration === operation.taskGeneration &&
      (BigInt(live.nextStartSequence) > BigInt(operation.sequence) ||
        (permission?.command === operation.command &&
          permission.sequence === operation.sequence &&
          permission.revision === operation.revision))
    if (!terminalReceipt.admitted || reflected) {
      setOperation(null)
      setTerminalReceipt(null)
    }
  }, [operation, terminalReceipt, taskQuery.data, t])
  const liveTask = taskQuery.data ?? basis
  const startBusy = liveTask !== null && validationStartBusy(liveTask, terminalReceipt)
  const changed =
    needsReload ||
    (taskQuery.data !== undefined &&
      (basis === null
        ? taskQuery.data !== null
        : !taskQuery.data ||
          taskQuery.data.taskGeneration !== basis.taskGeneration ||
          taskQuery.data.revision !== basis.revision))
  const blocked = pending || uncertain !== null || offUnknown || changed
  function refuse(key: string): never {
    setNotice(t(key))
    throw new Error('Validation action requires explicit review of the saved definition.')
  }
  async function commit(request: ValidationSave, comparison: string, recoveringOriginal = false) {
    if (mutation.current) return
    mutation.current = true
    setPending(true)
    setError(null)
    setNotice('')
    let acknowledged = false
    let acceptedReceipt = false
    try {
      setUncertain({ request, comparison })
      const receipt = await client.save(request)
      if (receipt.outcome !== 'APPLIED' && receipt.outcome !== 'DUPLICATE') {
        acknowledged = true
        setUncertain(null)
        setNeedsReload(true)
        refuse('dataValidation.definitionChanged')
      }
      if (receipt.fingerprint !== request.fingerprint || !receipt.taskGeneration)
        refuse('dataValidation.readbackRequired')
      acceptedReceipt = true
      const read = await client.task(pipelineId, 'full')
      if (
        !read ||
        read.taskGeneration !== receipt.taskGeneration ||
        BigInt(read.revision) !== BigInt(request.input.expectedRevision) + 1n ||
        read.comparisonFingerprint !== comparison ||
        read.method !== request.input.method ||
        read.historyLimit !== request.historyLimit ||
        read.scheduleEnabled !== request.scheduleEnabled ||
        !sameValidationSchedule(read.schedule, request.schedule ?? null)
      )
        refuse('dataValidation.readbackRequired')
      acknowledged = true
      setUncertain(null)
      setBasis(read)
      setVersion((value) => value + 1)
      void taskQuery.refetch()
      setNotice(t('dataValidation.saved'))
    } catch (failed) {
      setError(failed)
      if (!acknowledged) {
        // Fresh metadata/rule refusals precede the write. A recovery attempt may already
        // have committed, and a failed readback never disproves that receipt.
        if (!recoveringOriginal && !acceptedReceipt && validationSavePrewriteRefusal(failed)) {
          setUncertain(null)
        } else setNotice(t('dataValidation.unknownSave'))
      }
      throw failed
    } finally {
      mutation.current = false
      setPending(false)
    }
  }
  async function saveSchedule(
    schedule: ValidationSchedule,
    enabled: boolean,
    historyLimit: number,
  ) {
    if (!basis || blocked) return
    const input = savedValidationSelection(basis)
    if (!input) refuse('dataValidation.definitionChanged')
    const view = await client.evaluate(input)
    if (
      !view.fingerprint ||
      view.comparisonFingerprint !== basis.comparisonFingerprint ||
      view.method !== basis.method
    )
      refuse('dataValidation.definitionChanged')
    await commit(
      {
        input,
        fingerprint: view.fingerprint,
        commandId: crypto.randomUUID(),
        historyLimit,
        schedule,
        scheduleEnabled: enabled,
      },
      basis.comparisonFingerprint,
    )
  }
  async function disable() {
    if (!basis || pending || mutation.current) return
    mutation.current = true
    setPending(true)
    setError(null)
    setNotice('')
    try {
      const request = offOriginal.current ?? {
        pipeline: pipelineId,
        task: basis.taskId,
        taskGeneration: basis.taskGeneration,
        expectedRevision: basis.revision,
        command: crypto.randomUUID(),
      }
      offOriginal.current = request
      setOffUnknown(true)
      const receipt = await client.disableSchedule(request)
      if (receipt.outcome !== 'APPLIED' && receipt.outcome !== 'DUPLICATE') {
        offOriginal.current = null
        setOffUnknown(false)
        refuse('dataValidation.definitionChanged')
      }
      const read = await client.task(pipelineId, basis.taskId)
      offOriginal.current = null
      setOffUnknown(false)
      if (
        !read ||
        read.taskGeneration !== receipt.taskGeneration ||
        read.revision !== receipt.receiptRevision ||
        read.scheduleEnabled
      )
        refuse('dataValidation.readbackRequired')
      setBasis(read)
      setVersion((value) => value + 1)
      void taskQuery.refetch()
      setNotice(t('dataValidation.schedule.off'))
    } catch (failed) {
      setError(failed)
      throw failed
    } finally {
      mutation.current = false
      setPending(false)
    }
  }
  async function retryStart() {
    if (!operation || pending || mutation.current) return
    setSection('run')
    mutation.current = true
    setPending(true)
    setError(null)
    try {
      await client.start(operation)
      void taskQuery.refetch()
    } catch (failed) {
      setError(failed)
    } finally {
      mutation.current = false
      setPending(false)
    }
  }
  async function start() {
    if (!basis || blocked || operation || startBusy) return
    const input = savedValidationSelection(basis)
    if (!input) refuse('dataValidation.definitionChanged')
    let originalCreated = false
    setPreparingStart(true)
    setNotice('')
    setStartNotSent(false)
    setPending(true)
    setError(null)
    try {
      await queryClient.cancelQueries({ queryKey: taskKey, exact: true })
      const latest = await queryClient.fetchQuery({
        queryKey: taskKey,
        queryFn: ({ signal }) => client.task(pipelineId, basis.taskId, signal),
        staleTime: 0,
      })
      if (
        !latest ||
        latest.taskGeneration !== basis.taskGeneration ||
        latest.revision !== basis.revision ||
        latest.comparisonFingerprint !== basis.comparisonFingerprint
      )
        refuse('dataValidation.definitionChanged')
      if (validationStartBusy(latest, terminalReceipt)) {
        setStartNotSent(true)
        setNotice(t('dataValidation.run.slotBusy'))
        return
      }
      const evaluated = await client.evaluate(input)
      if (
        !evaluated.context ||
        !evaluated.fingerprint ||
        evaluated.comparisonFingerprint !== basis.comparisonFingerprint ||
        evaluated.method !== basis.method
      )
        refuse('dataValidation.definitionChanged')
      const original: ValidationOperation = {
        context: evaluated.context,
        pipeline: pipelineId,
        task: basis.taskId,
        taskGeneration: basis.taskGeneration,
        revision: basis.revision,
        sequence: latest.nextStartSequence,
        command: crypto.randomUUID(),
      }
      setTerminalReceipt(null)
      setExecutionObservation(null)
      setOperation(original)
      setSection('run')
      originalCreated = true
      setPreparingStart(false)
      // Retain the original selector before submitting. Reading it never dispatches another START.
      await client.start(original)
      void taskQuery.refetch()
    } catch (failed) {
      if (!originalCreated) setStartNotSent(true)
      setError(failed)
      throw failed
    } finally {
      setPreparingStart(false)
      setPending(false)
    }
  }
  return (
    <div className="space-y-5 pb-8" data-testid="validation-workspace">
      <header className="border-divider-subtle border-b pb-5">
        <p className="system-xs-regular text-text-tertiary mb-3 break-words">
          {pipelineId}{' '}
          <span aria-hidden="true" className="mx-2">
            /
          </span>{' '}
          {t('dataValidation.title')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-text-primary text-lg leading-7 font-semibold">
            {t('dataValidation.title')}
          </h1>
          {basis && (
            <span className="system-xs-regular text-text-secondary bg-background-section-burn rounded-md px-2 py-1">
              {t('dataValidation.configurationRevision', { revision: basis.revision })}
            </span>
          )}
        </div>
        <p className="system-sm-regular text-text-secondary mt-2">
          {t('dataValidation.description')}
        </p>
      </header>
      {error != null && <ValidationRequestError error={error} />}
      {notice && (
        <p role="status" className="system-sm-regular text-text-secondary">
          {notice}
        </p>
      )}
      {startNotSent && (
        <p role="status" className="system-sm-regular text-text-secondary">
          {t('dataValidation.run.startNotSent')}
        </p>
      )}
      {uncertain && (
        <Button
          disabled={pending}
          variant="secondary"
          onClick={() => void commit(uncertain.request, uncertain.comparison, true).catch(() => {})}
        >
          {t('dataValidation.retryOriginalSave')}
        </Button>
      )}
      {offUnknown && (
        <Button
          disabled={pending}
          variant="secondary"
          onClick={() => void disable().catch(() => {})}
        >
          {t('dataValidation.retryOriginalOff')}
        </Button>
      )}
      {operation &&
        (!executionObservation ||
          !sameValidationOperation(executionObservation.original, operation) ||
          !executionObservation.admitted ||
          executionObservation.controlUnknown) && (
          <Button disabled={pending} variant="secondary" onClick={() => void retryStart()}>
            {t('dataValidation.retryOriginalStart')}
          </Button>
        )}
      {changed && (
        <div className="space-y-2">
          <p role="alert" className="text-text-primary text-sm leading-5">
            {t('dataValidation.definitionChanged')}
          </p>
          <Button
            disabled={pending || uncertain !== null || offUnknown}
            variant="secondary"
            onClick={onReload}
          >
            {t('dataValidation.reloadDefinition')}
          </Button>
        </div>
      )}
      {section === 'bulk' &&
        (operation || liveTask?.permission || liveTask?.scheduleObservation?.command) && (
          <Button
            ref={runLink}
            size="small"
            variant="ghost-accent"
            disabled={pending}
            onClick={() => setSection('run')}
          >
            {t('dataValidation.run.view')}
          </Button>
        )}
      {
        <div
          ref={bulkFocus}
          tabIndex={-1}
          aria-label={t('dataValidation.bulk.title')}
          hidden={section !== 'bulk'}
        >
          {mappingHintsLoading && (
            <p role="status" className="system-xs-regular text-text-secondary mb-4">
              {t('dataValidation.bulk.scopeLoading')}
            </p>
          )}
          {mappingError != null && (
            <details className="system-xs-regular text-text-secondary mb-4">
              <summary className="cursor-pointer">
                {t('dataValidation.bulk.scopeUnavailable')}
              </summary>
              <p className="my-2">{t('dataValidation.bulk.scopeHelp')}</p>
              <Button
                size="small"
                variant="secondary"
                disabled={mappingHintsLoading}
                onClick={onRetryMappings}
              >
                {t('dataValidation.retryRead')}
              </Button>
              <ValidationRequestError error={mappingError} />
            </details>
          )}
          {fieldError != null && (
            <details className="system-xs-regular text-text-secondary mb-4">
              <summary className="cursor-pointer">
                {t('dataValidation.bulk.suggestionsUnavailable')}
              </summary>
              <p className="my-2">{t('dataValidation.bulk.suggestionsHelp')}</p>
              <Button
                size="small"
                variant="secondary"
                disabled={fieldHintsLoading}
                onClick={onRetryFields}
              >
                {t('dataValidation.bulk.retrySuggestions')}
              </Button>
              <ValidationRequestError error={fieldError} />
            </details>
          )}
          <ValidationBulkSettings
            key={version}
            pipelineId={pipelineId}
            client={client}
            task={basis}
            hints={hints}
            fieldHints={fieldHints}
            pending={blocked}
            startBlocked={operation !== null || startBusy}
            onSave={commit}
            onStart={start}
            onSchedule={() => setSection('schedule')}
            onHistory={() => {
              setHistoryReference(null)
              setSection('history')
            }}
            onDefinitionConflict={() => setNeedsReload(true)}
            onError={setError}
          />
        </div>
      }
      {section === 'schedule' && basis && (
        <ValidationScheduleSettings
          key={version}
          client={client}
          task={{
            ...basis,
            scheduleObservation:
              liveTask?.taskGeneration === basis.taskGeneration &&
              liveTask.revision === basis.revision
                ? liveTask.scheduleObservation
                : basis.scheduleObservation,
          }}
          pending={blocked}
          onSave={saveSchedule}
          onDisable={disable}
          onBack={() => setSection('bulk')}
          onError={setError}
        />
      )}
      {section === 'run' && (
        <Button
          variant="ghost-accent"
          size="small"
          disabled={pending}
          onClick={() => {
            returningFromRun.current = true
            setSection('bulk')
          }}
        >
          {t('dataValidation.run.backSettings')}
        </Button>
      )}
      {section !== 'history' && (
        <div
          ref={runFocus}
          tabIndex={-1}
          aria-label={t('dataValidation.run.title')}
          hidden={section !== 'run'}
        >
          <ValidationRunPanel
            client={client}
            task={liveTask}
            original={operation}
            onObservation={setExecutionObservation}
            onTerminal={(receipt) => {
              setTerminalReceipt(receipt)
              if (!receipt.admitted) setNotice(t('dataValidation.run.notAdmitted'))
              void taskQuery.refetch()
            }}
            onReportOpen={(reference) => {
              setHistoryReference(reference)
              setSection('history')
            }}
          />
        </div>
      )}
      {section === 'history' && (
        <ValidationHistoryPanel
          key={historyReference ? JSON.stringify(historyReference) : 'list'}
          initialReference={historyReference}
          client={client}
          pipelineId={pipelineId}
          taskId="full"
          onBack={() => setSection('bulk')}
        />
      )}
    </div>
  )
}
