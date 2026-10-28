import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Database, GitMerge, HardDrive, Layers, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UnresolvedOutput, ViewSummary } from '@/service/view-client'

import { ResourceListHeader } from '@/components/resource-list-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listConnectors, listSources } from '@/service/source-client'
import { stateStoreSource } from '@/service/state-store-source'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

import { StoredInSourceLink, useDurationText, ViewStatus } from './components/view-status'
import { sortViews, summarizeViews } from './views-model'
import { useViewsQuery } from './views-query'

/**
 * Views: every collection a pipeline keeps current, shown as the state layer. Pipelines say how
 * a collection is made and whether that runs well; this page says whether the result can be
 * trusted now. The list and each status come from one server read.
 */
export function ViewsPage() {
  const { t } = useTranslation()
  const viewsQuery = useViewsQuery()
  const result = viewsQuery.data

  return (
    <section className="views-page">
      <ResourceListHeader title={t('views.title')}>
        <Button asChild nativeButton={false}>
          <Link to="/pipelines" search={{ create: true }}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('views.createView')}
          </Link>
        </Button>
      </ResourceListHeader>
      <div className="views-page__body">
        <p className="text-muted-foreground text-[13px]">{t('views.intro')}</p>
        {viewsQuery.isError ? (
          <div className="views-page__state" role="alert">
            <p>{t('views.states.error')}</p>
            <Button type="button" variant="outline" onClick={() => void viewsQuery.refetch()}>
              {t('state.error.retry')}
            </Button>
          </div>
        ) : result === undefined ? (
          <p className="text-muted-foreground text-[13px]" aria-busy="true">
            {t('views.states.loading')}
          </p>
        ) : !result.available ? (
          <ViewsExplainer notice={t('views.states.notReported')} />
        ) : (
          <>
            <UnresolvedOutputs outputs={result.unresolved ?? []} />
            {result.views.length > 0 ? (
              <ViewsList views={result.views} />
            ) : !result.unresolved?.length ? (
              <ViewsExplainer notice={null} />
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function UnresolvedOutputs({ outputs }: { outputs: UnresolvedOutput[] }) {
  const { t } = useTranslation()
  if (!outputs.length) return null
  return (
    <div className="views-page__state" role="status">
      <p>{t('views.outputs.unresolved')}</p>
      <p>{t('views.outputs.help')}</p>
      <ul>
        {outputs.map((output) => (
          <li key={output.pipelineId} className="break-words">
            <Link
              to="/pipelines/$pipelineId"
              params={{ pipelineId: output.pipelineId }}
              className="views-link"
            >
              {output.pipelineId}
            </Link>
            {' · '}
            {output.code}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ViewsList({ views }: { views: ViewSummary[] }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const duration = useDurationText()
  const summary = summarizeViews(views)
  const now = Date.now()
  const parts = [
    t('views.summary.total', { count: summary.total }),
    t('views.summary.fresh', { count: summary.fresh }),
    // Zero counts stay out of the line; only what is there is worth reading.
    ...(summary.stale > 0 ? [t('views.summary.stale', { count: summary.stale })] : []),
    ...(summary.loading > 0 ? [t('views.summary.loading', { count: summary.loading })] : []),
    ...(summary.notLoaded > 0 ? [t('views.summary.notLoaded', { count: summary.notLoaded })] : []),
    ...(summary.slowestBehindSeconds === null
      ? []
      : [t('views.summary.slowest', { behind: duration(summary.slowestBehindSeconds) })]),
  ]

  return (
    <>
      <p className="text-foreground text-[13px] font-medium">{parts.join(' · ')}</p>
      <div className="views-table">
        <table className="text-text-secondary w-full max-w-full min-w-175 border-collapse border-0 text-sm">
          <thead className="border-divider-subtle text-text-tertiary h-8 border-b text-xs/8 font-medium uppercase [&>tr>th]:text-left [&>tr>th]:font-[weight:inherit]">
            <tr>
              <th>{t('views.table.name')}</th>
              <th>{t('views.table.type')}</th>
              <th>{t('views.table.storedIn')}</th>
              <th>{t('views.table.status')}</th>
              <th>{t('views.table.documents')}</th>
              <th>{t('views.table.lastChange')}</th>
              <th>{t('views.table.maintainedBy')}</th>
            </tr>
          </thead>
          <tbody>
            {sortViews(views).map((view) => {
              const source = sourcesQuery.data?.find((item) => item.id === view.location.storeId)
              const connector = source
                ? connectorsQuery.data?.find((item) => item.id === source.connector)
                : undefined

              return (
                <tr
                  key={view.id}
                  className="border-divider-subtle hover:bg-background-default-hover border-b"
                >
                  <td>
                    <Link to="/views/$viewId" params={{ viewId: view.id }} className="views-link">
                      {view.location.collection}
                    </Link>
                  </td>
                  <td>
                    <Badge variant="dimm" uppercase={false}>
                      {t(`views.kind.${view.kind}`)}
                    </Badge>
                  </td>
                  <td>
                    <StoredInSourceLink
                      location={view.location}
                      source={source}
                      connector={connector}
                    />
                  </td>
                  <td>
                    <ViewStatus status={view.status} />
                  </td>
                  <td>{view.documents === null ? '—' : view.documents.toLocaleString()}</td>
                  <td>
                    {view.lastAppliedAt === null
                      ? '—'
                      : t('views.ago', { age: duration((now - view.lastAppliedAt) / 1000) })}
                  </td>
                  <td>{view.pipelineId}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-[12px]">{t('views.footnote')}</p>
    </>
  )
}

/**
 * What a view is, shown when there is none yet or the server does not list them. Goal cards
 * belong to the Pipelines page; this page offers only Build a view.
 */
function ViewsExplainer({ notice }: { notice: string | null }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const storeReady = stateStoreSource(sourcesQuery.data ?? [], getDeploymentProfile()) !== null

  return (
    <div className="views-explainer">
      {notice && (
        <p className="views-explainer__notice" role="status">
          {notice}
        </p>
      )}
      {!notice && (
        <h2 className="text-foreground text-[15px] font-semibold">{t('views.explainer.empty')}</h2>
      )}
      <p className="text-foreground text-[13px]">{t('views.explainer.what')}</p>
      <ol className="views-explainer__flow" aria-label={t('views.explainer.flowLabel')}>
        <li>
          <Database className="h-4 w-4" aria-hidden="true" />
          {t('views.explainer.sources')}
        </li>
        <li className="views-explainer__arrow" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </li>
        <li>
          <GitMerge className="h-4 w-4" aria-hidden="true" />
          {t('views.explainer.pipeline')}
        </li>
        <li className="views-explainer__arrow" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </li>
        <li>
          <Layers className="h-4 w-4" aria-hidden="true" />
          {t('views.explainer.view')}
        </li>
      </ol>
      <div className="views-explainer__store">
        <HardDrive className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        {sourcesQuery.data === undefined ? (
          <span className="text-muted-foreground">{t('views.explainer.storedIn')} —</span>
        ) : storeReady ? (
          <>
            <span className="text-muted-foreground">{t('views.explainer.storedIn')}</span>
            <Link to="/settings" className="views-link">
              {t('views.storedIn.managed')}
            </Link>
          </>
        ) : (
          <>
            <span>{t('views.explainer.storeMissing')}</span>
            <Link to="/overview" className="views-link">
              {t('views.explainer.setUp')}
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild nativeButton={false} size="sm">
          <Link to="/pipelines">{t('views.explainer.build')}</Link>
        </Button>
        <span className="text-muted-foreground text-[12px]">{t('views.explainer.replicas')}</span>
      </div>
    </div>
  )
}
