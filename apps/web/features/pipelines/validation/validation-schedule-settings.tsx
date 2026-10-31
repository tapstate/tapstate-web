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
import { SegmentedControl, SegmentedControlItem } from '@tapstate-web/ui/segmented-control'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemText,
} from '@tapstate-web/ui/select'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationPreview,
  ValidationSchedule,
  ValidationTask,
} from '@/service/pipelines/validation-client'

import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
export interface ScheduleSettingsProps {
  client: Client
  task: ValidationTask
  pending: boolean
  onSave: (schedule: ValidationSchedule, enabled: boolean, historyLimit: number) => Promise<void>
  onDisable: () => Promise<void>
  onBack: () => void
  onError?: (error: unknown) => void
}

export function ValidationScheduleSettings({
  client,
  task,
  pending: parentPending,
  onSave,
  onDisable,
  onBack,
  onError,
}: ScheduleSettingsProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<unknown>(null)
  const inFlight = useRef(false)
  const pending = parentPending || submitting
  async function perform(action: () => Promise<void>) {
    if (parentPending || inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setSubmissionError(null)
    onError?.(null)
    try {
      await action()
    } catch (failed) {
      setSubmissionError(failed)
      onError?.(failed)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const [kind, setKind] = useState<ValidationSchedule['kind']>(task.schedule?.kind ?? 'INTERVAL')
  const [every, setEvery] = useState(task.schedule?.every ?? '')
  const [unit, setUnit] = useState<NonNullable<ValidationSchedule['unit']>>(
    task.schedule?.unit ?? 'MINUTES',
  )
  const [expression, setExpression] = useState(task.schedule?.expression ?? '')
  const [zone, setZone] = useState(
    task.schedule?.zoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [anchor] = useState(task.schedule?.anchor ?? new Date().toISOString())
  const [history, setHistory] = useState(String(task.historyLimit))
  const [previewState, setPreview] = useState<{
    signature: string
    result: ValidationPreview
  } | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<{
    schedule: ValidationSchedule
    enabled: boolean
    historyLimit: number
  } | null>(null)
  const sequence = useRef(0)
  const intervalValid = /^[1-9][0-9]{0,18}$/.test(every)
  const historyValid = /^(?:[1-9]|[1-9][0-9]|100)$/.test(history)
  const schedule: ValidationSchedule = {
    kind,
    every: kind === 'INTERVAL' ? every : null,
    unit: kind === 'INTERVAL' ? unit : null,
    anchor: kind === 'INTERVAL' ? anchor : null,
    expression: kind === 'CRON' ? expression : null,
    zoneId: zone,
  }
  const signature = JSON.stringify(schedule)
  const preview = previewState?.signature === signature ? previewState.result : null

  useEffect(() => {
    const revision = String(++sequence.current)
    setPreview(null)
    setError(null)
    setLoading(false)
    if (!zone.trim() || (kind === 'INTERVAL' ? !intervalValid : !expression.trim())) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      void client
        .previewSchedule(
          { schedule: JSON.parse(signature) as ValidationSchedule, inputRevision: revision },
          controller.signal,
        )
        .then((value) => {
          if (!controller.signal.aborted && String(sequence.current) === revision)
            setPreview({ signature, result: value })
        })
        .catch((failed) => {
          if (!controller.signal.aborted && String(sequence.current) === revision) setError(failed)
        })
        .finally(() => {
          if (!controller.signal.aborted && String(sequence.current) === revision) setLoading(false)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [client, signature, kind, intervalValid, expression, zone])

  const savedObservation = task.scheduleObservation
  const canSave = !pending && historyValid && preview !== null && !loading && !error
  function save(enabled: boolean) {
    if (!canSave) return
    const request = { schedule, enabled, historyLimit: Number(history) }
    if (request.historyLimit < task.historyLimit) setConfirming(request)
    else void perform(() => onSave(request.schedule, request.enabled, request.historyLimit))
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost-accent" size="small" onClick={onBack} disabled={pending}>
        {t('dataValidation.schedule.back')}
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="system-xl-semibold text-text-primary">
            {t('dataValidation.schedule.title')}
          </h2>
          <p className="system-sm-regular text-text-secondary mt-2">
            {t('dataValidation.schedule.description')}
          </p>
        </div>
        <span className="system-xs-medium text-text-secondary">
          {task.scheduleEnabled
            ? t('dataValidation.schedule.on')
            : t('dataValidation.schedule.off')}
        </span>
      </div>
      <div className="system-sm-regular text-text-secondary border-divider-subtle flex flex-wrap gap-x-6 gap-y-2 border-b pb-5">
        <span>
          {t('dataValidation.method')}: {t(`dataValidation.methods.${task.method}`)}
        </span>
        <span>{t('dataValidation.mappingCount', { count: task.mappings.length })}</span>
        <span>{t('dataValidation.concurrencyOne')}</span>
      </div>
      {!onError && submissionError != null && <ValidationRequestError error={submissionError} />}
      {submitting && (
        <p role="status" className="system-sm-regular text-text-secondary">
          {t('dataValidation.submitting')}
        </p>
      )}
      <div className="grid items-start gap-7 min-[950px]:grid-cols-[minmax(0,1fr)_284px]">
        <div className="min-w-0 space-y-5">
          <section className="border-divider-subtle space-y-4 border-b pb-5">
            <h3 className="system-sm-semibold text-text-primary">
              {t('dataValidation.schedule.rule')}
            </h3>
            <SegmentedControl
              value={kind}
              onValueChange={(value) => setKind(value)}
              disabled={pending}
              aria-label={t('dataValidation.schedule.rule')}
            >
              <SegmentedControlItem value="INTERVAL">
                {t('dataValidation.schedule.interval')}
              </SegmentedControlItem>
              <SegmentedControlItem value="CRON">
                {t('dataValidation.schedule.cron')}
              </SegmentedControlItem>
            </SegmentedControl>
            {kind === 'INTERVAL' ? (
              <div className="flex flex-wrap items-end gap-3">
                <label
                  className="system-sm-medium text-text-secondary space-y-2"
                  htmlFor="validation-every"
                >
                  {t('dataValidation.schedule.every')}
                  <Input
                    id="validation-every"
                    className="w-28"
                    inputMode="numeric"
                    value={every}
                    onChange={(event) => setEvery(event.target.value)}
                    disabled={pending}
                    aria-invalid={every !== '' && !intervalValid}
                  />
                </label>
                <Select
                  value={unit}
                  onValueChange={(value) => {
                    if (value) setUnit(value)
                  }}
                  disabled={pending}
                >
                  <SelectTrigger aria-label={t('dataValidation.schedule.unit')} className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectPositioner>
                      <SelectPopup>
                        <SelectList>
                          {(['MINUTES', 'HOURS', 'DAYS'] as const).map((value) => (
                            <SelectItem key={value} value={value}>
                              <SelectItemText>
                                {t(`dataValidation.schedule.units.${value}`)}
                              </SelectItemText>
                            </SelectItem>
                          ))}
                        </SelectList>
                      </SelectPopup>
                    </SelectPositioner>
                  </SelectPortal>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="validation-cron" className="system-sm-medium text-text-secondary">
                  {t('dataValidation.schedule.expression')}
                </label>
                <Input
                  id="validation-cron"
                  value={expression}
                  onChange={(event) => setExpression(event.target.value)}
                  disabled={pending}
                  spellCheck={false}
                />
                <p className="system-xs-regular text-text-tertiary">
                  {t('dataValidation.schedule.fiveFields')}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="small"
                variant="ghost-accent"
                disabled={pending}
                onClick={() => {
                  setKind('INTERVAL')
                  setEvery('30')
                  setUnit('MINUTES')
                }}
              >
                {t('dataValidation.schedule.exampleInterval')}
              </Button>
              <Button
                size="small"
                variant="ghost-accent"
                disabled={pending}
                onClick={() => {
                  setKind('CRON')
                  setExpression('0 2 * * *')
                }}
              >
                {t('dataValidation.schedule.exampleDaily')}
              </Button>
            </div>
            <details className="system-xs-regular text-text-secondary">
              <summary className="cursor-pointer">{t('dataValidation.schedule.syntax')}</summary>
              <p className="mt-2 leading-5">{t('dataValidation.schedule.syntaxHelp')}</p>
            </details>
          </section>
          <section className="border-divider-subtle space-y-2 border-b pb-5">
            <label htmlFor="validation-zone" className="system-sm-medium text-text-secondary">
              {t('dataValidation.schedule.zone')}
            </label>
            <Input
              id="validation-zone"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              disabled={pending}
              spellCheck={false}
            />
            <p className="system-xs-regular text-text-tertiary">
              {t('dataValidation.schedule.zoneHelp')}
            </p>
          </section>
          <section className="border-divider-subtle space-y-2 border-b pb-5">
            <label htmlFor="validation-retention" className="system-sm-medium text-text-secondary">
              {t('dataValidation.schedule.retention')}
            </label>
            <Input
              id="validation-retention"
              className="w-24"
              inputMode="numeric"
              value={history}
              onChange={(event) => setHistory(event.target.value)}
              disabled={pending}
              aria-invalid={!historyValid}
            />
            <p className="system-xs-regular text-text-tertiary">
              {t('dataValidation.schedule.retentionHelp')}
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={!canSave}
              onClick={() => save(task.scheduleEnabled)}
            >
              {t('dataValidation.schedule.save')}
            </Button>
            <Button disabled={!canSave} onClick={() => save(true)}>
              {t('dataValidation.schedule.enable')}
            </Button>
            <Button
              variant="ghost"
              disabled={pending || !task.scheduleEnabled}
              onClick={() => void perform(onDisable)}
            >
              {t('dataValidation.schedule.disable')}
            </Button>
          </div>
          {!canSave && (
            <p className="system-xs-regular text-text-tertiary">
              {!historyValid
                ? t('dataValidation.schedule.retentionHelp')
                : t('dataValidation.schedule.previewRequired')}
            </p>
          )}
          <p className="system-xs-regular text-text-secondary">
            {t('dataValidation.schedule.independent')}
          </p>
        </div>
        <aside
          className="border-divider-subtle bg-background-section min-w-0 rounded-[10px] border p-4.5"
          aria-label={t('dataValidation.schedule.nextFive')}
        >
          <h3 className="system-sm-semibold text-text-primary">
            {t('dataValidation.schedule.nextFive')}
          </h3>
          <p className="system-xs-regular text-text-secondary mt-2 break-words">{zone}</p>
          {loading && (
            <p role="status" className="system-sm-regular text-text-secondary py-5">
              {t('dataValidation.schedule.previewLoading')}
            </p>
          )}
          {error != null && <ValidationRequestError error={error} />}
          {preview && (
            <ol className="divide-divider-subtle my-4 divide-y">
              {preview.occurrences.map((time, index) => (
                <li key={time.at} className="system-xs-regular text-text-secondary flex gap-3 py-3">
                  <span>{index + 1}</span>
                  <span>
                    <strong className="text-text-primary block font-medium">{time.local}</strong>
                    <span>
                      {time.offset} ·{' '}
                      {t(`dataValidation.weekdays.${time.weekday}`, { defaultValue: time.weekday })}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {!preview && !loading && !error && (
            <p className="system-sm-regular text-text-secondary py-5">
              {t('dataValidation.schedule.previewRequired')}
            </p>
          )}
          <p className="system-xs-regular text-text-tertiary leading-5">
            {t('dataValidation.schedule.skips')}
          </p>
          {preview && (
            <p className="system-xs-regular text-text-tertiary border-divider-subtle mt-3 border-t pt-3">
              {t('dataValidation.schedule.basis', { time: preview.base })}
            </p>
          )}
        </aside>
      </div>
      {savedObservation && (
        <section className="system-xs-regular text-text-secondary bg-background-section-burn rounded-lg p-3">
          <h3 className="font-medium">{t('dataValidation.schedule.observation')}</h3>
          <p className="mt-1 break-words">
            {t(`dataValidation.schedule.states.${savedObservation.state}`)} ·{' '}
            {savedObservation.observedAt}
          </p>
          {savedObservation.nextDue && (
            <p>{t('dataValidation.schedule.nextDue', { time: savedObservation.nextDue })}</p>
          )}
          {savedObservation.reason && <p className="mt-1 break-words">{savedObservation.reason}</p>}
        </section>
      )}
      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dataValidation.schedule.retentionConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dataValidation.schedule.retentionConfirm', {
                before: task.historyLimit,
                after: confirming?.historyLimit,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton onClick={() => setConfirming(null)}>
              {t('dataValidation.cancel')}
            </AlertDialogCancelButton>
            <AlertDialogConfirmButton
              onClick={() => {
                const request = confirming
                setConfirming(null)
                if (request)
                  void perform(() =>
                    onSave(request.schedule, request.enabled, request.historyLimit),
                  )
              }}
            >
              {t('dataValidation.confirm')}
            </AlertDialogConfirmButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
