import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, GitMerge } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ResourceListHeader } from '@/components/resource-list-header'
import { Button } from '@/components/ui/button'
import {
  getPipeline,
  listPipelines,
  PipelineClientError,
} from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineStatusBadge } from '../components/pipeline-status-badge'

function localTimestamp(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export function PipelineDetailPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const pipelineQuery = useQuery({
    queryKey: ['pipeline-detail', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
    retry: false,
  })
  const catalogQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    staleTime: 15_000,
    retry: false,
  })
  const pipeline = pipelineQuery.data
  const catalogItem = catalogQuery.data?.find((item) => item.id === pipelineId)
  const targets = pipeline?.dag.nodes.filter((node) => node.type === 'target') ?? []
  const transforms = pipeline?.dag.nodes.filter((node) => node.type === 'transform') ?? []
  const status = pipeline?.status?.displayState ?? pipeline?.status?.state

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <ResourceListHeader
        title={catalogItem?.name || pipeline?.metadata?.labels.name || pipelineId}
      >
        <Link
          to="/pipelines"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t('pipelineDetails.backToPipelines')}
        </Link>
        {pipeline && (
          <>
            <Link
              to="/pipelines/$pipelineId/edit/logs"
              params={{ pipelineId }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
            >
              {t('pipelineDetails.logs')}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              to="/pipelines/$pipelineId/edit"
              params={{ pipelineId }}
              className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white hover:bg-black"
            >
              {t('pipelineDetails.edit')}
            </Link>
          </>
        )}
      </ResourceListHeader>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {pipelineQuery.isPending ? (
          <p className="text-muted-foreground text-[13px]" aria-busy="true">
            {t('pipelineDetails.loading')}
          </p>
        ) : pipelineQuery.isError ? (
          <div className="flex min-h-48 max-w-xl flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-5 py-8 text-[13px] text-gray-600">
            <GitMerge className="size-4 text-gray-400" aria-hidden="true" />
            <p>
              {pipelineQuery.error instanceof PipelineClientError &&
              pipelineQuery.error.status === 404
                ? t('pipelineDetails.notFound', { id: pipelineId })
                : t('pipelineDetails.error')}
            </p>
            <Button type="button" variant="outline" onClick={() => void pipelineQuery.refetch()}>
              {t('state.error.retry')}
            </Button>
          </div>
        ) : pipeline ? (
          <div className="grid max-w-5xl gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground font-mono text-[12px]">{pipeline.id}</span>
              <PipelineStatusBadge status={status} />
              {pipeline.status?.observedAt && (
                <time
                  className="text-muted-foreground text-[12px]"
                  dateTime={pipeline.status.observedAt}
                >
                  {t('pipelineDetails.observedAt', {
                    time: localTimestamp(pipeline.status.observedAt, i18n.language),
                  })}
                </time>
              )}
            </div>

            {(pipeline.metadata?.description || catalogItem?.description) && (
              <p className="text-muted-foreground max-w-3xl text-[13px] leading-5">
                {pipeline.metadata?.description || catalogItem?.description}
              </p>
            )}

            {pipeline.status?.failure?.message && (
              <section
                className="grid gap-2 rounded-lg border border-red-200 bg-red-50/60 p-4"
                role="alert"
              >
                <h2 className="text-[13px] font-semibold text-red-900">
                  {t('pipelineDetails.lastError')}
                </h2>
                <p className="text-[13px] text-red-800">{pipeline.status.failure.message}</p>
                {pipeline.status.failure.code && (
                  <code className="text-[11px] text-red-800">{pipeline.status.failure.code}</code>
                )}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <section
                className="rounded-lg border border-gray-200 p-4"
                aria-labelledby="pipeline-details-sources"
              >
                <h2
                  id="pipeline-details-sources"
                  className="text-[13px] font-semibold text-gray-900"
                >
                  {t('pipelineDetails.sources')}
                </h2>
                {pipeline.sources?.length ? (
                  <ul className="mt-3 divide-y divide-gray-100 text-[13px]">
                    {pipeline.sources.map((source) => (
                      <li
                        key={source.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="font-medium text-gray-800">{source.id}</span>
                        <span className="text-muted-foreground">{source.connector ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-3 text-[13px]">
                    {t('pipelineDetails.noSources')}
                  </p>
                )}
              </section>

              <section
                className="rounded-lg border border-gray-200 p-4"
                aria-labelledby="pipeline-details-targets"
              >
                <h2
                  id="pipeline-details-targets"
                  className="text-[13px] font-semibold text-gray-900"
                >
                  {t('pipelineDetails.destinations')}
                </h2>
                {targets.length ? (
                  <ul className="mt-3 divide-y divide-gray-100 text-[13px]">
                    {targets.map((target) => (
                      <li
                        key={target.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="font-medium text-gray-800">
                          {target.tableRefs?.length ? target.tableRefs.join(', ') : target.label}
                        </span>
                        <span className="text-muted-foreground text-right">
                          {target.detail || '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-3 text-[13px]">
                    {t('pipelineDetails.noDestinations')}
                  </p>
                )}
              </section>
            </div>

            <section
              className="rounded-lg border border-gray-200 p-4"
              aria-labelledby="pipeline-details-transforms"
            >
              <h2
                id="pipeline-details-transforms"
                className="text-[13px] font-semibold text-gray-900"
              >
                {t('pipelineDetails.transforms')}
              </h2>
              {transforms.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {transforms.map((transform) => (
                    <li
                      key={transform.id}
                      className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-700"
                    >
                      {transform.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-3 text-[13px]">
                  {t('pipelineDetails.noTransforms')}
                </p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  )
}
