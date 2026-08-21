import type { ComponentType, SVGProps } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Columns,
  Database,
  FileText,
  GitMerge,
  HardDrive,
  Leaf,
  ListFilter,
  LoaderCircle,
  Maximize2,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings,
  Table as TableIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SourceEnvelope, SourceTableView, SourceView } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getSource, listSources, SourceClientError } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { SourceCreateDialog } from './source-create-dialog'
import { SourceEditDialog } from './source-edit-dialog'

type SourceTab = 'data' | 'columns' | 'settings' | 'lineage' | 'log'

interface SourceTable {
  id: string
  name: string
  type: string
  selector: string
}

interface Source {
  raw: SourceView
  id: string
  name: string
  type: string
  host: string
  tables: SourceTable[]
}

const tabs: Array<{ value: SourceTab; labelKey: string }> = [
  { value: 'data', labelKey: 'sources.tabs.data' },
  { value: 'columns', labelKey: 'sources.tabs.columns' },
  { value: 'settings', labelKey: 'sources.tabs.settings' },
  { value: 'lineage', labelKey: 'sources.tabs.lineage' },
  { value: 'log', labelKey: 'sources.tabs.log' },
]

function sourceIcon(type: string): ComponentType<SVGProps<SVGSVGElement>> {
  const connector = type.toLowerCase()
  if (connector.includes('mongo')) return Leaf
  if (connector.includes('kafka') || connector.includes('pulsar')) return Activity
  if (connector.includes('bigquery')) return Cloud
  if (connector.includes('snowflake') || connector.includes('s3') || connector.includes('file'))
    return HardDrive
  if (connector.includes('sql') || connector.includes('oracle')) return Server
  return Database
}

function sourceIconColor(type: string) {
  const connector = type.toLowerCase()
  if (connector.includes('postgres')) return 'text-[#336791]'
  if (connector.includes('mongo')) return 'text-[#47A248]'
  if (connector.includes('kafka') || connector.includes('pulsar')) return 'text-gray-700'
  if (connector.includes('snowflake')) return 'text-cyan-600'
  return 'text-gray-600'
}

function tabIcon(tabName: SourceTab): ComponentType<SVGProps<SVGSVGElement>> {
  switch (tabName) {
    case 'settings':
      return Settings
    case 'lineage':
      return GitMerge
    case 'log':
      return FileText
    default:
      return Columns
  }
}

export function SourcesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [searchText, setSearchText] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SourceTab>('data')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  function toTable(table: SourceTableView, index: number): SourceTable {
    const name = table.name ?? table.pattern ?? table.filter ?? t('sources.details.unnamedTable')
    return {
      id: `${table.type}-${name}-${index}`,
      name,
      type: table.type,
      selector: selectorDescription(table),
    }
  }

  function selectorDescription(table: SourceTableView) {
    if (table.type === 'literal' && table.name) return table.name
    if (table.pattern) return table.pattern
    if (table.filter) return table.filter
    if (table.pk?.length) return table.pk.join(', ')
    return t('sources.details.selectorUnavailable')
  }

  function sourceEndpoint(source: SourceView) {
    const candidates = [
      'host',
      'hostname',
      'server',
      'url',
      'uri',
      'connectionString',
      'bootstrapServers',
    ]
    for (const key of candidates) {
      const value = source.config[key]
      if (typeof value === 'string' && value) return value
    }
    return t('sources.details.endpointUnavailable')
  }

  function toSource(source: SourceView): Source {
    return {
      raw: source,
      id: source.id,
      name: source.id,
      type: source.connector,
      host: sourceEndpoint(source),
      tables: (source.tables ?? []).map((table, index) => toTable(table, index)),
    }
  }

  const sourcesQuery = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(apiFetch),
  })
  const editingSourceQuery = useQuery({
    queryKey: ['source', editingSourceId],
    enabled: editingSourceId !== null,
    retry: false,
    queryFn: () => getSource(editingSourceId!, apiFetch),
  })

  const sources = (sourcesQuery.data ?? []).map(toSource)
  const sourceSearchQuery = searchText.trim().toLowerCase()
  const filteredSources = sourceSearchQuery
    ? sources.filter(
        (source) =>
          source.name.toLowerCase().includes(sourceSearchQuery) ||
          source.type.toLowerCase().includes(sourceSearchQuery) ||
          source.host.toLowerCase().includes(sourceSearchQuery),
      )
    : sources

  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? null
  const selectedTable = selectedSource?.tables.find((table) => table.id === selectedTableId) ?? null
  const activeTabLabel = t(
    tabs.find((tab) => tab.value === activeTab)?.labelKey ?? 'sources.tabs.data',
  )

  function selectSource(source: Source | null) {
    setSelectedSourceId(source?.id ?? null)
    setSelectedTableId(null)
    setActiveTab('data')
  }

  function selectTable(table: SourceTable) {
    setSelectedTableId(table.id)
    setActiveTab('data')
  }

  function onCreated(created: SourceView) {
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      [...(current ?? []).filter((item) => item.id !== created.id), created].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    )
    setSelectedSourceId(created.id)
    setSelectedTableId(null)
    setSuccessMessage(t('sources.create.success', { id: created.id }))
  }

  function onEdited(result: SourceEnvelope) {
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      [...(current ?? []).filter((item) => item.id !== result.source.id), result.source].sort(
        (left, right) => left.id.localeCompare(right.id),
      ),
    )
    queryClient.setQueryData<SourceEnvelope>(['source', result.source.id], result)
    setSelectedSourceId(result.source.id)
    setSelectedTableId(null)
    setEditingSourceId(null)
    setSuccessMessage(t('sources.edit.success', { id: result.source.id }))
  }

  useEffect(() => {
    if (!successMessage) return
    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  const loadError =
    sourcesQuery.error instanceof SourceClientError && sourcesQuery.error.kind === 'network'
      ? t('sources.states.network')
      : sourcesQuery.error
        ? t('sources.states.error')
        : ''
  const editLoadFailed = editingSourceId === selectedSource?.id && editingSourceQuery.isError
  const editLoading = editingSourceId === selectedSource?.id && editingSourceQuery.isFetching

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-gray-900">
          {t('sources.title')}
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('sources.actions.create')}
        </button>
      </header>

      {successMessage && (
        <div
          className="pointer-events-none fixed top-4 right-4 z-50"
          role="status"
          aria-live="polite"
        >
          <div className="border-border bg-background text-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] shadow-lg">
            <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-r md:border-b-0">
          <div className="border-b border-gray-100/70 p-3">
            <label className="relative block">
              <span className="sr-only">{t('sources.search.label')}</span>
              <Search className="absolute top-2 left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                value={searchText}
                type="search"
                className="w-full rounded-lg border border-gray-200/80 bg-white py-1.5 pr-3 pl-9 text-[13px] transition outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
                placeholder={t('sources.search.placeholder')}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>

            <label className="relative mt-2 block">
              <span className="sr-only">{t('sources.filters.connectionStatus.label')}</span>
              <ListFilter
                className="absolute top-2 left-3 h-3.5 w-3.5 text-gray-400"
                aria-hidden="true"
              />
              <Select value="all">
                <SelectTrigger
                  aria-label={t('sources.filters.connectionStatus.label')}
                  className="border-gray-200/80 py-1.5 pr-3 pl-8 text-gray-600 shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sources.filters.connectionStatus.all')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="flex min-h-[150px] flex-1 gap-1 overflow-auto p-2 md:flex-col">
            <button
              type="button"
              className={cn(
                'flex min-w-[160px] items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors md:min-w-0',
                selectedSource === null
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
              onClick={() => selectSource(null)}
            >
              <Database className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span className="truncate">{t('sources.allSources')}</span>
            </button>

            {filteredSources.map((source) => {
              const Icon = sourceIcon(source.type)
              return (
                <button
                  key={source.id}
                  type="button"
                  className={cn(
                    'flex min-w-[190px] items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors md:min-w-0',
                    selectedSource?.id === source.id
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                  onClick={() => selectSource(source)}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', sourceIconColor(source.type))}
                    aria-hidden="true"
                  />
                  <span className="truncate">{source.name}</span>
                  <span
                    className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          {sourcesQuery.isLoading ? (
            <div className="page-state">
              <LoaderCircle className="h-7 w-7 animate-spin text-gray-300" aria-hidden="true" />
              <div className="page-state__title">{t('sources.states.loading')}</div>
            </div>
          ) : loadError ? (
            <div className="page-state">
              <AlertCircle className="h-8 w-8 text-orange-400" aria-hidden="true" />
              <div className="page-state__title">{t('state.error.title')}</div>
              <p className="page-state__body">{loadError}</p>
              <button
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white"
                type="button"
                onClick={() => void sourcesQuery.refetch()}
              >
                {t('state.error.retry')}
              </button>
            </div>
          ) : selectedSource && !selectedTable ? (
            <>
              <div className="shrink-0 border-b border-gray-100/70 bg-white px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-50">
                      {(() => {
                        const Icon = sourceIcon(selectedSource.type)
                        return (
                          <Icon
                            className={cn('h-5 w-5', sourceIconColor(selectedSource.type))}
                            aria-hidden="true"
                          />
                        )
                      })()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-gray-900">
                        {selectedSource.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                          {selectedSource.host}
                        </span>
                        <span>{selectedSource.type}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-gray-300"
                            aria-hidden="true"
                          />
                          {t('sources.details.secretConfiguredCount', {
                            count: selectedSource.raw.configuredSecrets.length,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {editLoadFailed && (
                      <div
                        className="text-destructive flex items-center gap-1.5 text-[12px]"
                        role="alert"
                      >
                        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('sources.edit.errors.unknown')}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void editingSourceQuery.refetch()}
                        >
                          {t('state.error.retry')}
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      type="button"
                      disabled={editLoading}
                      className="min-w-[72px]"
                      onClick={() => setEditingSourceId(selectedSource.id)}
                    >
                      {editLoading && <LoaderCircle className="size-3.5 animate-spin" />}
                      {t('sources.detail.edit')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-gray-50/40 p-4 md:p-6">
                <h3 className="mb-3 text-[13px] font-semibold text-gray-900">
                  {t('sources.tablesIn', { name: selectedSource.name })}
                </h3>
                {selectedSource.tables.length === 0 ? (
                  <div className="page-state rounded-lg border border-gray-200/70 bg-white">
                    <TableIcon className="h-8 w-8 text-gray-300" aria-hidden="true" />
                    <div className="page-state__title">{t('sources.noTablesTitle')}</div>
                    <p className="page-state__body">{t('sources.details.noTables')}</p>
                  </div>
                ) : (
                  <DataTable
                    headers={[
                      t('sources.table.name'),
                      t('sources.table.type'),
                      t('sources.table.selector'),
                      t('common.actions'),
                    ]}
                  >
                    {selectedSource.tables.map((table) => (
                      <tr
                        key={table.id}
                        className="group cursor-pointer transition-colors hover:bg-gray-50/70"
                        onClick={() => selectTable(table)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TableIcon
                              className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-gray-900">{table.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{table.type}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 font-mono text-[12px] text-gray-500">
                          {table.selector}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight
                            className="inline-block h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </div>
            </>
          ) : selectedSource && selectedTable ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-gray-100/70 bg-white px-4 pt-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="inline-flex items-center gap-1 font-medium text-gray-500 transition-colors hover:text-gray-900"
                    onClick={() => setSelectedTableId(null)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{selectedSource.name}</span>
                  </button>
                  <button
                    disabled
                    className="cursor-not-allowed rounded-md p-1.5 text-gray-300"
                    aria-label={t('common.expand')}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-5 overflow-x-auto text-[13px] font-medium">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={cn(
                        'relative top-px shrink-0 border-b-2 pb-2.5 transition-colors',
                        activeTab === tab.value
                          ? 'border-gray-900 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700',
                      )}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row">
                <div className="min-w-0 flex-1 overflow-auto">
                  <div className="page-state">
                    {(() => {
                      const Icon = tabIcon(activeTab)
                      return <Icon className="h-8 w-8 text-gray-300" aria-hidden="true" />
                    })()}
                    <div className="page-state__title">
                      {t('sources.observationUnavailableTitle', { tab: activeTabLabel })}
                    </div>
                    <p className="page-state__body">{t('sources.observationUnavailableBody')}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AllSourcesView
              sources={sources}
              filteredSources={filteredSources}
              onCreate={() => setCreateOpen(true)}
              onSelect={selectSource}
            />
          )}
        </main>
      </div>

      <SourceCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onCreated} />
      {editingSourceId &&
        editingSourceQuery.data &&
        !editingSourceQuery.isFetching &&
        !editingSourceQuery.isError && (
          <SourceEditDialog
            open
            source={editingSourceQuery.data.source}
            etag={editingSourceQuery.data.etag}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setEditingSourceId(null)
            }}
            onSaved={onEdited}
          />
        )}
    </section>
  )
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className={cn(
                    'px-4 py-2.5 font-medium',
                    index === headers.length - 1 && 'text-right',
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/70">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function AllSourcesView({
  sources,
  filteredSources,
  onCreate,
  onSelect,
}: {
  sources: Source[]
  filteredSources: Source[]
  onCreate: () => void
  onSelect: (source: Source) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50/40">
      <div className="shrink-0 border-b border-gray-100/70 bg-white px-4 py-4 md:px-6">
        <h2 className="text-base font-semibold text-gray-900">{t('sources.allSources')}</h2>
        <p className="mt-1 text-[13px] text-gray-500">{t('sources.allSourcesDescription')}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {sources.length === 0 ? (
          <div className="page-state rounded-lg border border-gray-200/70 bg-white">
            <Database className="h-8 w-8 text-gray-300" aria-hidden="true" />
            <div className="page-state__title">{t('sources.empty.title')}</div>
            <p className="page-state__body">{t('sources.empty.body')}</p>
            <button
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white"
              type="button"
              onClick={onCreate}
            >
              {t('sources.actions.create')}
            </button>
          </div>
        ) : (
          <DataTable
            headers={[
              t('sources.table.sourceName'),
              t('sources.table.type'),
              t('sources.table.status'),
              t('sources.table.host'),
              t('sources.table.tables'),
              t('common.actions'),
            ]}
          >
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-gray-500">
                  {t('sources.filters.noResults')}
                </td>
              </tr>
            ) : (
              filteredSources.map((source) => {
                const Icon = sourceIcon(source.type)
                return (
                  <tr key={source.id} className="group transition-colors hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <button
                        className="flex items-center gap-2.5 text-left"
                        type="button"
                        onClick={() => onSelect(source)}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200/70 bg-gray-50">
                          <Icon
                            className={cn('h-3.5 w-3.5', sourceIconColor(source.type))}
                            aria-hidden="true"
                          />
                        </span>
                        <span className="font-medium text-gray-900">{source.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{source.type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-600/15 ring-inset">
                        <span className="h-1 w-1 rounded-full bg-gray-400" aria-hidden="true" />
                        {t('sources.details.secretConfigured')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{source.host}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {t('sources.tablesCount', { count: source.tables.length })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-md p-1 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
                        type="button"
                        aria-label={t('common.more')}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </DataTable>
        )}
      </div>
    </div>
  )
}
