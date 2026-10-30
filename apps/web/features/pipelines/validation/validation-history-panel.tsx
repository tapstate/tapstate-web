import { useQuery } from '@tanstack/react-query'
import { Button } from '@tapstate-web/ui/button'
import { Pagination } from '@tapstate-web/ui/pagination'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  createValidationClient,
  ValidationReference,
} from '@/service/pipelines/validation-client'

import { validationClientKey } from './validation-query-key'
import { ValidationReportPanel } from './validation-report-panel'
import { ValidationRequestError } from './validation-view-parts'

type Client = ReturnType<typeof createValidationClient>
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
    [selected, setSelected] = useState<ValidationReference | null>(initialReference ?? null)
  const history = useQuery({
    queryKey: ['validation', 'history', validationClientKey(client), pipelineId, taskId, page],
    queryFn: ({ signal }) =>
      client.history(pipelineId, taskId, { offset: (page - 1) * 10, limit: 10 }, signal),
    retry: false,
    enabled: selected === null,
  })
  const lastPage = history.data ? Math.max(1, Math.ceil(Number(history.data.total) / 10)) : page
  const moving = page > lastPage
  useEffect(() => {
    if (moving) setPage(lastPage)
  }, [moving, lastPage])
  return (
    <section className="space-y-4">
      <Button
        size="small"
        variant="ghost-accent"
        onClick={selected ? () => setSelected(null) : onBack}
      >
        {t(selected ? 'dataValidation.history.backList' : 'dataValidation.schedule.back')}
      </Button>
      <h2 className="system-lg-semibold text-text-primary">{t('dataValidation.history.title')}</h2>
      {selected ? (
        <ValidationReportPanel client={client} reference={selected} live />
      ) : (
        <>
          {(history.isPending || moving) && <p role="status">{t('dataValidation.loading')}</p>}
          {history.isError && <ValidationRequestError error={history.error} />}
          {history.data && !moving && (
            <>
              <p className="system-sm-regular text-text-secondary">
                {t('dataValidation.history.retention')}
              </p>
              {!history.data.items.length && <p>{t('dataValidation.history.empty')}</p>}
              <ul className="space-y-2">
                {history.data.items.map((item) => (
                  <li
                    key={`${item.reference.generation}:${item.reference.sequence}:${item.reference.run}`}
                    className="border-divider-subtle flex flex-wrap items-center justify-between gap-3 rounded border p-3"
                  >
                    <div className="system-sm-regular text-text-secondary">
                      <p>
                        {t(`dataValidation.methods.${item.method}`)} ·{' '}
                        {item.terminal
                          ? t(`dataValidation.run.states.${item.terminal}`)
                          : t('dataValidation.report.results.IN_PROGRESS')}
                      </p>
                      <p>
                        {item.window?.startedAt ??
                          item.terminalKnownAt ??
                          t('dataValidation.unknown')}{' '}
                        · {t('dataValidation.report.rootCount', { count: item.rootCount })}
                      </p>
                    </div>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setSelected(item.reference)}
                    >
                      {t('dataValidation.history.open')}
                    </Button>
                  </li>
                ))}
              </ul>
              <Pagination
                page={page}
                totalPages={Math.ceil(Number(history.data.total) / 10)}
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
