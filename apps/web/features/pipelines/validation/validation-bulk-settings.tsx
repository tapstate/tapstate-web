import { Button } from '@tapstate-web/ui/button'
import { Input } from '@tapstate-web/ui/input'
import { Pagination } from '@tapstate-web/ui/pagination'
import { SegmentedControl, SegmentedControlItem } from '@tapstate-web/ui/segmented-control'
import { useRef, useState } from 'react'
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

import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
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
  pending: boolean
  onSave: (request: ValidationSave, comparisonFingerprint: string) => Promise<void>
  onStart: () => Promise<void>
  onSchedule: () => void
  onHistory: () => void
  onDefinitionConflict?: () => void
}

export function ValidationBulkSettings({
  pipelineId,
  client,
  task,
  hints,
  pending,
  onSave,
  onStart,
  onSchedule,
  onHistory,
  onDefinitionConflict,
}: Props) {
  const { t } = useTranslation()
  const [method, setMethod] = useState<ValidationMethod>(task?.method ?? 'FULL_COLUMN')
  const [rows, setRows] = useState<Row[]>(() =>
    hints.map((hint) => {
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
    }),
  )
  const [metadata, setMetadata] = useState<ValidationEvaluation | null>(null)
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [dirty, setDirty] = useState(!task)
  const inFlight = useRef(false)
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
  function change(index: number, update: (row: Row) => Row) {
    setRows((values) => values.map((row, i) => (i === index ? update(row) : row)))
    setDirty(true)
    setError(null)
  }
  async function perform(action: () => Promise<void>) {
    if (inFlight.current || pending) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failed) {
      if (
        failed instanceof PipelineClientError &&
        failed.status === 409 &&
        failed.params.field === 'configuration.taskRevision'
      )
        onDefinitionConflict?.()
      setError(failed)
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
          if (!mapping || row.pairs.some((pair) => pair.source || pair.target)) return row
          const candidates = mapping.source.candidates.filter(
            (candidate) => candidate.issues.length === 0,
          )
          const source = candidates.length === 1 ? candidates[0] : null
          if (!source) return row
          // Source candidates are independent hints. A cross-side pairing requires explicit user input.
          return { ...row, pairs: source.fields.map((field) => ({ source: field, target: '' })) }
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
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="system-lg-semibold text-text-primary">{t('dataValidation.bulk.title')}</h2>
          <p className="system-sm-regular text-text-secondary mt-2">
            {t('dataValidation.description')}
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
            setMetadata(null)
            setDirty(true)
          }}
          aria-label={t('dataValidation.method')}
        >
          {(['FULL_COLUMN', 'UNIQUE_KEY', 'COUNT'] as const).map((value) => (
            <SegmentedControlItem value={value} key={value}>
              {t(`dataValidation.methods.${value}`)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <p className="system-sm-regular text-text-secondary">{t('dataValidation.premise')}</p>
      {unresolved && (
        <p role="alert" className="system-sm-medium text-text-warning">
          {t('dataValidation.bulk.unresolved')}
        </p>
      )}
      {error != null && <ValidationRequestError error={error} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={filter}
          onValueChange={(value) => {
            setFilter(value)
            setPage(1)
          }}
          aria-label={t('dataValidation.bulk.filter')}
        >
          {['pending', 'included', 'excluded', 'all'].map((value) => (
            <SegmentedControlItem key={value} value={value}>
              {t(`dataValidation.bulk.${value}`)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Input
          className="max-w-64"
          aria-label={t('dataValidation.bulk.search')}
          placeholder={t('dataValidation.bulk.search')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
      </div>
      <div className="border-divider-subtle overflow-x-auto rounded-lg border">
        <table className="system-sm-regular w-full min-w-[700px] text-left">
          <thead className="bg-background-section-burn text-text-secondary">
            <tr>
              {['include', 'source', 'sourceKeys', 'target', 'targetKeys'].map((label) => (
                <th key={label} className="px-4 py-3">
                  {t(`dataValidation.bulk.${label}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice((safePage - 1) * 20, safePage * 20).map(({ row, index }) => {
              const mapping = metadata?.mappings.find(
                  (value) => value.id === row.hint.choice?.mappingId,
                ),
                saved = task?.mappings.find(
                  (value) => value.mappingId === row.hint.choice?.mappingId,
                )
              return (
                <tr key={row.hint.key} className="border-divider-subtle border-t align-top">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={row.included}
                      disabled={pending || busy}
                      aria-label={t('dataValidation.bulk.includeRow', {
                        table: row.hint.table ?? row.hint.outputId,
                      })}
                      onChange={(event) =>
                        change(index, (value) => ({ ...value, included: event.target.checked }))
                      }
                    />
                  </td>
                  <td className="max-w-64 p-4 break-words">
                    <span className="system-sm-semibold text-text-primary">
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
                    {row.hint.reason && (
                      <p className="text-text-warning mt-2">
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
                  <td className="space-y-2 p-4">
                    {method === 'COUNT'
                      ? '—'
                      : row.pairs.map((pair, i) => (
                          <div key={i}>
                            <Input
                              aria-label={t('dataValidation.bulk.keyLabel', {
                                side: t('dataValidation.bulk.source'),
                                table: row.hint.table ?? row.hint.outputId,
                                index: i + 1,
                              })}
                              value={pair.source}
                              list={`validation-source-${index}-${i}`}
                              disabled={!row.included || pending || busy}
                              onChange={(event) =>
                                change(index, (value) => ({
                                  ...value,
                                  confirmation: crypto.randomUUID(),
                                  pairs: value.pairs.map((current, j) =>
                                    j === i ? { ...current, source: event.target.value } : current,
                                  ),
                                }))
                              }
                            />
                            <datalist id={`validation-source-${index}-${i}`}>
                              {mapping?.source.fields.map((field) => (
                                <option key={field.name} value={field.name} />
                              ))}
                            </datalist>
                          </div>
                        ))}
                    {method !== 'COUNT' && (
                      <Button
                        size="small"
                        variant="ghost-accent"
                        disabled={!row.included || pending || busy || row.pairs.length >= 16}
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
                  <td className="max-w-64 p-4 break-words">
                    <span className="system-sm-semibold text-text-primary">
                      {mapping?.target.table ??
                        saved?.targetTable ??
                        t('dataValidation.bulk.evaluateTarget')}
                    </span>
                    <p className="system-xs-regular text-text-tertiary">
                      {mapping?.target.sourceId ?? row.hint.targetSourceId}
                    </p>
                  </td>
                  <td className="space-y-2 p-4">
                    {method === 'COUNT'
                      ? '—'
                      : row.pairs.map((pair, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              aria-label={t('dataValidation.bulk.keyLabel', {
                                side: t('dataValidation.bulk.target'),
                                table: row.hint.table ?? row.hint.outputId,
                                index: i + 1,
                              })}
                              value={pair.target}
                              list={`validation-target-${index}-${i}`}
                              disabled={!row.included || pending || busy}
                              onChange={(event) =>
                                change(index, (value) => ({
                                  ...value,
                                  confirmation: crypto.randomUUID(),
                                  pairs: value.pairs.map((current, j) =>
                                    j === i ? { ...current, target: event.target.value } : current,
                                  ),
                                }))
                              }
                            />
                            <datalist id={`validation-target-${index}-${i}`}>
                              {mapping?.target.fields.map((field) => (
                                <option key={field.name} value={field.name} />
                              ))}
                            </datalist>
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
          <Button variant="secondary" disabled={!ready} onClick={() => void save()}>
            {t('dataValidation.bulk.save')}
          </Button>
          <Button
            disabled={!task || dirty || pending || busy || task.closed}
            onClick={() => void perform(onStart)}
          >
            {t('dataValidation.bulk.start')}
          </Button>
        </div>
      </div>
      <p className="system-xs-regular text-text-tertiary">
        {t('dataValidation.bulk.keyConfirmation')}
      </p>
    </div>
  )
}
