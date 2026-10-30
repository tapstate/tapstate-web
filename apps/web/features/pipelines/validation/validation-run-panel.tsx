import { useQuery } from '@tanstack/react-query'
import { Button } from '@tapstate-web/ui/button'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationOperation,
  ValidationExecution,
  ValidationReference,
  ValidationTask,
} from '@/service/pipelines/validation-client'

import {
  validationControlSelection,
  validationReportReference,
  validationOperationSettled,
} from './validation-operation'
import { validationClientKey } from './validation-query-key'
import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
export function ValidationRunPanel({
  client,
  task,
  original,
  onTerminal,
  onReportOpen,
}: {
  client: Client
  task: ValidationTask | null
  original: ValidationOperation | null
  onTerminal: (execution: ValidationExecution) => void
  onReportOpen: (reference: ValidationReference) => void
}) {
  const { t } = useTranslation(),
    [stopError, setStopError] = useState<unknown>(null),
    [stopping, setStopping] = useState(false)
  const inFlight = useRef(false),
    notified = useRef<string | null>(null)
  const selection = task ? validationControlSelection(task) : null
  const operation = original ?? selection?.operation ?? null
  const identity = JSON.stringify(operation)
  const progress = useQuery({
    queryKey: ['validation', 'progress', validationClientKey(client), identity],
    queryFn: ({ signal }) => client.progress(operation!, signal),
    enabled: operation !== null,
    retry: false,
    refetchInterval: (query) => {
      const result = query.state.data
      return result?.state &&
        ['COMPLETED', 'FAILED', 'STOPPED'].includes(result.state) &&
        result.drain === 'DRAINED'
        ? false
        : 2000
    },
  })
  const state = progress.data
  useEffect(() => {
    if (operation && state && validationOperationSettled(state) && notified.current !== identity) {
      notified.current = identity
      onTerminal(state)
    }
  }, [operation, state, identity, onTerminal])
  const reference = state
    ? {
        pipeline: state.original.pipeline,
        task: state.original.task,
        generation: state.original.taskGeneration,
        sequence: state.original.sequence,
        run: state.run,
      }
    : !original && task
      ? selection
        ? selection.report
        : validationReportReference(task)
      : null
  if (!operation && !reference) return null
  async function stop() {
    if (!operation || inFlight.current) return
    inFlight.current = true
    setStopping(true)
    setStopError(null)
    try {
      await client.stop(operation)
      void progress.refetch()
    } catch (error) {
      setStopError(error)
    } finally {
      inFlight.current = false
      setStopping(false)
    }
  }
  return (
    <section
      className="border-divider-subtle space-y-4 border-t pt-5"
      aria-label={t('dataValidation.run.title')}
    >
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="system-lg-semibold text-text-primary">{t('dataValidation.run.title')}</h2>
        {operation && (
          <Button
            variant="secondary"
            disabled={
              stopping ||
              Boolean(state?.state && ['STOPPED', 'COMPLETED', 'FAILED'].includes(state.state))
            }
            onClick={() => void stop()}
          >
            {t('dataValidation.run.stop')}
          </Button>
        )}
      </div>
      <p className="system-sm-regular text-text-secondary">{t('dataValidation.run.independent')}</p>
      {progress.isError && <ValidationRequestError error={progress.error} />}
      {stopError != null && <ValidationRequestError error={stopError} />}
      {state && (
        <div className="system-sm-regular text-text-secondary space-y-2" role="status">
          <p>
            {state.state
              ? t(`dataValidation.run.states.${state.state}`)
              : t('dataValidation.run.unknown')}{' '}
            · {t(`dataValidation.run.outcomes.${state.outcome}`)}
          </p>
          {state.reason && <p className="break-words">{state.reason}</p>}
          {state.controlUnknown && <p>{t('dataValidation.run.unknown')}</p>}
          <p>
            {t('dataValidation.run.drain')}: {state.drain}
          </p>
          <ul>
            {state.tables.map((table) => (
              <li key={table.mapping}>
                {table.mapping} · {table.phase}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!state && operation && (
        <p className="system-sm-regular text-text-secondary">
          {progress.isPending ? t('dataValidation.loading') : t('dataValidation.run.unknown')}
        </p>
      )}
      <Button
        variant="secondary"
        size="small"
        disabled={reference === null}
        onClick={() => {
          if (reference) onReportOpen(reference)
        }}
      >
        {t('dataValidation.report.open')}
      </Button>
    </section>
  )
}
