import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@tapstate-web/ui/button'
import {
  Drawer,
  DrawerPortal,
  DrawerBackdrop,
  DrawerViewport,
  DrawerPopup,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from '@tapstate-web/ui/drawer'
import { Input } from '@tapstate-web/ui/input'
import { Pagination } from '@tapstate-web/ui/pagination'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationReference,
  ValidationRootDetail,
  ValidationRootSummary,
  ValidationValue,
} from '@/service/pipelines/validation-client'

import { ValidationFailureDetails } from './validation-failure-details'
import { validationClientKey } from './validation-query-key'
import { ValidationRecordDetails } from './validation-record-details'
import { validationRecordObservation, validationSampleCell } from './validation-record-view'
import {
  validationRootMatchesCategory,
  validationRootKinds,
  validationFieldPath,
} from './validation-report-facts'
import { ValidationValueView, validationScalarText } from './validation-value-view'
import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
function valueMatches(value: ValidationValue, needle: string): boolean {
  if (
    Object.entries(value.metadata).some(
      ([name, text]) => name.toLowerCase().includes(needle) || text.toLowerCase().includes(needle),
    )
  )
    return true
  if (value.type === 'typed') return valueMatches(value.value, needle)
  if (value.type === 'array') return value.value.some((item) => valueMatches(item, needle))
  if (value.type === 'object')
    return value.value.some(
      (item) => item.name.toLowerCase().includes(needle) || valueMatches(item.value, needle),
    )
  return (
    String(value.value).toLowerCase().includes(needle) ||
    validationScalarText(value).toLowerCase().includes(needle)
  )
}
type ReportPanelProps = {
  client: Client
  reference: ValidationReference
  live?: boolean
}
type ListPosition = { search: string; page: number; filter: string }
const initialPosition: ListPosition = { search: '', page: 1, filter: 'all' }

export function ValidationReportPanel(props: ReportPanelProps) {
  return (
    <ValidationReportView
      key={JSON.stringify([validationClientKey(props.client), props.reference])}
      {...props}
    />
  )
}

function ValidationReportView({ client, reference, live = false }: ReportPanelProps) {
  const { t } = useTranslation(),
    [table, setTable] = useState<string | null>(null),
    [root, setRoot] = useState<string | null>(null),
    [positions, setPositions] = useState<Record<string, ListPosition>>({}),
    [layout, setLayout] = useState<'split' | 'expanded'>('split')
  const queryClient = useQueryClient()
  const readTail = useRef<Promise<unknown>>(Promise.resolve())
  const selectedForRead = useRef<string | null>(null)
  const readRoot = (id: string, signal: AbortSignal) => {
    const read = () => {
      if (signal.aborted) throw new DOMException('Root read was cancelled.', 'AbortError')
      return client.root(reference, id, signal)
    }
    const next = readTail.current.then(read, read)
    readTail.current = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
  const location = JSON.stringify(table)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const identity = JSON.stringify(reference)
  const report = useQuery({
    queryKey: ['validation', 'report', validationClientKey(client), identity],
    queryFn: ({ signal }) => client.report(reference, signal),
    retry: false,
    refetchInterval: (query) =>
      live && (!query.state.data || !query.state.data.closed) ? 2000 : false,
  })
  const defaultPosition = {
    ...initialPosition,
    filter:
      table === null && report.data?.result === 'COMPLETE_WITH_OBSERVATIONS' ? 'issues' : 'all',
  }
  const { search, page, filter } = positions[location] ?? defaultPosition
  const updatePosition = (change: Partial<ListPosition>) =>
    setPositions((previous) => ({
      ...previous,
      [location]: { ...(previous[location] ?? defaultPosition), ...change },
    }))
  const setPage = (page: number) => updatePosition({ page })
  const roots = useQuery({
    queryKey: [
      'validation',
      'roots',
      validationClientKey(client),
      identity,
      report.data?.rootCount,
      report.data?.closed,
    ],
    queryFn: async ({ signal }) => {
      // Only bounded root summaries are retained, never all record bodies. Search covers the full observed index.
      if (report.data?.rootCount === '0') return { items: [], total: '0' }
      const first = await client.roots(reference, { offset: 0, limit: 20 }, signal)
      if (first === null) return null
      if (BigInt(first.total) > 4096n)
        throw new Error('Validation root index exceeds the admitted bound.')
      const items = [...first.items]
      for (let offset = 20; BigInt(offset) < BigInt(first.total); offset += 20) {
        const next = await client.roots(reference, { offset, limit: 20 }, signal)
        if (next === null) return null
        items.push(...next.items)
      }
      return { items, total: first.total }
    },
    enabled: !!report.data && report.data.method !== 'COUNT' && report.data.closed,
    retry: false,
  })
  const indexed = roots.data?.items ?? []
  const indexReady =
    report.data?.rootCount === '0' ||
    (roots.isSuccess &&
      roots.data !== null &&
      BigInt(indexed.length) === BigInt(report.data?.rootCount ?? '0'))
  const tableRoots = (mapping: string) => indexed.filter((item) => item.root.mappingId === mapping)
  const tableState = (mapping: string) => {
    const count = report.data?.counts.find((item) => item.mapping === mapping)
    if (report.data?.method === 'COUNT')
      return count ? (count.difference !== '0' ? 'issues' : 'clear') : 'incomplete'
    if (!indexReady) return 'unknown'
    const found = tableRoots(mapping)
    if (found.length) return 'issues'
    return report.data?.terminal === 'COMPLETED' ? 'clear' : 'incomplete'
  }
  const records = indexed.filter(
    (item) =>
      (!table || item.root.mappingId === table) &&
      validationRootMatchesCategory(item, filter) &&
      (item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.root.key.some((part) => valueMatches(part.value, search.toLowerCase()))),
  )
  const recordPages = Math.ceil(records.length / 20)
  const recordPage = Math.min(page, Math.max(1, recordPages))
  const visibleRecords = records.slice((recordPage - 1) * 20, recordPage * 20)
  const selectedRoot =
    table !== null
      ? (visibleRecords.find((item) => item.id === root)?.id ?? visibleRecords[0]?.id ?? null)
      : root
  selectedForRead.current = selectedRoot
  const detailKey = (id: string | null) => [
    'validation',
    'root',
    validationClientKey(client),
    identity,
    id,
  ]
  const detail = useQuery({
    queryKey: detailKey(selectedRoot),
    queryFn: ({ signal }) => readRoot(selectedRoot!, signal),
    enabled: selectedRoot !== null && (drawerOpen || (table !== null && layout === 'split')),
    retry: false,
    staleTime: Infinity,
    gcTime: 30000,
  })
  const previews = useQuery({
    queryKey: [
      'validation',
      'record-previews',
      validationClientKey(client),
      identity,
      visibleRecords.map((item) => item.id),
      selectedRoot,
    ],
    queryFn: async ({ signal }) => {
      const values = new Map<string, ValidationRootDetail | null>()
      // Only the visible record page is prefetched, serially; bodies are never a report-wide index.
      for (const item of visibleRecords) {
        if (signal.aborted) throw new DOMException('Preview page no longer visible.', 'AbortError')
        values.set(
          item.id,
          await queryClient.fetchQuery({
            queryKey: detailKey(item.id),
            queryFn: async ({ signal: readSignal }) => {
              const controller = new AbortController()
              const abort = () => controller.abort()
              // A newly selected root takes ownership of this same cached read.
              const abandonPreview = () => {
                if (selectedForRead.current !== item.id) controller.abort()
              }
              if (readSignal.aborted || (signal.aborted && selectedForRead.current !== item.id))
                controller.abort()
              signal.addEventListener('abort', abandonPreview, { once: true })
              readSignal.addEventListener('abort', abort, { once: true })
              try {
                return await readRoot(item.id, controller.signal)
              } finally {
                signal.removeEventListener('abort', abandonPreview)
                readSignal.removeEventListener('abort', abort)
              }
            },
            staleTime: Infinity,
            gcTime: 30000,
          }),
        )
      }
      return values
    },
    enabled: table !== null && visibleRecords.length > 0 && indexReady,
    retry: false,
    gcTime: 0,
  })
  const data = report.data
  if (report.isPending)
    return (
      <p role="status" className="system-sm-regular text-text-secondary">
        {t('dataValidation.loading')}
      </p>
    )
  if (report.isError) return <ValidationRequestError error={report.error} />
  if (!data)
    return (
      <p className="system-sm-regular text-text-secondary">{t('dataValidation.report.absent')}</p>
    )
  const mappings = data.mappings
    .filter(
      (mapping) =>
        (filter === 'all' ||
          tableState(mapping.id) === filter ||
          (filter === 'issues' && tableState(mapping.id) === 'unknown')) &&
        `${mapping.source.source} ${mapping.source.table} ${mapping.target.source} ${mapping.target.table}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => Number(tableState(b.id) === 'issues') - Number(tableState(a.id) === 'issues'))
  const rows = table ? records : mappings,
    pages = Math.ceil(rows.length / 20),
    safePage = Math.min(page, Math.max(1, pages))
  const mapping = data.mappings.find((item) => item.id === table)
  const keys = mapping?.keys?.source ?? []
  const preview = (record: ValidationRootSummary) => {
    const value =
      record.id === selectedRoot
        ? (detail.data ?? previews.data?.get(record.id))
        : previews.data?.get(record.id)
    const observed = value ? validationRecordObservation(value.observation) : null
    const finding = observed?.findings[0],
      sample = finding?.samples[0]
    return (
      <div className="space-y-1">
        <KindSummary roots={[record]} />
        {finding && (
          <p className="system-xs-regular text-text-secondary font-mono break-words">
            {validationFieldPath(finding.path) || t('dataValidation.record.wholeRow')}
          </p>
        )}
        {finding && sample && (
          <div className="system-xs-regular text-text-secondary flex flex-wrap items-start gap-2">
            <PreviewCell cell={validationSampleCell(sample.source, finding.path)} />
            <span aria-hidden="true">→</span>
            <PreviewCell cell={validationSampleCell(sample.target, finding.path)} />
          </div>
        )}
        {finding && !sample && (
          <p className="system-xs-regular text-text-tertiary">
            {t('dataValidation.report.previewUnavailable')}
          </p>
        )}
        {!finding && (
          <p className="system-xs-regular text-text-tertiary">
            {t(
              previews.isPending
                ? 'dataValidation.loading'
                : 'dataValidation.report.previewUnavailable',
            )}
          </p>
        )}
      </div>
    )
  }
  const reportSummary = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="system-lg-semibold text-text-primary">{t('dataValidation.report.title')}</h3>
        <span className="system-xs-medium text-text-secondary border-divider-subtle rounded-md border px-2 py-1">
          {t(`dataValidation.methods.${data.method}`)}
        </span>
      </div>
      <p className="system-xs-regular text-text-tertiary break-all">
        {t('dataValidation.report.run', { run: reference.run })}
      </p>
      <p className="system-sm-regular text-text-secondary">{t('dataValidation.premise')}</p>
      {data.method !== 'COUNT' && !data.closed && (
        <p role="status" className="system-sm-regular text-text-secondary">
          {t('dataValidation.record.waitForEnd')}
        </p>
      )}
      <div
        className="bg-background-section-burn system-sm-regular text-text-primary space-y-2 rounded-lg p-4"
        role="status"
      >
        <p className="system-md-semibold">{t(`dataValidation.report.results.${data.result}`)}</p>
        <p>
          {t('dataValidation.report.window', {
            start: data.window?.startedAt ?? t('dataValidation.unknown'),
            end: data.window?.finishedAt ?? t('dataValidation.unknown'),
          })}
        </p>
        <p>{t('dataValidation.report.premiseUnknown')}</p>
        {data.method === 'COUNT' && <p>{t('dataValidation.report.countOnly')}</p>}
        <div className="border-divider-subtle flex flex-wrap gap-x-8 gap-y-2 border-t pt-3">
          <span>{t('dataValidation.report.scopeTables', { count: data.mappings.length })}</span>
          <span>{t('dataValidation.concurrencyOne')}</span>
          <span>{t('dataValidation.report.rootCount', { count: data.rootCount })}</span>
        </div>
      </div>
    </>
  )
  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="right">
      <div className="validation-report space-y-5">
        {table ? (
          <>
            <details className="system-xs-regular text-text-secondary">
              <summary className="cursor-pointer">{t('dataValidation.report.title')}</summary>
              <div className="mt-3 space-y-3">{reportSummary}</div>
            </details>
            <p className="system-sm-regular text-text-secondary">
              {t('dataValidation.report.premiseUnknown')}
            </p>
          </>
        ) : (
          reportSummary
        )}
        {data.failure && <ValidationFailureDetails failure={data.failure} />}
        {roots.isError && <ValidationRequestError error={roots.error} />}
        {previews.isError && (layout === 'expanded' || previews.error !== detail.error) && (
          <div>
            <ValidationRequestError error={previews.error} />
            <Button size="small" variant="secondary" onClick={() => void previews.refetch()}>
              {t('dataValidation.retryRead')}
            </Button>
          </div>
        )}
        {table && (
          <Button
            size="small"
            variant="ghost-accent"
            onClick={() => {
              setTable(null)
              setRoot(null)
            }}
          >
            {t('dataValidation.report.backTables')}
          </Button>
        )}
        {table && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="system-lg-semibold font-mono">{mapping?.source.table}</h3>
              <p className="system-xs-regular text-text-secondary">
                {mapping?.source.source} → {mapping?.target.source} · {records.length}{' '}
                {t('dataValidation.report.retainedRecords')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setLayout(layout === 'split' ? 'expanded' : 'split')}
            >
              {t(
                layout === 'split'
                  ? 'dataValidation.report.expandRecords'
                  : 'dataValidation.report.splitRecords',
              )}
            </Button>
          </div>
        )}
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label={t('dataValidation.report.categories')}
        >
          {(table
            ? ['all', 'values', 'presence', 'identity', 'source']
            : ['issues', 'clear', 'incomplete', 'all']
          ).map((value) => (
            <Button
              key={value}
              variant={filter === value ? 'secondary-accent' : 'secondary'}
              size="small"
              onClick={() => {
                updatePosition({ filter: value, page: 1 })
                setRoot(null)
              }}
            >
              {t(
                table
                  ? `dataValidation.record.categories.${value}`
                  : data.method === 'COUNT' && value === 'clear'
                    ? 'dataValidation.report.countEqualFilter'
                    : `dataValidation.report.filters.${value}`,
              )}
            </Button>
          ))}
          <Input
            className="ml-auto max-w-80"
            aria-label={t(table ? 'dataValidation.report.searchKey' : 'dataValidation.bulk.search')}
            placeholder={t(
              table ? 'dataValidation.report.searchKey' : 'dataValidation.bulk.search',
            )}
            value={search}
            onChange={(event) => {
              updatePosition({ search: event.target.value, page: 1 })
            }}
          />
        </div>
        {!table ? (
          <div className="border-divider-subtle overflow-x-auto rounded-lg border">
            <table className="system-sm-regular w-full min-w-[560px] text-left">
              <thead className="text-text-secondary bg-background-section-burn">
                <tr>
                  <th className="p-3">{t('dataValidation.bulk.source')}</th>
                  <th className="p-3">{t('dataValidation.bulk.target')}</th>
                  <th className="p-3">{t('dataValidation.report.result')}</th>
                  <th className="p-3">{t('dataValidation.report.affectedRecords')}</th>
                  <th className="p-3">{t('dataValidation.report.problemSummary')}</th>
                </tr>
              </thead>
              <tbody>
                {mappings.slice((safePage - 1) * 20, safePage * 20).map((mapping) => {
                  const count = data.counts.find((item) => item.mapping === mapping.id)
                  return (
                    <tr key={mapping.id} className="border-divider-subtle border-t">
                      <td className="p-3 break-words">
                        {data.method === 'COUNT' ? (
                          <strong className="font-mono">{mapping.source.table}</strong>
                        ) : (
                          <Button
                            size="small"
                            variant="ghost-accent"
                            onClick={() => {
                              setTable(mapping.id)
                              setRoot(null)
                            }}
                          >
                            {mapping.source.table}
                          </Button>
                        )}
                        <p className="system-xs-regular text-text-tertiary">
                          {mapping.source.source}
                        </p>
                      </td>
                      <td className="p-3 break-words">
                        <strong className="font-mono">{mapping.target.table}</strong>
                        <p className="system-xs-regular text-text-tertiary">
                          {mapping.target.source}
                        </p>
                      </td>
                      <td className="p-3">
                        {data.method === 'COUNT' ? (
                          count ? (
                            <div>
                              <p>
                                {t('dataValidation.report.counts', {
                                  source: count.source,
                                  target: count.target,
                                  difference: count.difference,
                                })}
                              </p>
                              <details>
                                <summary>{t('dataValidation.report.readTimes')}</summary>
                                <p>
                                  {count.sourceRead.startedAt} → {count.sourceRead.finishedAt}
                                </p>
                                <p>
                                  {count.targetRead.startedAt} → {count.targetRead.finishedAt}
                                </p>
                              </details>
                            </div>
                          ) : (
                            t('dataValidation.report.notRead')
                          )
                        ) : (
                          <div className="space-y-2">
                            <p
                              className={
                                tableState(mapping.id) === 'issues'
                                  ? 'text-text-warning'
                                  : 'text-text-secondary'
                              }
                            >
                              {t(`dataValidation.report.tableStates.${tableState(mapping.id)}`)}
                            </p>
                            <Button
                              size="small"
                              variant="ghost-accent"
                              onClick={() => {
                                setTable(mapping.id)
                                setRoot(null)
                              }}
                            >
                              {t('dataValidation.report.records')}
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {data.method === 'COUNT'
                          ? '—'
                          : indexReady
                            ? String(tableRoots(mapping.id).length)
                            : t('dataValidation.unknown')}
                      </td>
                      <td className="p-3">
                        {data.method === 'COUNT' ? (
                          t(
                            count
                              ? count.difference === '0'
                                ? 'dataValidation.report.countEqual'
                                : 'dataValidation.report.countDifferent'
                              : 'dataValidation.report.notRead',
                          )
                        ) : indexReady ? (
                          <KindSummary roots={tableRoots(mapping.id)} />
                        ) : (
                          t('dataValidation.loading')
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className={`grid min-w-0 gap-5 ${layout === 'split' ? 'min-[1150px]:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]' : ''}`}
          >
            <div className="min-w-0">
              {roots.isPending && <p role="status">{t('dataValidation.loading')}</p>}
              {roots.data === null && <p>{t('dataValidation.report.absent')}</p>}
              <div className="border-divider-subtle max-h-[600px] overflow-auto rounded-lg border">
                <table className="system-xs-regular w-full min-w-[540px] text-left">
                  <thead className="bg-background-section-burn text-text-secondary">
                    <tr>
                      <th className="bg-background-section-burn sticky left-0 z-10 min-w-64 p-3">
                        {t('dataValidation.report.problem')}
                      </th>
                      {keys.map((key, index) => (
                        <th className="min-w-36 p-3 font-mono" key={index}>
                          {validationFieldPath(key.path)}
                        </th>
                      ))}
                      <th className="p-3">{t('dataValidation.report.fields')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record) => (
                      <tr
                        key={record.id}
                        data-validation-record={record.id}
                        className={`border-divider-subtle border-t align-top ${selectedRoot === record.id ? 'bg-state-accent-hover' : ''}`}
                      >
                        <td className="bg-background-default sticky left-0 p-3">
                          <Button
                            size="small"
                            variant="ghost-accent"
                            className="mb-2"
                            onClick={() => {
                              setRoot(record.id)
                              if (layout === 'expanded') setDrawerOpen(true)
                            }}
                          >
                            {t('dataValidation.report.selectRecord')}
                          </Button>
                          {preview(record)}
                        </td>
                        {record.root.key.map((part, index) => (
                          <td className="max-w-56 p-3" key={index}>
                            <ValidationValueView value={part.value} literalText />
                          </td>
                        ))}
                        <td className="p-3">
                          <DrawerTrigger
                            render={<Button size="small" variant="secondary" />}
                            onClick={() => setRoot(record.id)}
                          >
                            {t('dataValidation.report.fields')}
                          </DrawerTrigger>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {roots.data && records.length === 0 && (
                <p className="system-sm-regular text-text-secondary py-6">
                  {t('dataValidation.report.noRetainedRecords')}
                </p>
              )}
            </div>
            {layout === 'split' && selectedRoot && (
              <section className="border-divider-subtle min-w-0 rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="system-sm-semibold">{t('dataValidation.record.title')}</h4>
                  <DrawerTrigger
                    render={<Button size="small" variant="secondary" />}
                    onClick={() => setRoot(selectedRoot)}
                  >
                    {t('dataValidation.report.fields')}
                  </DrawerTrigger>
                </div>
                <ValidationRecordDetails
                  key={selectedRoot}
                  detail={detail.data}
                  pending={detail.isPending}
                  error={detail.error}
                  mappings={data.mappings}
                />
              </section>
            )}
          </div>
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
      </div>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup className="data-[swipe-direction=right]:w-[min(940px,calc(100vw-2rem))]">
            <div className="border-divider-subtle flex items-start justify-between gap-3 border-b px-6 py-5">
              <div className="min-w-0">
                <DrawerTitle className="system-lg-semibold text-text-primary">
                  {t('dataValidation.record.title')}
                </DrawerTitle>
                <DrawerDescription className="system-xs-regular text-text-secondary mt-2 break-all">
                  {detail.data?.root.mappingId ?? root}
                </DrawerDescription>
              </div>
              <DrawerClose render={<Button variant="secondary" size="small" />}>
                {t('dataValidation.record.close')}
              </DrawerClose>
            </div>
            <DrawerContent>
              <ValidationRecordDetails
                key={selectedRoot ?? 'unselected'}
                detail={detail.data}
                pending={detail.isPending}
                error={detail.error}
                mappings={data.mappings}
              />
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

function KindSummary({ roots }: { roots: readonly ValidationRootSummary[] }) {
  const { t } = useTranslation()
  const kinds = [...validationRootKinds(roots)].filter(([, count]) => count > 0n)
  if (!roots.length) return <span>{t('dataValidation.report.noRetainedRecords')}</span>
  if (!kinds.length) return <span>{t('dataValidation.report.summaryUnavailable')}</span>
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {kinds.map(([kind, count]) => (
        <span className="text-text-warning" key={kind}>
          {t(
            kind === 'TARGET_MISSING' || kind === 'TARGET_EXTRA'
              ? `dataValidation.report.summaryKinds.${kind}`
              : `dataValidation.record.kinds.${kind}`,
            { defaultValue: kind },
          )}{' '}
          · {count.toString()}
        </span>
      ))}
    </div>
  )
}
function PreviewCell({ cell }: { cell: ReturnType<typeof validationSampleCell> }) {
  const { t } = useTranslation()
  if (cell.state === 'UNAVAILABLE')
    return (
      <div>
        <span>{t('dataValidation.record.valueUnavailable')}</span>
        <details>
          <summary>{t('dataValidation.technicalDetails')}</summary>
          <ValidationValueView value={cell.raw} />
        </details>
      </div>
    )
  if (cell.state !== 'PRESENT') return <span>{t(`dataValidation.record.cells.${cell.state}`)}</span>
  return (
    <div className="max-h-12 max-w-44 overflow-auto">
      <ValidationValueView value={cell.value} literalText />
    </div>
  )
}
