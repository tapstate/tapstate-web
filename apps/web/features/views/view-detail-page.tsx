import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ViewSummary } from '@/service/view-client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { StoredIn, useDurationText, ViewStatus } from './components/view-status'
import { formatBytes } from './views-model'
import { useViewsQuery } from './views-query'

export const VIEW_TABS = ['overview', 'documents', 'shape', 'lineage', 'indexes'] as const
export type ViewTab = (typeof VIEW_TABS)[number]

/** One view: how fresh it is, where it lives and which pipeline keeps it current. */
export function ViewDetailPage({ viewId }: { viewId: string }) {
  const { t } = useTranslation()
  const viewsQuery = useViewsQuery()
  const result = viewsQuery.data
  const view = result?.available ? result.views.find((entry) => entry.id === viewId) : undefined

  return (
    <section className="views-page">
      <header className="views-page__header">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/views" className="views-link inline-flex items-center gap-1 text-[13px]">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('views.title')}
          </Link>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <h1 className="text-foreground truncate text-[15px] font-semibold">
            {view?.location.collection ?? viewId}
          </h1>
          {view && <Badge variant="secondary">{t(`views.kind.${view.kind}`)}</Badge>}
        </div>
        {view && (
          <span className="text-muted-foreground text-[12px]">
            {t('views.detail.maintainedBy')}{' '}
            <Link
              to="/pipelines/$pipelineId/edit"
              params={{ pipelineId: view.pipelineId }}
              className="views-link"
            >
              {view.pipelineId}
            </Link>
          </span>
        )}
      </header>
      <div className="views-page__body">
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
          <p className="views-explainer__notice" role="status">
            {t('views.states.notReported')}
          </p>
        ) : view === undefined ? (
          <p className="text-muted-foreground text-[13px]">
            {t('views.detail.notFound', { id: viewId })}
          </p>
        ) : (
          <ViewTabs view={view} />
        )}
      </div>
    </section>
  )
}

function ViewTabs({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ViewTab>('overview')

  return (
    <>
      <div className="views-tabs" role="tablist" aria-label={t('views.detail.tabsLabel')}>
        {VIEW_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`view-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`view-panel-${id}`}
            className={cn('views-tabs__tab', tab === id && 'views-tabs__tab--active')}
            onClick={() => setTab(id)}
          >
            {t(`views.detail.tabs.${id}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`view-panel-${tab}`} aria-labelledby={`view-tab-${tab}`}>
        {tab === 'overview' ? (
          <ViewOverview view={view} />
        ) : (
          <p className="text-muted-foreground text-[13px]">{t(`views.detail.pending.${tab}`)}</p>
        )}
      </div>
    </>
  )
}

function ViewOverview({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const duration = useDurationText()
  const rows: { label: string; value: ReactNode }[] = [
    { label: t('views.table.status'), value: <ViewStatus status={view.status} /> },
    {
      label: t('views.table.documents'),
      value: view.documents === null ? t('overview.notReported') : view.documents.toLocaleString(),
    },
    {
      label: t('views.detail.size'),
      value: view.sizeBytes === null ? t('overview.notReported') : formatBytes(view.sizeBytes),
    },
    { label: t('views.detail.largestDocument'), value: t('overview.notReported') },
    {
      label: t('views.table.lastChange'),
      value:
        view.lastAppliedAt === null
          ? '—'
          : t('views.ago', { age: duration((Date.now() - view.lastAppliedAt) / 1000) }),
    },
    { label: t('views.table.storedIn'), value: <StoredIn location={view.location} /> },
    {
      label: t('views.detail.collection'),
      value: <code className="text-[12px]">{view.location.collection}</code>,
    },
  ]

  return (
    <dl className="views-overview">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
