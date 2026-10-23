import { SearchInput } from '@langgenius/dify-ui/search-input'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@langgenius/dify-ui/tabs'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  Boxes,
  Columns3,
  Database,
  LoaderCircle,
  RefreshCw,
  Table2,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  getViewCollectionStats,
  listViewCollections,
  previewViewCollection,
  type ViewCollection,
} from '@/service/data-browser-client'
import { getPipeline, listPipelines, type PipelineView } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

type ViewTab = 'preview' | 'model' | 'lineage'

export function ViewCollectionBrowserPage() {
  const { i18n, t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ViewTab>('preview')
  const collectionsQuery = useQuery({
    queryKey: ['views', 'collections'],
    queryFn: () => listViewCollections(apiFetch),
    retry: false,
  })
  const pipelineCatalogQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    retry: false,
  })
  const pipelineDetailQueries = useQueries({
    queries: (pipelineCatalogQuery.data ?? [])
      .filter((pipeline) => pipeline.hasArtifact)
      .map((pipeline) => ({
        queryKey: ['pipelines', pipeline.id],
        queryFn: () => getPipeline(pipeline.id, apiFetch),
        enabled: activeTab === 'lineage',
        retry: false,
      })),
  })
  const pipelineDetails = pipelineDetailQueries.flatMap((query) => (query.data ? [query.data] : []))
  const pipelinesLoading =
    pipelineCatalogQuery.isPending ||
    (activeTab === 'lineage' && pipelineDetailQueries.some((query) => query.isPending))
  const pipelinesError =
    pipelineCatalogQuery.isError ||
    (activeTab === 'lineage' && pipelineDetailQueries.some((query) => query.isError))
  const collections = collectionsQuery.data ?? []
  const visibleCollections = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    return needle
      ? collections.filter((collection) => collection.name.toLocaleLowerCase().includes(needle))
      : collections
  }, [collections, search])
  const selectedCollection =
    visibleCollections.find((collection) => collection.name === selectedName) ??
    visibleCollections[0] ??
    null
  const statsQuery = useQuery({
    queryKey: ['views', selectedCollection?.name, 'stats'],
    queryFn: () => getViewCollectionStats(selectedCollection!.name, apiFetch),
    enabled: selectedCollection !== null,
    retry: false,
  })
  const previewQuery = useQuery({
    queryKey: ['views', selectedCollection?.name, 'preview'],
    queryFn: () => previewViewCollection(selectedCollection!.name, apiFetch),
    enabled: selectedCollection !== null,
    retry: false,
  })

  useEffect(() => {
    if (selectedCollection?.name !== selectedName) {
      setSelectedName(selectedCollection?.name ?? null)
    }
  }, [selectedCollection, selectedName])

  const owningPipeline = useMemo(
    () =>
      selectedCollection
        ? (pipelineDetails.find(
            (pipeline) => inlineViewCollection(pipeline) === selectedCollection.name,
          ) ?? null)
        : null,
    [pipelineDetails, selectedCollection],
  )
  const sourceTables = useMemo(
    () => (owningPipeline ? upstreamSourceTables(owningPipeline) : []),
    [owningPipeline],
  )

  if (collectionsQuery.isPending) {
    return (
      <PageState
        icon={<LoaderCircle className="size-5 animate-spin" />}
        message={t('views.states.loading')}
      />
    )
  }

  if (collectionsQuery.isError) {
    return (
      <PageState
        icon={<AlertCircle className="size-5" />}
        message={t('views.states.error')}
        action={
          <Button type="button" variant="outline" onClick={() => void collectionsQuery.refetch()}>
            {t('state.error.retry')}
          </Button>
        }
      />
    )
  }

  const numberFormatter = new Intl.NumberFormat(i18n.language)
  const viewFields = selectedCollection
    ? fieldsFor(selectedCollection, previewQuery.data?.rows)
    : []
  const previewColumns = selectedCollection?.fields?.length
    ? selectedCollection.fields
    : [...new Set((previewQuery.data?.rows ?? []).flatMap((row) => Object.keys(row)))]

  return (
    <section className="bg-background text-foreground flex h-full min-h-0 w-full flex-col overflow-hidden">
      <header className="border-border flex shrink-0 items-center justify-between gap-4 border-b px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg leading-6 font-semibold">{t('views.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t('views.subtitle')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={collectionsQuery.isFetching}
          onClick={() => {
            void collectionsQuery.refetch()
            if (selectedCollection) {
              void statsQuery.refetch()
              void previewQuery.refetch()
            }
          }}
        >
          <RefreshCw className={collectionsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} />
          <span className="hidden sm:inline">{t('views.refresh')}</span>
        </Button>
      </header>

      {collections.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
            <Boxes className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold">{t('views.empty.title')}</h2>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            {t('views.empty.body')}
          </p>
          <Button asChild variant="outline">
            <Link to="/pipelines">{t('views.empty.action')}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="border-border flex max-h-72 min-h-48 shrink-0 flex-col border-b md:max-h-none md:w-72 md:border-r md:border-b-0">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-muted-foreground text-xs font-semibold">{t('views.explorer')}</h2>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs tabular-nums">
                {numberFormatter.format(collections.length)}
              </span>
            </div>
            <SearchInput
              className="mx-3 my-3"
              value={search}
              onValueChange={setSearch}
              aria-label={t('views.search.label')}
              clearLabel={t('views.search.clear')}
              placeholder={t('views.search.placeholder')}
            />
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
              {visibleCollections.length > 0 ? (
                visibleCollections.map((collection) => (
                  <button
                    key={collection.name}
                    type="button"
                    aria-pressed={collection.name === selectedCollection?.name}
                    data-selected={collection.name === selectedCollection?.name}
                    className="hover:bg-accent focus-visible:ring-ring data-[selected=true]:bg-accent flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-transform focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                    onClick={() => setSelectedName(collection.name)}
                  >
                    <Table2 className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-medium" title={collection.name}>
                      {collection.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {collection.fields?.length ?? '—'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground px-3 py-4 text-sm">{t('views.search.empty')}</p>
              )}
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            {selectedCollection ? (
              <>
                <section className="border-border shrink-0 border-b px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold break-all">
                          {selectedCollection.name}
                        </h2>
                        <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                          {t('views.materialized')}
                        </span>
                      </div>
                      {selectedCollection.description && (
                        <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed">
                          {selectedCollection.description}
                        </p>
                      )}
                    </div>
                    {owningPipeline && (
                      <Link
                        to="/pipelines/$pipelineId/edit"
                        params={{ pipelineId: owningPipeline.id }}
                        className="text-foreground hover:bg-accent focus-visible:ring-ring inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Boxes className="size-4" aria-hidden="true" />
                        <span className="max-w-48 truncate" title={owningPipeline.id}>
                          {owningPipeline.id}
                        </span>
                      </Link>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-lg">
                    <Stat label={t('views.stats.documents')}>
                      {statsQuery.isPending
                        ? t('views.stats.loading')
                        : statsQuery.data?.numOfRows == null
                          ? '—'
                          : numberFormatter.format(statsQuery.data.numOfRows)}
                    </Stat>
                    <Stat label={t('views.stats.storage')}>
                      {statsQuery.isPending
                        ? t('views.stats.loading')
                        : formatBytes(statsQuery.data?.storageSize ?? null, i18n.language)}
                    </Stat>
                  </div>
                  {statsQuery.isError && (
                    <p className="text-destructive mt-3 text-sm" role="status">
                      {t('views.stats.error')}
                    </p>
                  )}
                </section>

                <Tabs
                  className="flex min-h-0 flex-1 flex-col"
                  value={activeTab}
                  onValueChange={(value) => {
                    if (value === 'preview' || value === 'model' || value === 'lineage')
                      setActiveTab(value)
                  }}
                >
                  <TabsList
                    className="border-divider-subtle shrink-0 gap-6 border-b px-4 sm:px-6"
                    aria-label={t('views.detailTabs')}
                  >
                    {(['preview', 'model', 'lineage'] as const).map((tab) => (
                      <TabsTab key={tab} value={tab}>
                        {t(`views.tabs.${tab}`)}
                      </TabsTab>
                    ))}
                  </TabsList>
                  <TabsPanel
                    value="preview"
                    tabIndex={-1}
                    className="min-h-0 flex-1 overflow-auto p-4 sm:p-6"
                  >
                    <PreviewPanel
                      columns={previewColumns}
                      rows={previewQuery.data?.rows ?? []}
                      loading={previewQuery.isPending}
                      error={previewQuery.isError}
                      moreAvailable={previewQuery.data?.moreAvailable ?? false}
                      onRetry={() => void previewQuery.refetch()}
                      numberFormatter={numberFormatter}
                      t={t}
                    />
                  </TabsPanel>
                  <TabsPanel
                    value="model"
                    tabIndex={-1}
                    className="min-h-0 flex-1 overflow-auto p-4 sm:p-6"
                  >
                    <ModelPanel
                      fields={viewFields}
                      discovered={selectedCollection.fields !== undefined}
                      numberFormatter={numberFormatter}
                      t={t}
                    />
                  </TabsPanel>
                  <TabsPanel
                    value="lineage"
                    tabIndex={-1}
                    className="min-h-0 flex-1 overflow-auto p-4 sm:p-6"
                  >
                    <LineagePanel
                      pipeline={owningPipeline}
                      pipelinesLoading={pipelinesLoading}
                      pipelinesError={pipelinesError}
                      sourceTables={sourceTables}
                      t={t}
                    />
                  </TabsPanel>
                </Tabs>
              </>
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
                {t('views.search.empty')}
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border min-w-0 border-l pl-3 first:border-l-0 first:pl-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-1 text-sm font-semibold tabular-nums">{children}</div>
    </div>
  )
}

function PreviewPanel({
  columns,
  rows,
  loading,
  error,
  moreAvailable,
  onRetry,
  numberFormatter,
  t,
}: {
  columns: string[]
  rows: Array<Record<string, unknown>>
  loading: boolean
  error: boolean
  moreAvailable: boolean
  onRetry: () => void
  numberFormatter: Intl.NumberFormat
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (loading)
    return (
      <PanelState
        icon={<LoaderCircle className="size-5 animate-spin" />}
        message={t('views.preview.loading')}
      />
    )
  if (error) {
    return (
      <PanelState
        icon={<AlertCircle className="size-5" />}
        message={t('views.preview.error')}
        action={
          <Button type="button" variant="outline" onClick={onRetry}>
            {t('state.error.retry')}
          </Button>
        }
      />
    )
  }
  if (rows.length === 0) {
    return <PanelState icon={<Database className="size-5" />} message={t('views.preview.empty')} />
  }

  const visibleColumns =
    columns.length > 0 ? columns : [...new Set(rows.flatMap((row) => Object.keys(row)))]

  return (
    <section className="space-y-3" aria-label={t('views.preview.title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('views.preview.title')}</h3>
        <p className="text-muted-foreground text-xs">
          {t('views.preview.rows', { count: numberFormatter.format(rows.length) })}
          {moreAvailable ? ` · ${t('views.preview.moreAvailable')}` : ''}
        </p>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-xs">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="border-border max-w-64 border-b px-3 py-2.5 font-medium"
                >
                  <span className="block break-all" title={column}>
                    {column}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-border border-b last:border-b-0">
                {visibleColumns.map((column) => (
                  <td key={column} className="text-foreground max-w-72 px-3 py-2.5 align-top">
                    <span className="block break-all">{displayValue(row[column])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ModelPanel({
  fields,
  discovered,
  numberFormatter,
  t,
}: {
  fields: Array<{ name: string; sampleType: string }>
  discovered: boolean
  numberFormatter: Intl.NumberFormat
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (fields.length === 0) {
    return (
      <PanelState
        icon={<Columns3 className="size-5" />}
        message={discovered ? t('views.model.empty') : t('views.model.undiscovered')}
      />
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t('views.model.title')}</h3>
          <p className="text-muted-foreground mt-1 text-xs">{t('views.model.description')}</p>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {t('views.model.fieldCount', { count: numberFormatter.format(fields.length) })}
        </span>
      </div>
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/60 text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)] gap-3 border-b px-3 py-2.5 text-xs font-medium">
          <span>{t('views.model.field')}</span>
          <span>{t('views.model.sampleType')}</span>
        </div>
        {fields.map((field) => (
          <div
            key={field.name}
            className="border-border grid grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)] gap-3 border-b px-3 py-2.5 text-sm last:border-b-0"
          >
            <code className="font-mono text-xs break-all">{field.name}</code>
            <span className="text-muted-foreground">{field.sampleType}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function LineagePanel({
  pipeline,
  pipelinesLoading,
  pipelinesError,
  sourceTables,
  t,
}: {
  pipeline: PipelineView | null
  pipelinesLoading: boolean
  pipelinesError: boolean
  sourceTables: string[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (pipelinesLoading) {
    return (
      <PanelState
        icon={<LoaderCircle className="size-5 animate-spin" />}
        message={t('views.lineage.loading')}
      />
    )
  }
  if (pipelinesError || !pipeline) {
    return (
      <PanelState
        icon={<AlertCircle className="size-5" />}
        message={t('views.lineage.unavailable')}
      />
    )
  }

  return (
    <section className="max-w-3xl space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t('views.lineage.title')}</h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {t('views.lineage.description')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/pipelines/$pipelineId/edit"
          params={{ pipelineId: pipeline.id }}
          className="bg-accent hover:bg-accent/80 focus-visible:ring-ring rounded-md px-2.5 py-1.5 font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          {pipeline.id}
        </Link>
        <span className="text-muted-foreground">{t('views.lineage.feeds')}</span>
      </div>
      {sourceTables.length > 0 ? (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {sourceTables.map((table) => (
            <li key={table} className="flex items-center gap-2 px-3 py-2.5 text-sm">
              <Table2 className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <span className="break-all">{table}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t('views.lineage.noSources')}</p>
      )}
    </section>
  )
}

function PageState({
  icon,
  message,
  action,
}: {
  icon: ReactNode
  message: string
  action?: React.ReactNode
}) {
  return (
    <section className="bg-background text-muted-foreground flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
      {icon}
      <p className="text-sm">{message}</p>
      {action}
    </section>
  )
}

function PanelState({
  icon,
  message,
  action,
}: {
  icon: ReactNode
  message: string
  action?: React.ReactNode
}) {
  return (
    <div
      className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center"
      role="status"
    >
      {icon}
      <p className="text-sm">{message}</p>
      {action}
    </div>
  )
}

function inlineViewCollection(pipeline: PipelineView) {
  const storage = asRecord(pipeline.view?.storage)
  const warm = asRecord(storage?.warm)
  return typeof warm?.collection === 'string' ? warm.collection : null
}

function upstreamSourceTables(pipeline: PipelineView) {
  const viewId = pipeline.view?.id
  const viewNode = pipeline.dag.nodes.find(
    (node) => node.type === 'view' && (node.id === `view:${viewId}` || node.label === viewId),
  )
  if (!viewNode) return []

  const upstream = new Set<string>()
  const visited = new Set<string>()
  const pending = [viewNode.id]
  while (pending.length > 0) {
    const target = pending.pop()
    if (!target || visited.has(target)) continue
    visited.add(target)
    for (const edge of pipeline.dag.edges) {
      if (edge.target !== target) continue
      const sourceNode = pipeline.dag.nodes.find((node) => node.id === edge.source)
      if (!sourceNode) continue
      if (sourceNode.type === 'source') {
        upstream.add(`${sourceNode.detail ? `${sourceNode.detail}.` : ''}${sourceNode.label}`)
      } else {
        pending.push(sourceNode.id)
      }
    }
  }
  return [...upstream]
}

function fieldsFor(collection: ViewCollection, rows: Array<Record<string, unknown>> | undefined) {
  const names = collection.fields?.length
    ? collection.fields
    : [...new Set((rows ?? []).flatMap((row) => Object.keys(row)))]
  return names.map((name) => {
    const sample = (rows ?? [])
      .map((row) => row[name])
      .find((value) => value !== undefined && value !== null)
    return { name, sampleType: sample === undefined ? '—' : sampleType(sample) }
  })
}

function sampleType(value: unknown) {
  if (Array.isArray(value)) return 'Array'
  if (value === null) return 'Null'
  if (typeof value === 'object') return 'Object'
  return typeof value === 'string'
    ? 'String'
    : typeof value === 'number'
      ? 'Number'
      : typeof value === 'boolean'
        ? 'Boolean'
        : '—'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function displayValue(value: unknown) {
  if (value === null) return 'null'
  if (value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatBytes(value: number | null, locale: string) {
  if (value === null) return '—'
  if (value < 1024) return `${new Intl.NumberFormat(locale).format(value)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unit = 'KB'
  for (let index = 1; size >= 1024 && index < units.length; index += 1) {
    size /= 1024
    unit = units[index]
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size)} ${unit}`
}
