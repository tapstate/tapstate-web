import { useQuery } from '@tanstack/react-query'
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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationReference,
  ValidationValue,
} from '@/service/pipelines/validation-client'

import { validationClientKey } from './validation-query-key'
import { ValidationRecordDetails } from './validation-record-details'
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
export function ValidationReportPanel({
  client,
  reference,
  live = false,
}: {
  client: Client
  reference: ValidationReference
  live?: boolean
}) {
  const { t } = useTranslation(),
    [table, setTable] = useState<string | null>(null),
    [root, setRoot] = useState<string | null>(null),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const identity = JSON.stringify(reference)
  const report = useQuery({
    queryKey: ['validation', 'report', validationClientKey(client), identity],
    queryFn: ({ signal }) => client.report(reference, signal),
    retry: false,
    refetchInterval: (query) =>
      live && (!query.state.data || !query.state.data.closed) ? 2000 : false,
  })
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
  const detail = useQuery({
    queryKey: ['validation', 'root', validationClientKey(client), identity, root],
    queryFn: ({ signal }) => client.root(reference, root!, signal),
    enabled: root !== null && drawerOpen,
    retry: false,
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
  const mappings = data.mappings.filter((mapping) =>
    `${mapping.source.source} ${mapping.source.table} ${mapping.target.source} ${mapping.target.table}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const records = (roots.data?.items ?? []).filter(
    (item) =>
      (!table || item.root.mappingId === table) &&
      (item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.root.key.some((part) => valueMatches(part.value, search.toLowerCase()))),
  )
  const rows = table ? records : mappings,
    pages = Math.ceil(rows.length / 20),
    safePage = Math.min(page, Math.max(1, pages))
  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="right">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="system-lg-semibold text-text-primary">
            {t('dataValidation.report.title')}
          </h3>
          <span className="system-sm-medium text-text-secondary">
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
          <p>{t(`dataValidation.report.results.${data.result}`)}</p>
          <p>
            {t('dataValidation.report.window', {
              start: data.window?.startedAt ?? t('dataValidation.unknown'),
              end: data.window?.finishedAt ?? t('dataValidation.unknown'),
            })}
          </p>
          <p>{t('dataValidation.report.premiseUnknown')}</p>
          {data.method === 'COUNT' && <p>{t('dataValidation.report.countOnly')}</p>}
          <p>{t('dataValidation.report.rootCount', { count: data.rootCount })}</p>
        </div>
        {data.failure && (
          <div
            role="alert"
            className="text-text-destructive system-sm-regular space-y-2 break-words"
          >
            <p>{data.failure.message ?? data.failure.code ?? data.failure.exceptionType}</p>
            <details>
              <summary>{t('dataValidation.technicalDetails')}</summary>
              <p>
                {data.failure.code} · {data.failure.exceptionType}
              </p>
              <pre className="max-h-64 overflow-auto break-all whitespace-pre-wrap">
                {data.failure.technical}
              </pre>
            </details>
          </div>
        )}
        {roots.isError && <ValidationRequestError error={roots.error} />}
        {table && (
          <Button
            size="small"
            variant="ghost-accent"
            onClick={() => {
              setTable(null)
              setRoot(null)
              setSearch('')
              setPage(1)
            }}
          >
            {t('dataValidation.report.backTables')}
          </Button>
        )}
        <Input
          className="max-w-80"
          aria-label={t(table ? 'dataValidation.report.searchKey' : 'dataValidation.bulk.search')}
          placeholder={t(table ? 'dataValidation.report.searchKey' : 'dataValidation.bulk.search')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        {!table ? (
          <div className="border-divider-subtle overflow-x-auto rounded-lg border">
            <table className="system-sm-regular w-full min-w-[560px] text-left">
              <thead className="text-text-secondary bg-background-section-burn">
                <tr>
                  <th className="p-3">{t('dataValidation.bulk.source')}</th>
                  <th className="p-3">{t('dataValidation.bulk.target')}</th>
                  <th className="p-3">{t('dataValidation.report.result')}</th>
                </tr>
              </thead>
              <tbody>
                {mappings.slice((safePage - 1) * 20, safePage * 20).map((mapping) => {
                  const count = data.counts.find((item) => item.mapping === mapping.id)
                  return (
                    <tr key={mapping.id} className="border-divider-subtle border-t">
                      <td className="p-3 break-words">
                        {mapping.source.source} · {mapping.source.table}
                      </td>
                      <td className="p-3 break-words">
                        {mapping.target.source} · {mapping.target.table}
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
                          <Button
                            size="small"
                            variant="ghost-accent"
                            onClick={() => {
                              setTable(mapping.id)
                              setRoot(null)
                              setSearch('')
                              setPage(1)
                            }}
                          >
                            {t('dataValidation.report.records')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {roots.isPending && <p role="status">{t('dataValidation.loading')}</p>}
            {roots.data === null && <p>{t('dataValidation.report.absent')}</p>}
            {records.slice((safePage - 1) * 20, safePage * 20).map((record) => (
              <div
                key={record.id}
                className="border-divider-subtle flex items-start justify-between gap-3 rounded border p-3"
              >
                <div className="min-w-0 flex-1">
                  {record.root.key.map((part, index) => (
                    <div key={index}>
                      <span className="system-xs-medium text-text-tertiary">{part.domain}</span>
                      <ValidationValueView value={part.value} literalText />
                    </div>
                  ))}
                </div>
                <DrawerTrigger
                  render={<Button size="small" variant="secondary" />}
                  onClick={() => setRoot(record.id)}
                >
                  {t('dataValidation.report.fields')}
                </DrawerTrigger>
              </div>
            ))}
            {roots.data && records.length === 0 && (
              <p className="system-sm-regular text-text-secondary">
                {t('dataValidation.report.noRetainedRecords')}
              </p>
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
                key={root ?? 'unselected'}
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
