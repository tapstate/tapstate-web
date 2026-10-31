import { useQuery } from '@tanstack/react-query'
import { Button } from '@tapstate-web/ui/button'
import { Input } from '@tapstate-web/ui/input'
import { Pagination } from '@tapstate-web/ui/pagination'
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
  ValidationReference,
} from '@/service/pipelines/validation-client'

import { ValidationTimestamp } from './validation-presentation'
import { validationClientKey } from './validation-query-key'
import { ValidationReportPanel } from './validation-report-panel'
import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
function historyKey(reference: ValidationReference) {
  return JSON.stringify([
    reference.pipeline,
    reference.task,
    reference.generation,
    reference.sequence,
    reference.run,
  ])
}
export function ValidationHistoryPanel({
  client,
  pipelineId,
  taskId,
  onBack,
  initialReference,
}: {
  client: Client
  pipelineId: string
  taskId: string
  onBack: () => void
  initialReference?: ValidationReference | null
}) {
  const { t } = useTranslation(),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [selected, setSelected] = useState<ValidationReference | null>(initialReference ?? null)
  const buttons = useRef(new Map<string, HTMLButtonElement>()),
    restore = useRef<string | null>(null),
    heading = useRef<HTMLHeadingElement | null>(null)
  const history = useQuery({
    queryKey: ['validation', 'history', validationClientKey(client), pipelineId, taskId],
    queryFn: async ({ signal }) => {
      const first = await client.history(pipelineId, taskId, { offset: 0, limit: 20 }, signal)
      const items = [...first.items]
      for (let offset = 20; BigInt(offset) < BigInt(first.total) && offset < 100; offset += 20) {
        const next = await client.history(pipelineId, taskId, { offset, limit: 20 }, signal)
        items.push(...next.items)
      }
      const unique = new Map(items.map((item) => [historyKey(item.reference), item]))
      return { ...first, items: [...unique.values()] }
    },
    retry: false,
    enabled: selected === null,
  })
  const items = (history.data?.items ?? []).filter(
    (item) =>
      (status === 'all' || item.terminal === status) &&
      [
        item.reference.run,
        t(`dataValidation.methods.${item.method}`),
        item.terminal ?? '',
        item.endedAt ?? '',
        item.terminalKnownAt ?? '',
        item.window?.startedAt ?? '',
        item.window?.finishedAt ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const lastPage = Math.max(1, Math.ceil(items.length / 10)),
    safePage = Math.min(page, lastPage)
  useEffect(() => {
    if (page > lastPage) setPage(lastPage)
  }, [page, lastPage])
  useEffect(() => {
    if (selected === null && history.data && restore.current) {
      const row = buttons.current.get(restore.current)
      ;(row ?? heading.current)?.focus()
      restore.current = null
    }
  }, [selected, history.data])
  return (
    <section className="space-y-4">
      <Button
        size="small"
        variant="ghost-accent"
        onClick={selected ? () => setSelected(null) : onBack}
      >
        {t(selected ? 'dataValidation.history.backList' : 'dataValidation.schedule.back')}
      </Button>
      {selected ? (
        <ValidationReportPanel client={client} reference={selected} live />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 ref={heading} tabIndex={-1} className="system-lg-semibold text-text-primary">
              {t('dataValidation.history.title')}
            </h2>
            <Button
              variant="secondary"
              size="small"
              disabled={history.isFetching}
              onClick={() => void history.refetch()}
            >
              {t('dataValidation.history.refresh')}
            </Button>
          </div>
          <p className="system-sm-regular text-text-secondary">
            {t('dataValidation.history.retention')}
          </p>
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label={t('dataValidation.history.filters')}
          >
            <label className="system-sm-medium text-text-secondary flex items-center gap-2">
              {t('dataValidation.history.filters')}
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value ?? 'all')
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-48" aria-label={t('dataValidation.history.filters')}>
                  <SelectValue>
                    {t(
                      status === 'all'
                        ? 'dataValidation.history.allStates'
                        : `dataValidation.run.states.${status}`,
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner>
                    <SelectPopup>
                      <SelectList>
                        {['all', 'COMPLETED', 'FAILED', 'STOPPED'].map((value) => (
                          <SelectItem key={value} value={value}>
                            <SelectItemText>
                              {t(
                                value === 'all'
                                  ? 'dataValidation.history.allStates'
                                  : `dataValidation.run.states.${value}`,
                              )}
                            </SelectItemText>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </label>
            <Input
              className="ml-auto max-w-80"
              aria-label={t('dataValidation.history.search')}
              placeholder={t('dataValidation.history.search')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          {history.isPending && <p role="status">{t('dataValidation.loading')}</p>}
          {history.isError && <ValidationRequestError error={history.error} />}
          {history.data && (
            <>
              {BigInt(history.data.total) > BigInt(history.data.items.length) && (
                <p role="status">{t('dataValidation.history.partial')}</p>
              )}
              <div className="border-divider-subtle overflow-auto rounded-lg border">
                <table className="system-sm-regular w-full min-w-[680px] text-left">
                  <thead className="bg-background-section-burn text-text-secondary">
                    <tr>
                      <th className="p-3">{t('dataValidation.history.endedAt')}</th>
                      <th className="p-3">{t('dataValidation.method')}</th>
                      <th className="p-3">{t('dataValidation.report.result')}</th>
                      <th className="p-3">{t('dataValidation.history.observations')}</th>
                      <th className="p-3">{t('dataValidation.history.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice((safePage - 1) * 10, safePage * 10).map((item) => (
                      <tr
                        key={historyKey(item.reference)}
                        className="border-divider-subtle border-t"
                      >
                        <td className="p-3 text-xs leading-5">
                          <ValidationTimestamp value={item.endedAt} />
                        </td>
                        <td className="p-3">{t(`dataValidation.methods.${item.method}`)}</td>
                        <td className="p-3">
                          {item.terminal
                            ? t(`dataValidation.run.states.${item.terminal}`)
                            : t('dataValidation.report.results.IN_PROGRESS')}
                        </td>
                        <td className="p-3">
                          {item.method === 'COUNT'
                            ? t('dataValidation.history.countObservations', {
                                count: item.mismatchedTables,
                              })
                            : t('dataValidation.report.rootCount', { count: item.rootCount })}
                        </td>
                        <td className="p-3">
                          <Button
                            ref={(node) => {
                              if (node) buttons.current.set(historyKey(item.reference), node)
                              else buttons.current.delete(historyKey(item.reference))
                            }}
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              restore.current = historyKey(item.reference)
                              setSelected(item.reference)
                            }}
                          >
                            {t('dataValidation.history.open')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!items.length && (
                <div className="space-y-2 py-4">
                  <p>
                    {t(
                      history.data.total === '0'
                        ? 'dataValidation.history.empty'
                        : history.data.items.length
                          ? 'dataValidation.history.noMatches'
                          : 'dataValidation.history.unavailable',
                    )}
                  </p>
                  {history.data.items.length > 0 && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setSearch('')
                        setStatus('all')
                        setPage(1)
                      }}
                    >
                      {t('dataValidation.history.clearFilters')}
                    </Button>
                  )}
                </div>
              )}
              <Pagination
                page={safePage}
                totalPages={Math.ceil(items.length / 10)}
                onPageChange={setPage}
                labels={{
                  previous: t('dataValidation.previous'),
                  next: t('dataValidation.next'),
                  pageNumberInput: t('dataValidation.pageNumber'),
                }}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}
