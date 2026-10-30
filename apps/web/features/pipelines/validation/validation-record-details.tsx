import { Input } from '@tapstate-web/ui/input'
import { Pagination } from '@tapstate-web/ui/pagination'
import { SegmentedControl, SegmentedControlItem } from '@tapstate-web/ui/segmented-control'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ValidationReport, ValidationRootDetail } from '@/service/pipelines/validation-client'

import {
  validationRecordObservation,
  validationSampleCell,
  type CellValue,
  type RecordFinding,
  type RecordSample,
} from './validation-record-view'
import {
  ValidationValueView,
  validationScalarText,
  validationLiteralName,
} from './validation-value-view'
import { ValidationRequestError } from './validation-view-parts'

function category(kind: string): string {
  if (kind.startsWith('SOURCE_')) return 'source'
  if (kind === 'TARGET_VALUE' || kind === 'TARGET_TYPE') return 'values'
  if (kind === 'TARGET_MISSING' || kind === 'TARGET_EXTRA') return 'presence'
  return 'identity'
}
function fieldPath(parts: readonly (string | number)[]): string {
  return parts
    .map((part, index) =>
      typeof part === 'number'
        ? `[${part}]`
        : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(part)
          ? (index ? '.' : '') + part
          : `[${validationLiteralName(part)}]`,
    )
    .join('')
}
function Cell({ cell }: { cell: CellValue }) {
  const { t } = useTranslation()
  if (cell.state === 'PRESENT') return <ValidationValueView value={cell.value} />
  if (cell.state === 'UNAVAILABLE')
    return (
      <div className="space-y-2">
        <p className="text-text-warning">{t('dataValidation.record.valueUnavailable')}</p>
        <details>
          <summary>{t('dataValidation.technicalDetails')}</summary>
          <ValidationValueView value={cell.raw} />
        </details>
      </div>
    )
  return (
    <span className="system-xs-medium bg-background-section-burn text-text-secondary inline-block rounded px-2 py-1">
      {t(`dataValidation.record.cells.${cell.state}`)}
    </span>
  )
}
function DifferenceSnippet({ source, target }: { source: CellValue; target: CellValue }) {
  const { t } = useTranslation()
  if (source.state !== 'PRESENT' || target.state !== 'PRESENT') return null
  let left = source.value,
    right = target.value
  while (left.type === 'typed') left = left.value
  while (right.type === 'typed') right = right.value
  if (typeof left.value !== 'string' || typeof right.value !== 'string') return null
  const a = validationScalarText(left),
    b = validationScalarText(right)
  if ((a.length <= 512 && b.length <= 512) || a === b) return null
  let first = 0
  while (first < a.length && first < b.length && a[first] === b[first]) first++
  const start = Math.max(0, first - 40)
  return (
    <div className="system-xs-regular text-text-secondary mt-2 space-y-1">
      <p>{t('dataValidation.record.fragment', { position: first + 1 })}</p>
      <pre className="max-w-56 overflow-auto break-all whitespace-pre-wrap">
        {a.slice(start, first + 60)}
      </pre>
      <pre className="text-text-destructive max-w-56 overflow-auto break-all whitespace-pre-wrap">
        {b.slice(start, first + 60)}
      </pre>
    </div>
  )
}
export function ValidationRecordDetails({
  detail,
  pending,
  error,
  mappings,
}: {
  detail: ValidationRootDetail | null | undefined
  pending: boolean
  error: unknown
  mappings: ValidationReport['mappings']
}) {
  const { t } = useTranslation(),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(1)
  const observation = useMemo(
    () => (detail ? validationRecordObservation(detail.observation) : null),
    [detail],
  )
  if (pending) return <p role="status">{t('dataValidation.loading')}</p>
  if (error) return <ValidationRequestError error={error} />
  if (!detail) return <p>{t('dataValidation.report.absent')}</p>
  const mapping = mappings.find(
    (value) => value.id === detail.root.mappingId && value.output === detail.root.outputId,
  )
  if (!mapping) return <p role="alert">{t('dataValidation.record.mappingUnavailable')}</p>
  const findings = observation?.findings ?? [],
    matching = findings.filter(
      (finding) =>
        (filter === 'all' || category(finding.kind) === filter) &&
        finding.path.map(String).join(' / ').toLowerCase().includes(search.toLowerCase()),
    )
  const rows = matching.flatMap<{ finding: RecordFinding; sample: RecordSample | null }>(
      (finding) =>
        finding.samples.length
          ? finding.samples.map((sample) => ({ finding, sample }))
          : [{ finding, sample: null }],
    ),
    pages = Math.ceil(rows.length / 20),
    safePage = Math.min(page, Math.max(1, pages))
  function issue(finding: RecordFinding) {
    return t(`dataValidation.record.kinds.${finding.kind}`, { defaultValue: finding.kind })
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="system-sm-semibold text-text-primary">
          {mapping.source.source} · {mapping.source.table} → {mapping.target.source} ·{' '}
          {mapping.target.table}
        </p>
        <p className="system-sm-regular text-text-secondary mt-2">
          {t('dataValidation.record.readOnly')}
        </p>
      </div>
      {!observation ? (
        <>
          <p role="alert" className="text-text-warning">
            {t('dataValidation.record.valueUnavailable')}
          </p>
          <ValidationValueView value={detail.observation} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="system-sm-semibold text-text-primary">
              {t('dataValidation.record.findings', { count: findings.length })}
            </h3>
            <Input
              className="max-w-64"
              aria-label={t('dataValidation.record.search')}
              placeholder={t('dataValidation.record.search')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <SegmentedControl
            value={filter}
            onValueChange={(value) => {
              setFilter(value)
              setPage(1)
            }}
            aria-label={t('dataValidation.record.filter')}
          >
            {['all', 'values', 'presence', 'identity', 'source'].map((value) => (
              <SegmentedControlItem key={value} value={value}>
                {t(`dataValidation.record.categories.${value}`)}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          {observation.samplesTruncated && (
            <p role="status" className="system-sm-regular text-text-warning">
              {t('dataValidation.record.samplesTruncated')}
            </p>
          )}
          <div className="border-divider-subtle overflow-x-auto rounded-lg border">
            <table className="system-sm-regular w-full min-w-[650px] text-left">
              <thead className="text-text-secondary bg-background-section-burn">
                <tr>
                  {['field', 'sourceValue', 'targetValue', 'finding'].map((label) => (
                    <th className="px-3 py-3" key={label}>
                      {t(`dataValidation.record.${label}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice((safePage - 1) * 20, safePage * 20)
                  .map(({ finding, sample }, index) => {
                    const source = validationSampleCell(sample?.source ?? null, finding.path),
                      target = validationSampleCell(sample?.target ?? null, finding.path)
                    return (
                      <tr
                        key={(safePage - 1) * 20 + index}
                        className="border-divider-subtle border-t align-top"
                      >
                        <td className="max-w-48 px-3 py-4 break-all">
                          <code>
                            {finding.path.length
                              ? fieldPath(finding.path)
                              : t('dataValidation.record.wholeRow')}
                          </code>
                        </td>
                        <td className="max-w-64 space-y-3 px-3 py-4">
                          <Cell cell={source} />
                          {sample?.source && (
                            <details>
                              <summary className="system-xs-regular text-text-secondary">
                                {t('dataValidation.record.actualIdentity')}
                              </summary>
                              <p className="system-xs-regular my-2 break-all">
                                {t('dataValidation.record.readId')}: {sample.source.readId}
                              </p>
                              <ValidationValueView value={sample.source.identity} />
                            </details>
                          )}
                        </td>
                        <td className="bg-background-section-burn max-w-64 space-y-3 px-3 py-4">
                          <Cell cell={target} />
                          {sample?.target && (
                            <details>
                              <summary className="system-xs-regular text-text-secondary">
                                {t('dataValidation.record.actualIdentity')}
                              </summary>
                              <p className="system-xs-regular my-2 break-all">
                                {t('dataValidation.record.readId')}: {sample.target.readId}
                              </p>
                              <ValidationValueView value={sample.target.identity} />
                            </details>
                          )}
                        </td>
                        <td className="max-w-56 px-3 py-4">
                          <span className="text-text-warning system-xs-medium">
                            {issue(finding)}
                          </span>
                          <p className="system-xs-regular text-text-secondary mt-2">
                            {finding.count === null
                              ? t('dataValidation.record.findingCountUnknown')
                              : t('dataValidation.record.findingCount', { value: finding.count })}
                          </p>
                          {finding.multiplicity && (
                            <p className="system-xs-regular text-text-secondary mt-2">
                              {t(
                                finding.multiplicity.exact
                                  ? 'dataValidation.record.occurrences'
                                  : 'dataValidation.record.atLeast',
                                { count: finding.multiplicity.occurrences },
                              )}
                            </p>
                          )}
                          <DifferenceSnippet source={source} target={target} />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="system-sm-regular text-text-secondary">
              {t('dataValidation.record.noMatchingFindings')}
            </p>
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
          {observation.notCompared && (
            <details className="border-divider-subtle border-t pt-4">
              <summary className="system-sm-medium text-text-secondary">
                {t('dataValidation.record.notCompared')}
              </summary>
              <ValidationValueView value={observation.notCompared} />
            </details>
          )}
        </>
      )}
      <details className="border-divider-subtle border-t pt-4">
        <summary className="system-sm-medium text-text-secondary">
          {t('dataValidation.record.fullKey')}
        </summary>
        <p className="system-xs-regular text-text-tertiary my-3">
          {t('dataValidation.record.keyMeaning')}
        </p>
        <div className="overflow-x-auto">
          <table className="system-xs-regular w-full min-w-[500px] text-left">
            <thead>
              <tr>
                <th className="p-2">{t('dataValidation.bulk.sourceKeys')}</th>
                <th className="p-2">{t('dataValidation.bulk.targetKeys')}</th>
                <th className="p-2">{t('dataValidation.record.matchValue')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.root.key.map((part, index) => (
                <tr key={index} className="border-divider-subtle border-t">
                  <td className="p-2 break-all">
                    {mapping.keys?.source[index]?.path
                      .map((name) => JSON.stringify(name))
                      .join(' / ') ?? t('dataValidation.unknown')}
                  </td>
                  <td className="p-2 break-all">
                    {mapping.keys?.target[index]?.path
                      .map((name) => JSON.stringify(name))
                      .join(' / ') ?? t('dataValidation.unknown')}
                  </td>
                  <td className="p-2">
                    <span className="text-text-tertiary">{part.domain}</span>
                    <ValidationValueView value={part.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {observation?.reads && (
        <details className="border-divider-subtle border-t pt-4">
          <summary className="system-sm-medium text-text-secondary">
            {t('dataValidation.report.readTimes')}
          </summary>
          <ValidationValueView value={observation.reads} />
        </details>
      )}
    </div>
  )
}
