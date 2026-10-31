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
import { SegmentedControl, SegmentedControlItem } from '@tapstate-web/ui/segmented-control'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationEvaluation,
  ValidationMethod,
  ValidationSave,
  ValidationTask,
} from '@/service/pipelines/validation-client'

import { PipelineClientError } from '@/service/pipelines/pipeline-client'

import type { ValidationMappingHint } from './validation-mapping-hints'

import { FieldAutocomplete } from '../components/reference-wizard/searchable-picker'
import { validationPrimaryActionClass } from './validation-presentation'
import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
const MAX_KEY_COMPONENTS = 32
type Pair = { source: string; target: string }
interface Row {
  hint: ValidationMappingHint
  included: boolean
  confirmation: string
  pairs: Pair[]
}
interface Props {
  pipelineId: string
  client: Client
  task: ValidationTask | null
  hints: readonly ValidationMappingHint[]
  fieldHints?: readonly ValidationMappingHint[]
  pending: boolean
  startBlocked?: boolean
  onSave: (request: ValidationSave, comparisonFingerprint: string) => Promise<void>
  onStart: () => Promise<void>
  onSchedule: () => void
  onHistory: () => void
  onDefinitionConflict?: () => void
  onError?: (error: unknown) => void
}

export function ValidationBulkSettings({
  pipelineId,
  client,
  task,
  hints,
  fieldHints = hints,
  pending,
  startBlocked = false,
  onSave,
  onStart,
  onSchedule,
  onHistory,
  onDefinitionConflict,
  onError,
}: Props) {
  const { t } = useTranslation()
  const fieldsByKey = useMemo(
    () => new Map(fieldHints.map((hint) => [hint.key, hint])),
    [fieldHints],
  )
  const fieldsForInspect = useRef(fieldsByKey)
  fieldsForInspect.current = fieldsByKey
  const [method, setMethod] = useState<ValidationMethod>(task?.method ?? 'FULL_COLUMN')
  const initialRow = (hint: ValidationMappingHint): Row => {
    const saved = task?.mappings.find((mapping) => mapping.mappingId === hint.choice?.mappingId)
    const pairs = saved?.keys?.fields.map((pair) => ({
      source: pair.source.length === 1 ? pair.source[0]! : '',
      target: pair.target.length === 1 ? pair.target[0]! : '',
    }))
    return {
      hint,
      included: task ? Boolean(saved) : true,
      confirmation: saved?.keys?.confirmationId ?? crypto.randomUUID(),
      pairs: pairs?.length ? pairs : [{ source: '', target: '' }],
    }
  }
  const [rows, setRows] = useState<Row[]>(() => hints.map(initialRow))
  useEffect(() => {
    setRows((previous) => {
      const byKey = new Map(previous.map((row) => [row.hint.key, row]))
      const next = hints.map((hint) => {
        const row = byKey.get(hint.key)
        if (!row) return initialRow(hint)
        byKey.delete(hint.key)
        // Retain user choices and their confirmation identity when advisory discovery arrives late.
        return {
          ...row,
          hint: {
            ...hint,
            choice:
              row.hint.choice && hint.choice
                ? { ...hint.choice, mappingId: row.hint.choice.mappingId }
                : hint.choice,
          },
        }
      })
      return [...next, ...byKey.values()]
    })
  }, [hints])
  const [metadata, setMetadata] = useState<ValidationEvaluation | null>(null)
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [dirty, setDirty] = useState(!task)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [excluding, setExcluding] = useState<readonly string[] | null>(null)
  const pageSelection = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const reportError = (value: unknown) => {
    setError(value)
    onError?.(value)
  }
  const requestRows = rows.filter((row) => row.included)
  const unresolved = requestRows.some((row) => !row.hint.choice)
  const missingKeys =
    method !== 'COUNT' &&
    requestRows.some((row) => row.pairs.some((pair) => !pair.source.trim() || !pair.target.trim()))
  const ready = requestRows.length > 0 && !unresolved && !missingKeys && !pending && !busy
  const choice = () => ({
    pipelineId,
    taskId: task?.taskId ?? 'full',
    ...(task ? { taskGeneration: task.taskGeneration } : {}),
    expectedRevision: task?.revision ?? '0',
    method,
    mappings: requestRows.flatMap((row) => (row.hint.choice ? [row.hint.choice] : [])),
    confirmations: Object.fromEntries(
      method === 'COUNT'
        ? []
        : requestRows
            .filter((row) => row.pairs.every((pair) => pair.source.trim() && pair.target.trim()))
            .map((row) => [
              row.hint.choice!.mappingId,
              { id: row.confirmation, fields: row.pairs },
            ]),
    ),
  })
  function participate(keys: readonly string[], included: boolean) {
    if (pending || busy) return
    const affected = new Set(keys)
    setRows((values) =>
      values.map((row) => (affected.has(row.hint.key) ? { ...row, included } : row)),
    )
    setSelected(new Set())
    setExcluding(null)
    setDirty(true)
    reportError(null)
  }
  function exclude(keys: readonly string[]) {
    if (pending || busy) return
    const affected = keys.filter((key) => rows.some((row) => row.hint.key === key && row.included))
    if (affected.length) setExcluding(affected)
  }
  function toggleSelection(keys: readonly string[], checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous)
      keys.forEach((key) => (checked ? next.add(key) : next.delete(key)))
      return next
    })
  }
  function change(index: number, update: (row: Row) => Row) {
    setRows((values) => values.map((row, i) => (i === index ? update(row) : row)))
    setDirty(true)
    reportError(null)
  }
  async function perform(action: () => Promise<void>) {
    if (inFlight.current || pending) return
    inFlight.current = true
    setBusy(true)
    reportError(null)
    try {
      await action()
    } catch (failed) {
      if (
        failed instanceof PipelineClientError &&
        failed.status === 409 &&
        failed.params.field === 'configuration.taskRevision'
      )
        onDefinitionConflict?.()
      reportError(failed)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  async function inspect() {
    if (unresolved || !requestRows.length) return
    await perform(async () => {
      const evaluated = await client.evaluate({ ...choice(), confirmations: {} })
      setMetadata(evaluated)
      // Recommendations are visible drafts. Saving is the user's explicit key confirmation.
      setRows((values) =>
        values.map((row) => {
          const mapping = evaluated.mappings.find(
            (value) => value.id === row.hint.choice?.mappingId,
          )
          if (!mapping) return row
          const targetNames = new Map<string, number>()
          for (const name of fieldsForInspect.current.get(row.hint.key)?.targetFields ??
            row.hint.targetFields ??
            [])
            targetNames.set(name, (targetNames.get(name) ?? 0) + 1)
          const targetFor = (name: string) => (targetNames.get(name) === 1 ? name : '')
          // Exact loaded-model names are editable hints, never an independent uniqueness claim.
          if (row.pairs.some((pair) => pair.source || pair.target)) {
            const pairs = row.pairs.map((pair) =>
              pair.target || !pair.source ? pair : { ...pair, target: targetFor(pair.source) },
            )
            return { ...row, pairs }
          }
          const candidates = mapping.source.candidates.filter(
            (candidate) => candidate.issues.length === 0,
          )
          const source = candidates.length === 1 ? candidates[0] : null
          if (!source) return row
          // Preserve source order; never zip independently ordered source and destination keys.
          return {
            ...row,
            pairs: source.fields.map((field) => ({ source: field, target: targetFor(field) })),
          }
        }),
      )
    })
  }
  async function save() {
    if (!ready) return
    await perform(async () => {
      const input = choice(),
        evaluated = await client.evaluate(input)
      setMetadata(evaluated)
      if (!evaluated.fingerprint || !evaluated.comparisonFingerprint) return
      await onSave(
        {
          input,
          fingerprint: evaluated.fingerprint,
          commandId: crypto.randomUUID(),
          historyLimit: task?.historyLimit ?? 10,
          schedule: task?.schedule ?? null,
          scheduleEnabled: task?.scheduleEnabled ?? false,
        },
        evaluated.comparisonFingerprint,
      )
      setDirty(false)
    })
  }
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const needs =
        !row.hint.choice ||
        (method !== 'COUNT' && row.pairs.some((pair) => !pair.source || !pair.target))
      return (
        (filter === 'all' ||
          (filter === 'included' && row.included) ||
          (filter === 'excluded' && !row.included) ||
          (filter === 'pending' && row.included && needs)) &&
        `${row.hint.table ?? ''} ${row.hint.outputId} ${row.hint.sourceId ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    })
  const pages = Math.ceil(visible.length / 20),
    safePage = Math.min(page, Math.max(1, pages))
  const pageRows = visible.slice((safePage - 1) * 20, safePage * 20)
  const selectedPage = pageRows.filter(({ row }) => selected.has(row.hint.key)).length
  const needs = rows.filter(
    (row) =>
      row.included &&
      (!row.hint.choice ||
        (method !== 'COUNT' &&
          row.pairs.some((pair) => !pair.source.trim() || !pair.target.trim()))),
  ).length
  const included = requestRows.length
  const excluded = rows.length - included
  return (
    <form
      className="validation-bulk space-y-5"
      aria-label={t('dataValidation.bulk.title')}
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="system-lg-semibold text-text-primary">{t('dataValidation.bulk.title')}</h2>
          <p className="system-sm-regular text-text-secondary mt-2">
            {t('dataValidation.bulk.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            disabled={!task || pending || busy || dirty}
            onClick={onSchedule}
          >
            {t('dataValidation.schedule.title')}
          </Button>
          <Button variant="secondary" size="small" onClick={onHistory}>
            {t('dataValidation.history.title')}
          </Button>
        </div>
      </div>
      <div className="border-divider-subtle flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <p className="system-sm-medium text-text-secondary">
          {t('dataValidation.mappingCount', {
            count: rows.filter((row) => row.hint.choice).length,
          })}{' '}
          · {t('dataValidation.concurrencyOne')}
        </p>
        <SegmentedControl
          value={method}
          disabled={pending || busy}
          onValueChange={(value) => {
            setMethod(value)
            setSelected(new Set())
            setMetadata(null)
            setDirty(true)
          }}
          aria-label={t('dataValidation.method')}
          className="gap-3 bg-transparent p-0"
        >
          {(['FULL_COLUMN', 'UNIQUE_KEY', 'COUNT'] as const).map((value) => (
            <SegmentedControlItem
              value={value}
              key={value}
              className="gap-2 border-none bg-transparent shadow-none data-checked:bg-transparent data-checked:shadow-none"
            >
              <span
                aria-hidden="true"
                className={`h-3.5 w-3.5 rounded-full border ${method === value ? 'border-text-accent bg-text-accent' : 'border-divider-regular'}`}
              />
              {t(`dataValidation.methods.${value}`)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div
        role="status"
        className={`system-sm-regular rounded-lg border p-4 ${needs ? 'border-divider-subtle bg-background-section-burn text-text-primary' : 'border-divider-subtle text-text-secondary'}`}
      >
        <p className="font-semibold">
          {t(needs ? 'dataValidation.bulk.needsCount' : 'dataValidation.bulk.readyCount', {
            count: needs || included,
          })}
        </p>
        <p className="system-xs-regular mt-1">{t('dataValidation.bulk.nextRun')}</p>
        {needs > 0 && (
          <Button
            size="small"
            variant="ghost-accent"
            onClick={() => {
              setFilter('pending')
              setSelected(new Set())
              setPage(1)
            }}
          >
            {t('dataValidation.bulk.showPending')}
          </Button>
        )}
      </div>
      <p className="system-xs-regular text-text-secondary">{t('dataValidation.premise')}</p>
      {startBlocked && (
        <p role="status" className="system-sm-regular text-text-secondary">
          {t('dataValidation.run.slotBusy')}
        </p>
      )}
      {unresolved && (
        <p role="alert" className="system-sm-medium text-text-primary">
          {t('dataValidation.bulk.unresolved')}
        </p>
      )}
      {!onError && error != null && <ValidationRequestError error={error} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={filter}
          onValueChange={(value) => {
            setFilter(value)
            setSelected(new Set())
            setPage(1)
          }}
          aria-label={t('dataValidation.bulk.filter')}
        >
          {['pending', 'included', 'excluded', 'all'].map((value) => (
            <SegmentedControlItem key={value} value={value}>
              {t(`dataValidation.bulk.${value}`)}{' '}
              <span className="ml-1 tabular-nums">
                {value === 'pending'
                  ? needs
                  : value === 'included'
                    ? included
                    : value === 'excluded'
                      ? excluded
                      : rows.length}
              </span>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Input
          className="max-w-64"
          aria-label={t('dataValidation.bulk.search')}
          form=""
          placeholder={t('dataValidation.bulk.search')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setSelected(new Set())
            setPage(1)
          }}
        />
      </div>
      <div className="system-xs-regular text-text-secondary flex min-h-9 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {selected.size ? (
            <>
              <span>{t('dataValidation.bulk.selectionCount', { count: selected.size })}</span>
              {selectedPage === pageRows.length && visible.length > selected.size && (
                <Button
                  size="small"
                  variant="ghost-accent"
                  disabled={pending || busy}
                  onClick={() => setSelected(new Set(visible.map(({ row }) => row.hint.key)))}
                >
                  {t('dataValidation.bulk.selectFiltered', { count: visible.length })}
                </Button>
              )}
              <Button
                size="small"
                variant="ghost-accent"
                disabled={pending || busy}
                onClick={() => exclude([...selected])}
              >
                {t('dataValidation.bulk.excludeSelected')}
              </Button>
              <Button
                size="small"
                variant="ghost-accent"
                disabled={pending || busy}
                onClick={() => participate([...selected], true)}
              >
                {t('dataValidation.bulk.restoreSelected')}
              </Button>
              <Button size="small" variant="ghost" onClick={() => setSelected(new Set())}>
                {t('dataValidation.bulk.clearSelection')}
              </Button>
            </>
          ) : (
            <span>{t('dataValidation.bulk.selectionHelp')}</span>
          )}
        </div>
        <span>{t('dataValidation.bulk.editableFields')}</span>
      </div>
      <div className="border-divider-subtle max-h-[430px] overflow-auto rounded-lg border">
        <table className="system-xs-regular w-full min-w-[880px] table-fixed text-left">
          <thead className="bg-background-section-burn text-text-secondary">
            <tr>
              <th className="bg-background-section-burn sticky top-0 z-10 w-10 px-3 py-2">
                <input
                  ref={(node) => {
                    pageSelection.current = node
                    if (node)
                      node.indeterminate = selectedPage > 0 && selectedPage < pageRows.length
                  }}
                  type="checkbox"
                  aria-label={t('dataValidation.bulk.selectPage')}
                  checked={pageRows.length > 0 && selectedPage === pageRows.length}
                  disabled={!pageRows.length || pending || busy}
                  onChange={(event) =>
                    toggleSelection(
                      pageRows.map(({ row }) => row.hint.key),
                      event.target.checked,
                    )
                  }
                />
              </th>
              {['source', 'sourceKeys', 'target', 'targetKeys', 'participation'].map((label) => (
                <th key={label} className="bg-background-section-burn sticky top-0 z-10 px-3 py-2">
                  {t(`dataValidation.bulk.${label}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ row, index }) => {
              const mapping = metadata?.mappings.find(
                  (value) => value.id === row.hint.choice?.mappingId,
                ),
                saved = task?.mappings.find(
                  (value) => value.mappingId === row.hint.choice?.mappingId,
                )
              const fields = fieldsByKey.get(row.hint.key) ?? row.hint
              const sourceOptions = (fields.sourceFields ?? []).map((name) => ({
                value: name,
                label: name,
              }))
              const targetOptions = (fields.targetFields ?? []).map((name) => ({
                value: name,
                label: name,
              }))
              return (
                <tr
                  key={row.hint.key}
                  className={`border-divider-subtle border-t align-top ${row.included ? '' : 'text-text-tertiary bg-background-section-burn/30'}`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(row.hint.key)}
                      disabled={pending || busy}
                      aria-label={t('dataValidation.bulk.selectRow', {
                        table: row.hint.table ?? row.hint.outputId,
                      })}
                      onChange={(event) => toggleSelection([row.hint.key], event.target.checked)}
                    />
                  </td>
                  <td className="max-w-64 px-3 py-2.5 break-words">
                    <span
                      className={`system-xs-semibold font-mono ${row.included ? 'text-text-primary' : 'text-text-tertiary line-through'}`}
                    >
                      {row.hint.table ?? row.hint.outputId}
                    </span>
                    <p className="system-xs-regular text-text-tertiary">{row.hint.sourceId}</p>
                    {mapping && method !== 'COUNT' && (
                      <details className="system-xs-regular text-text-secondary mt-2">
                        <summary>{t('dataValidation.bulk.candidates')}</summary>
                        {(
                          [
                            ['source', mapping.source],
                            ['target', mapping.target],
                          ] as const
                        ).map(([label, side]) => (
                          <div key={label} className="mt-2 space-y-1">
                            <p>{t(`dataValidation.bulk.${label}`)}</p>
                            {side.candidates.map((candidate, i) => (
                              <p key={i}>
                                {candidate.origin}: {candidate.fields.join(' + ')}
                                {candidate.issues.length ? ` · ${candidate.issues.join(', ')}` : ''}
                              </p>
                            ))}
                            {side.pipelineWriteKeyUnknown && (
                              <p>{t('dataValidation.bulk.writeKeyUnknown')}</p>
                            )}
                          </div>
                        ))}
                      </details>
                    )}
                    {!row.included && (
                      <p className="system-xs-regular mt-1">
                        {t('dataValidation.bulk.excludedRow')}
                      </p>
                    )}
                    {row.included &&
                      method !== 'COUNT' &&
                      row.pairs.some((pair) => !pair.source.trim() || !pair.target.trim()) && (
                        <p className="system-xs-regular text-text-primary mt-1">
                          {t('dataValidation.bulk.keysRequired')}
                        </p>
                      )}
                    {row.hint.reason && (
                      <p className="text-text-primary mt-2">
                        {t(`dataValidation.bulk.reasons.${row.hint.reason}`)}
                      </p>
                    )}
                    {row.hint.retainedDiscoveryAt !== null && (
                      <p className="system-xs-regular text-text-tertiary mt-2">
                        {t('dataValidation.bulk.discovery', {
                          time: new Date(row.hint.retainedDiscoveryAt).toLocaleString(),
                        })}
                      </p>
                    )}
                  </td>
                  <td className="space-y-2 px-3 py-2.5">
                    {method === 'COUNT'
                      ? '—'
                      : row.pairs.map((pair, i) => (
                          <div key={i}>
                            <FieldAutocomplete
                              ariaLabel={t('dataValidation.bulk.keyLabel', {
                                side: t('dataValidation.bulk.source'),
                                table: row.hint.table ?? row.hint.outputId,
                                index: i + 1,
                              })}
                              openLabel={`${t('wizard.search.openOptions')} · ${t('dataValidation.bulk.source')} · ${row.hint.table ?? row.hint.outputId} · ${i + 1}`}
                              emptyLabel={t('wizard.search.noResults')}
                              placeholder={t('dataValidation.bulk.fieldPlaceholder')}
                              value={pair.source}
                              options={sourceOptions}
                              disabled={!row.included || pending || busy}
                              onValueChange={(field) =>
                                change(index, (value) => ({
                                  ...value,
                                  confirmation: crypto.randomUUID(),
                                  pairs: value.pairs.map((current, j) =>
                                    j === i ? { ...current, source: field } : current,
                                  ),
                                }))
                              }
                            />
                          </div>
                        ))}
                    {method !== 'COUNT' && (
                      <Button
                        size="small"
                        variant="ghost-accent"
                        disabled={
                          !row.included || pending || busy || row.pairs.length >= MAX_KEY_COMPONENTS
                        }
                        onClick={() =>
                          change(index, (value) => ({
                            ...value,
                            confirmation: crypto.randomUUID(),
                            pairs: [...value.pairs, { source: '', target: '' }],
                          }))
                        }
                      >
                        {t('dataValidation.bulk.addKey')}
                      </Button>
                    )}
                  </td>
                  <td className="max-w-64 px-3 py-2.5 break-words">
                    <span className="system-sm-semibold text-text-primary">
                      {mapping?.target.table ??
                        saved?.targetTable ??
                        t('dataValidation.bulk.evaluateTarget')}
                    </span>
                    <p className="system-xs-regular text-text-tertiary">
                      {mapping?.target.sourceId ?? row.hint.targetSourceId}
                    </p>
                  </td>
                  <td className="space-y-2 px-3 py-2.5">
                    {method === 'COUNT'
                      ? '—'
                      : row.pairs.map((pair, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <FieldAutocomplete
                              ariaLabel={t('dataValidation.bulk.keyLabel', {
                                side: t('dataValidation.bulk.target'),
                                table: row.hint.table ?? row.hint.outputId,
                                index: i + 1,
                              })}
                              openLabel={`${t('wizard.search.openOptions')} · ${t('dataValidation.bulk.target')} · ${row.hint.table ?? row.hint.outputId} · ${i + 1}`}
                              emptyLabel={t('wizard.search.noResults')}
                              placeholder={t('dataValidation.bulk.fieldPlaceholder')}
                              value={pair.target}
                              options={targetOptions}
                              disabled={!row.included || pending || busy}
                              onValueChange={(field) =>
                                change(index, (value) => ({
                                  ...value,
                                  confirmation: crypto.randomUUID(),
                                  pairs: value.pairs.map((current, j) =>
                                    j === i ? { ...current, target: field } : current,
                                  ),
                                }))
                              }
                            />
                            {row.pairs.length > 1 && (
                              <Button
                                size="small"
                                variant="ghost-accent"
                                aria-label={t('dataValidation.bulk.removeKey', { index: i + 1 })}
                                disabled={pending || busy}
                                onClick={() =>
                                  change(index, (value) => ({
                                    ...value,
                                    confirmation: crypto.randomUUID(),
                                    pairs: value.pairs.filter((_, j) => j !== i),
                                  }))
                                }
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        ))}
                  </td>
                  <td className="p-3">
                    <Button
                      size="small"
                      variant="ghost-accent"
                      disabled={pending || busy}
                      aria-label={t(
                        row.included
                          ? 'dataValidation.bulk.excludeRow'
                          : 'dataValidation.bulk.restoreRow',
                        { table: row.hint.table ?? row.hint.outputId },
                      )}
                      onClick={() => participate([row.hint.key], !row.included)}
                    >
                      {t(
                        row.included
                          ? 'dataValidation.bulk.exclude'
                          : 'dataValidation.bulk.restore',
                      )}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className="system-sm-regular text-text-secondary">{t('dataValidation.bulk.noRows')}</p>
      )}
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
      <div className="border-divider-subtle flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <p className="system-sm-regular text-text-secondary">
          {t('dataValidation.bulk.scopeSummary', { included, excluded, needs })}
          <br />
          {t('dataValidation.bulk.selected', {
            count: requestRows.filter((row) => row.hint.choice).length,
          })}
          {missingKeys && ` · ${t('dataValidation.bulk.keysRequired')}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={unresolved || !requestRows.length || pending || busy}
            onClick={() => void inspect()}
          >
            {t('dataValidation.bulk.inspect')}
          </Button>
          <Button
            variant={ready && (!task || dirty) ? 'primary' : 'secondary'}
            className={validationPrimaryActionClass}
            disabled={!ready}
            type="submit"
          >
            {t('dataValidation.bulk.save')}
          </Button>
          <Button
            variant={task && !dirty ? 'primary' : 'secondary'}
            className={validationPrimaryActionClass}
            disabled={!task || dirty || pending || busy || task.closed || startBlocked}
            onClick={() => void perform(onStart)}
          >
            {t('dataValidation.bulk.start')}
          </Button>
        </div>
      </div>
      <p className="system-xs-regular text-text-tertiary">
        {t('dataValidation.bulk.keyConfirmation')}
      </p>
      <AlertDialog
        open={excluding !== null}
        onOpenChange={(open) => {
          if (!open) setExcluding(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dataValidation.bulk.excludeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dataValidation.bulk.excludeDescription', { count: excluding?.length ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton onClick={() => setExcluding(null)}>
              {t('dataValidation.bulk.cancelScope')}
            </AlertDialogCancelButton>
            <AlertDialogConfirmButton
              disabled={pending || busy}
              onClick={() => {
                if (excluding) participate(excluding, false)
              }}
            >
              {t('dataValidation.bulk.confirmExclude')}
            </AlertDialogConfirmButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
