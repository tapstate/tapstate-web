import type { ReactNode } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@langgenius/dify-ui/breadcrumb'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@langgenius/dify-ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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

const viewTabIcons: Record<ViewTab, string> = {
  overview: 'i-ri-layout-grid-line',
  documents: 'i-ri-file-text-line',
  shape: 'i-ri-table-line',
  lineage: 'i-ri-git-branch-line',
  indexes: 'i-ri-list-check-3',
}

function getViewTabOrientation(): 'horizontal' | 'vertical' {
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches
    ? 'vertical'
    : 'horizontal'
}

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
      <header className="views-page__header views-page__header--detail">
        <div className="flex min-w-0 items-center gap-3">
          <Breadcrumb aria-label={t('views.title')}>
            <BreadcrumbList className="min-w-0 gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink render={<Link to="/views" />}>{t('views.title')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <h1 aria-current="page" className="views-detail-title">
                  {view?.location.collection ?? viewId}
                </h1>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {view && (
            <Badge variant="dimm" uppercase={false}>
              {t(`views.kind.${view.kind}`)}
            </Badge>
          )}
        </div>
      </header>
      <div className="views-page__body views-page__body--detail">
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
          <ViewTabs view={view} siblings={siblings} />
        )}
      </div>
    </section>
  )
}

function ViewTabs({ view, siblings }: { view: ViewSummary; siblings: ViewSummary[] }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ViewTab>('overview')
  const [orientation, setOrientation] = useState(getViewTabOrientation)

  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 768px)')
    if (!media) return

    const update = () => setOrientation(media.matches ? 'vertical' : 'horizontal')
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  return (
    <Tabs
      className={cn('views-detail-layout', `views-detail-layout--${orientation}`)}
      orientation={orientation}
      value={tab}
      onValueChange={(value) => setTab(value as ViewTab)}
    >
      <aside className="views-detail-sidebar">
        <TabsList className="views-tabs" aria-label={t('views.detail.tabsLabel')}>
          {VIEW_TABS.map((id) => (
            <TabsTab key={id} value={id} className="views-tabs__tab">
              <span aria-hidden="true" className={`views-tabs__icon ${viewTabIcons[id]}`} />
              <span>{t(`views.detail.tabs.${id}`)}</span>
            </TabsTab>
          ))}
        </TabsList>
        <ViewContext view={view} />
      </aside>
      <TabsPanel className="views-detail-panel" value={tab}>
        {tab === 'overview' ? (
          <div className="views-detail-content">
            <h2 className="views-detail-section-title">{t('views.detail.tabs.overview')}</h2>
            <ViewOverview view={view} siblings={siblings} />
          </div>
        ) : tab === 'documents' ? (
          <div className="views-detail-content">
            <h2 className="views-detail-section-title">{t('views.detail.tabs.documents')}</h2>
            <ViewDocuments view={view} />
          </div>
        ) : (
          <div className="views-detail-content">
            <h2 className="views-detail-section-title">{t(`views.detail.tabs.${tab}`)}</h2>
            <ViewPaneMessage message={t(`views.detail.pending.${tab}`)} />
          </div>
        )}
      </TabsPanel>
    </Tabs>
  )
}

function ViewContext({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
  })
  const pipelineState = pipelinesQuery.data?.find((pipeline) => pipeline.id === view.pipelineId)
    ?.status?.state

  return (
    <dl className="views-detail-context">
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
            <span className="text-text-tertiary">
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
          <span className="text-text-tertiary">
            {' · '}
            {t('views.detail.collection', { name: view.location.collection })}
          </span>
        </dd>
      </div>
    </dl>
  )
}

function HighlightedJson({ value }: { value: Record<string, unknown> }) {
  const source = JSON.stringify(value, null, 2)
  const tokens =
    /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g
  const pieces: ReactNode[] = []
  let cursor = 0
  for (const match of source.matchAll(tokens)) {
    const start = match.index
    if (start > cursor) pieces.push(source.slice(cursor, start))
    const token = match[0]
    const kind = token.startsWith('"')
      ? /^\s*:/.test(source.slice(start + token.length))
        ? 'key'
        : 'string'
      : token === 'true' || token === 'false'
        ? 'boolean'
        : token === 'null'
          ? 'null'
          : 'number'
    pieces.push(
      <span className={`views-json--${kind}`} key={start}>
        {token}
      </span>,
    )
    cursor = start + token.length
  }
  pieces.push(source.slice(cursor))
  return <code>{pieces}</code>
}

function ViewDocuments({ view }: { view: ViewSummary }) {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const preview = useQuery({
    queryKey: ['view-documents', view.location.storeId, view.location.collection, 5],
    queryFn: () =>
      previewSourceCollection(view.location.storeId, view.location.collection, apiFetch, 5),
  })

  if (preview.isPending) return <ViewPaneMessage message={t('views.preview.loading')} />
  if (preview.isError) {
    return (
      <div className="views-pane-message" role="alert">
        <p>{t('views.preview.error')}</p>
        <Button type="button" variant="outline" onClick={() => void preview.refetch()}>
          {t('state.error.retry')}
        </Button>
      </div>
    )
  }
  if (preview.data.rows.length === 0) return <ViewPaneMessage message={t('views.preview.empty')} />

  const activeIndex = Math.min(selectedIndex, preview.data.rows.length - 1)
  const selectedRow = preview.data.rows[activeIndex]

  return (
    <section className="views-documents" aria-label={t('views.preview.title')}>
      <div className="views-documents__summary">
        <p>
          {t('views.preview.rows', { count: preview.data.rows.length })}
          {preview.data.moreAvailable ? ` · ${t('views.preview.moreAvailable')}` : ''}
        </p>
      </div>
      <div className="views-documents__browser">
        <nav className="views-documents__list" aria-label={t('views.preview.title')}>
          {preview.data.rows.map((row, index) => (
            <button
              aria-pressed={index === activeIndex}
              className={cn(
                'views-documents__item',
                index === activeIndex && 'views-documents__item--active',
              )}
              key={`${index}-${String(row._id ?? '')}`}
              onClick={() => setSelectedIndex(index)}
              title={String(row._id ?? '')}
              type="button"
            >
              <span className="views-documents__ordinal">{String(index + 1).padStart(2, '0')}</span>
              <span className="views-documents__identifier">{String(row._id ?? '')}</span>
            </button>
          ))}
        </nav>
        <article className="views-document">
          <header className="views-document__header">
            <span>
              {t('views.detail.tabs.documents')} / {String(activeIndex + 1).padStart(2, '0')}
            </span>
            <span className="views-document__id" title={String(selectedRow._id ?? '')}>
              {String(selectedRow._id ?? '')}
            </span>
          </header>
          <pre className="views-document__code">
            <HighlightedJson value={selectedRow} />
          </pre>
        </article>
      </div>
    </section>
  )
}

function ViewPaneMessage({ message }: { message: string }) {
  return (
    <div className="views-pane-message" role="status">
      <p>{message}</p>
    </div>
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

function ViewOverview({ view, siblings }: { view: ViewSummary; siblings: ViewSummary[] }) {
  const { t } = useTranslation()
  const duration = useDurationText()
  const lastApplied =
    view.lastAppliedAt === null
      ? t('views.detail.neverApplied')
      : t('views.detail.lastApplied', {
          age: duration((Date.now() - view.lastAppliedAt) / 1000),
        })
  const notReported = t('overview.notReported')

  return (
    <div className="views-overview-layout">
      <div className="views-summary">
        <div className="views-summary__primary">
          <p className="views-stat__label">{t('views.detail.freshness')}</p>
          <div className="views-summary__status">
            <ViewStatus status={view.status} />
          </div>
          <p className="views-stat__hint">{lastApplied}</p>
        </div>
        <div className="views-summary__metrics">
          <Stat
            label={t('views.table.documents')}
            value={view.documents === null ? '—' : view.documents.toLocaleString()}
            hint={view.documents === null ? notReported : undefined}
          />
          <Stat
            label={t('views.detail.size')}
            value={view.sizeBytes === null ? '—' : formatBytes(view.sizeBytes)}
            hint={view.sizeBytes === null ? notReported : undefined}
          />
        </div>
      </div>

      <LoadProgress view={view} />
      {siblings.length > 0 && (
        <div className="views-siblings">
          <p className="views-siblings__label">{t('views.detail.siblings')}</p>
          <div className="views-siblings__links">
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                to="/views/$viewId"
                params={{ viewId: sibling.id }}
                className="views-link"
              >
                {sibling.location.collection}
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="views-overview__limit">{t('views.detail.documentLimit')}</p>
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
      <p className="views-load__message">
        <span className="sr-only">{t('views.detail.upToDate')}. </span>
        {t('views.detail.streaming')}
      </p>
    )
  }
  return null
}
