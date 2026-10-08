import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ViewSummary } from '@/service/view-client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { previewSourceCollection } from '@/service/data-browser-client'
import { listPipelines } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

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
  const all = result?.available ? result.views : []
  const view = all.find((entry) => entry.id === viewId)
  const siblings = view
    ? all.filter((entry) => entry.pipelineId === view.pipelineId && entry.id !== view.id)
    : []

  return (
    <section className="views-page">
      <header className="views-page__header">
        <div className="flex min-w-0 flex-col gap-1">
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
            {view && (
              <span className="views-pill">
                <ViewStatus status={view.status} />
              </span>
            )}
          </div>
          {view && (
            <p className="text-muted-foreground text-[12px]">
              {t('views.detail.maintainedBy')}{' '}
              <Link
                to="/pipelines/$pipelineId/edit"
                params={{ pipelineId: view.pipelineId }}
                className="views-link"
              >
                {view.pipelineId}
              </Link>
              {' · '}
              {t('views.detail.storedIn')} <StoredIn location={view.location} />
            </p>
          )}
          {siblings.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="text-muted-foreground">{t('views.detail.siblings')}</span>
              {siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  to="/views/$viewId"
                  params={{ viewId: sibling.id }}
                  className="views-chip"
                >
                  {sibling.location.collection}
                </Link>
              ))}
            </p>
          )}
        </div>
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
        ) : tab === 'documents' ? (
          <ViewDocuments view={view} />
        ) : (
          <p className="text-muted-foreground text-[13px]">{t(`views.detail.pending.${tab}`)}</p>
        )}
      </div>
    </>
  )
}

function ViewDocuments({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const preview = useQuery({
    queryKey: ['view-documents', view.location.storeId, view.location.collection, 5],
    queryFn: () =>
      previewSourceCollection(view.location.storeId, view.location.collection, apiFetch, 5),
  })

  if (preview.isPending)
    return <p className="text-muted-foreground text-[13px]">{t('views.preview.loading')}</p>
  if (preview.isError) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-muted-foreground text-[13px]">{t('views.preview.error')}</p>
        <Button type="button" variant="outline" onClick={() => void preview.refetch()}>
          {t('state.error.retry')}
        </Button>
      </div>
    )
  }
  if (preview.data.rows.length === 0)
    return <p className="text-muted-foreground text-[13px]">{t('views.preview.empty')}</p>

  return (
    <section className="space-y-3" aria-label={t('views.preview.title')}>
      <p className="text-muted-foreground text-xs">
        {t('views.preview.rows', { count: preview.data.rows.length })}
        {preview.data.moreAvailable ? ` · ${t('views.preview.moreAvailable')}` : ''}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {preview.data.rows.map((row, index) => (
          <pre
            key={`${index}-${String(row._id ?? '')}`}
            className="border-border bg-muted/20 max-h-72 overflow-auto rounded-lg border p-4 text-xs leading-5"
          >
            {JSON.stringify(row, null, 2)}
          </pre>
        ))}
      </div>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="views-stat">
      <p className="views-stat__label">{label}</p>
      <div className="views-stat__value">{value}</div>
      {hint && <p className="views-stat__hint">{hint}</p>}
    </div>
  )
}

function ViewOverview({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const duration = useDurationText()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  // Same key as the Pipelines page; only the maintaining pipeline's state is read from it.
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
  })
  const pipelineState = pipelinesQuery.data?.find((pipeline) => pipeline.id === view.pipelineId)
    ?.status?.state
  const lastApplied =
    view.lastAppliedAt === null
      ? t('views.detail.neverApplied')
      : t('views.detail.lastApplied', {
          age: duration((Date.now() - view.lastAppliedAt) / 1000),
        })

  return (
    <div className="flex flex-col gap-6">
      <div className="views-stats">
        <Stat
          label={t('views.detail.freshness')}
          value={<ViewStatus status={view.status} />}
          hint={lastApplied}
        />
        <Stat
          label={t('views.table.documents')}
          value={
            view.documents === null ? t('overview.notReported') : view.documents.toLocaleString()
          }
        />
        <Stat
          label={t('views.detail.size')}
          value={view.sizeBytes === null ? t('overview.notReported') : formatBytes(view.sizeBytes)}
        />
        <Stat
          label={t('views.detail.largestDocument')}
          value={t('overview.notReported')}
          hint={t('views.detail.documentLimit')}
        />
      </div>

      <LoadProgress view={view} />

      <dl className="views-overview">
        <div>
          <dt>{t('views.table.maintainedBy')}</dt>
          <dd>
            <Link
              to="/pipelines/$pipelineId/edit"
              params={{ pipelineId: view.pipelineId }}
              className="views-link"
            >
              {view.pipelineId}
            </Link>
            {pipelineState && (
              <span className="text-muted-foreground">
                {' · '}
                {t(`views.detail.pipelineState.${pipelineState}`)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('views.table.storedIn')}</dt>
          <dd>
            <StoredIn location={view.location} />
            <span className="text-muted-foreground">
              {' · '}
              {t('views.detail.collection', { name: view.location.collection })}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Initial load while it runs, then that change capture keeps the view current. */
function LoadProgress({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const status = view.status
  if (status.state === 'loading') {
    const percent = status.percent ?? null
    return (
      <section className="views-load" aria-label={t('views.detail.initialLoad')}>
        <p className="text-foreground text-[13px] font-semibold">{t('views.detail.initialLoad')}</p>
        {percent !== null && (
          <div
            className="views-load__bar"
            role="progressbar"
            aria-label={t('views.detail.initialLoad')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
          </div>
        )}
      </section>
    )
  }
  if (status.state === 'fresh') {
    return (
      <section className="views-load" aria-label={t('views.detail.upToDate')}>
        <p className="text-foreground text-[13px] font-semibold">{t('views.detail.upToDate')}</p>
        <div className="views-load__bar views-load__bar--done" aria-hidden="true">
          <span style={{ width: '100%' }} />
        </div>
        <p className="text-muted-foreground text-[12px]">{t('views.detail.streaming')}</p>
      </section>
    )
  }
  return null
}
