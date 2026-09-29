import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Database, GitMerge, HardDrive, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ViewSummary } from '@/service/view-client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listSources, MANAGED_VIEW_STORE_SOURCE_ID } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { StoredIn, useDurationText, ViewStatus } from './components/view-status'
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
      <header className="views-page__header">
        <h1 className="text-foreground text-[15px] font-semibold">{t('views.title')}</h1>
        <Button asChild nativeButton={false} size="sm" variant="outline">
          <Link to="/pipelines">{t('views.newView')}</Link>
        </Button>
      </header>
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
        ) : result.views.length === 0 ? (
          <ViewsExplainer notice={null} />
        ) : (
          <ViewsList views={result.views} />
        )}
      </div>
    </section>
  )
}

function ViewsList({ views }: { views: ViewSummary[] }) {
  const { t } = useTranslation()
  const duration = useDurationText()
  const summary = summarizeViews(views)
  const now = Date.now()
  const parts = [
    t('views.summary.total', { count: summary.total }),
    t('views.summary.fresh', { count: summary.fresh }),
    t('views.summary.stale', { count: summary.stale }),
    ...(summary.slowestBehindSeconds === null
      ? []
      : [t('views.summary.slowest', { behind: duration(summary.slowestBehindSeconds) })]),
  ]

  return (
    <>
      <p className="text-foreground text-[13px] font-medium">{parts.join(' · ')}</p>
      <div className="views-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('views.table.name')}</TableHead>
              <TableHead>{t('views.table.type')}</TableHead>
              <TableHead className="views-table__wide">{t('views.table.storedIn')}</TableHead>
              <TableHead>{t('views.table.status')}</TableHead>
              <TableHead className="views-table__wide">{t('views.table.documents')}</TableHead>
              <TableHead className="views-table__wide">{t('views.table.lastChange')}</TableHead>
              <TableHead>{t('views.table.maintainedBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortViews(views).map((view) => (
              <TableRow key={view.id}>
                <TableCell>
                  <Link to="/views/$viewId" params={{ viewId: view.id }} className="views-link">
                    {view.location.collection}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{t(`views.kind.${view.kind}`)}</Badge>
                </TableCell>
                <TableCell className="views-table__wide">
                  <StoredIn location={view.location} />
                </TableCell>
                <TableCell>
                  <ViewStatus status={view.status} />
                </TableCell>
                <TableCell className="views-table__wide">
                  {view.documents === null ? '—' : view.documents.toLocaleString()}
                </TableCell>
                <TableCell className="views-table__wide">
                  {view.lastAppliedAt === null
                    ? '—'
                    : t('views.ago', { age: duration((now - view.lastAppliedAt) / 1000) })}
                </TableCell>
                <TableCell>
                  <Link
                    to="/pipelines/$pipelineId/edit"
                    params={{ pipelineId: view.pipelineId }}
                    className="views-link"
                  >
                    {view.pipelineId}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
  const storeReady = sourcesQuery.data?.some((source) => source.id === MANAGED_VIEW_STORE_SOURCE_ID)

  return (
    <div className="views-explainer">
      {notice && (
        <p className="views-explainer__notice" role="status">
          {notice}
        </p>
      )}
      <p className="text-foreground text-[13px] font-medium">
        {notice ? t('views.explainer.what') : t('views.explainer.empty')}
      </p>
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
        <span className="text-muted-foreground">{t('views.explainer.storedIn')}</span>
        {sourcesQuery.data === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : storeReady ? (
          <Link to="/settings" className="views-link">
            {t('views.storedIn.managed')}
          </Link>
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
