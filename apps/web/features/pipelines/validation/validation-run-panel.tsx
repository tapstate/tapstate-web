import { useQuery } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
} from '@tapstate-web/ui/alert-dialog'
import { Button } from '@tapstate-web/ui/button'
import { Input } from '@tapstate-web/ui/input'
import { Pagination } from '@tapstate-web/ui/pagination'
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
import {
  ValidationRequestError,
  ValidationProgressReadError,
  validationMetadataBusy,
} from './validation-view-parts'

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
    [stopping, setStopping] = useState(false),
    [confirming, setConfirming] = useState<ValidationOperation | null>(null),
    [search, setSearch] = useState(''),
    [phase, setPhase] = useState('all'),
    [page, setPage] = useState(1)
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
      if (validationMetadataBusy(query.state.error)) return 5000
      const result = query.state.data
      return result?.state &&
        ['COMPLETED', 'FAILED', 'STOPPED'].includes(result.state) &&
        (result.drain === 'DRAINED' ||
          (result.retired && !result.controlUnknown && result.drain === 'UNKNOWN'))
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
  const canStop =
    operation !== null &&
    !stopping &&
    !(state?.state && ['STOPPED', 'COMPLETED', 'FAILED'].includes(state.state))
  const definition =
    task?.taskGeneration === operation?.taskGeneration && task?.revision === operation?.revision
      ? task
      : null
  const rows = (state?.tables ?? []).map((table) => ({
    ...table,
    mapping: definition?.mappings.find((item) => item.mappingId === table.mapping),
    id: table.mapping,
  }))
  const filtered = rows.filter(
    (row) =>
      (phase === 'all' || row.phase === phase) &&
      [
        row.id,
        row.mapping?.sourceTable,
        row.mapping?.targetTable,
        row.mapping?.sourceId,
        row.mapping?.targetSourceId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const pages = Math.ceil(filtered.length / 20),
    safePage = Math.min(page, Math.max(1, pages))
  async function stop(selected: ValidationOperation) {
    if (!canStop || JSON.stringify(selected) !== identity || inFlight.current) return
    inFlight.current = true
    setStopping(true)
    setStopError(null)
    try {
      await client.stop(selected)
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
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!operation || progress.isFetching}
            onClick={() => void progress.refetch()}
          >
            {t('dataValidation.run.refresh')}
          </Button>
          {operation && (
            <Button
              variant="secondary"
              disabled={!canStop}
              onClick={() => setConfirming(operation)}
            >
              {t('dataValidation.run.stop')}
            </Button>
          )}
        </div>
      </div>
      <p className="system-sm-regular text-text-secondary">{t('dataValidation.run.independent')}</p>
      {operation && (
        <p className="system-sm-regular text-text-secondary">
          {t(
            !original &&
              selection?.source === 'DURABLE_PERMISSION' &&
              task?.permission?.phase === 'CLOSED'
              ? 'dataValidation.run.previousRun'
              : 'dataValidation.run.configurationRevision',
            { revision: operation.revision },
          )}
        </p>
      )}
      {progress.isError && (
        <ValidationProgressReadError error={progress.error} hasObservation={state != null} />
      )}
      {stopError != null && <ValidationRequestError error={stopError} />}
      {state && (
        <div className="system-sm-regular text-text-secondary space-y-2" role="status">
          {progress.isError && <p>{t('dataValidation.run.staleObservation')}</p>}
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
          <div className="border-divider-subtle space-y-3 border-t pt-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="system-sm-semibold">{t('dataValidation.run.tableProgress')}</h3>
              <span className="system-xs-regular">
                {t('dataValidation.run.receivedAt', {
                  time: progress.dataUpdatedAt
                    ? new Date(progress.dataUpdatedAt).toISOString()
                    : t('dataValidation.unknown'),
                })}
              </span>
            </div>
            <p className="system-xs-regular">{t('dataValidation.run.readProgressOnly')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'READING', 'PENDING', 'READ_COMPLETE'].map((value) => (
                <Button
                  key={value}
                  size="small"
                  variant={phase === value ? 'secondary-accent' : 'secondary'}
                  onClick={() => {
                    setPhase(value)
                    setPage(1)
                  }}
                >
                  {t(`dataValidation.run.phases.${value}`)} ·{' '}
                  {value === 'all' ? rows.length : rows.filter((row) => row.phase === value).length}
                </Button>
              ))}
              <Input
                className="ml-auto max-w-80"
                aria-label={t('dataValidation.bulk.search')}
                placeholder={t('dataValidation.bulk.search')}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="border-divider-subtle max-h-[520px] overflow-auto rounded-lg border">
              <table className="system-sm-regular w-full min-w-[540px] text-left">
                <thead className="bg-background-section-burn">
                  <tr>
                    <th className="p-3">{t('dataValidation.bulk.source')}</th>
                    <th className="p-3">{t('dataValidation.bulk.target')}</th>
                    <th className="p-3">{t('dataValidation.run.tableStage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((safePage - 1) * 20, safePage * 20).map((row) => (
                    <tr key={row.id} className="border-divider-subtle border-t">
                      <td className="p-3">
                        <strong className="font-mono">{row.mapping?.sourceTable ?? row.id}</strong>
                        <p className="system-xs-regular text-text-tertiary">
                          {row.mapping?.sourceId ?? t('dataValidation.run.definitionUnavailable')}
                        </p>
                      </td>
                      <td className="p-3">
                        <strong className="font-mono">
                          {row.mapping?.targetTable ?? t('dataValidation.unknown')}
                        </strong>
                        <p className="system-xs-regular text-text-tertiary">
                          {row.mapping?.targetSourceId}
                        </p>
                      </td>
                      <td className="p-3">
                        {t(`dataValidation.run.phases.${row.phase}`, { defaultValue: row.phase })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && <p>{t('dataValidation.run.noTableObservations')}</p>}
            <Pagination
              page={safePage}
              totalPages={pages}
              onPageChange={setPage}
              labels={{
                previous: t('dataValidation.previous'),
                next: t('dataValidation.next'),
                pageNumberInput: t('dataValidation.pageNumber'),
              }}
            />
          </div>
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
      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dataValidation.run.stopTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dataValidation.run.stopDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton onClick={() => setConfirming(null)}>
              {t('dataValidation.cancel')}
            </AlertDialogCancelButton>
            <AlertDialogConfirmButton
              disabled={!canStop || JSON.stringify(confirming) !== identity}
              onClick={() => {
                const selected = confirming
                setConfirming(null)
                if (selected) void stop(selected)
              }}
            >
              {t('dataValidation.run.confirmStop')}
            </AlertDialogConfirmButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
