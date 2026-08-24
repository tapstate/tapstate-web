import type { ComponentType, SVGProps } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Columns,
  Database,
  FileText,
  GitMerge,
  ListFilter,
  LoaderCircle,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Table as TableIcon,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  ConnectorSummary,
  SourceEnvelope,
  SourceSchemaReport,
  SourceSchemaTable,
  SourceTableView,
  SourceView,
} from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  discoverSourceSchema,
  getSource,
  getSourceSchema,
  listConnectors,
  listSources,
  SourceClientError,
  testConnection,
  type ConnectionTestReport,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectionTestResultDialog } from './connection-test-result'
import { SourceCreateDialog } from './source-create-dialog'
import { SourceDeleteDialog } from './source-delete-dialog'
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
  connectorName: string
  connectorIcon: string | null
  host: string
  tables: SourceTable[]
}

function toSchemaTable(table: SourceSchemaTable): SourceTable {
  return {
    id: `schema-${table.name}`,
    name: table.name,
    type: 'table',
    selector: table.name,
  }
}

const tabs: Array<{ value: SourceTab; labelKey: string }> = [
  { value: 'data', labelKey: 'sources.tabs.data' },
  { value: 'columns', labelKey: 'sources.tabs.columns' },
  { value: 'settings', labelKey: 'sources.tabs.settings' },
  { value: 'lineage', labelKey: 'sources.tabs.lineage' },
  { value: 'log', labelKey: 'sources.tabs.log' },
]

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

function connectionTestErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (!(error instanceof SourceClientError)) return t('sources.test.errors.unknown')
  if (error.kind === 'network') return t('sources.test.errors.network')
  if (error.kind === 'protocol') return t('sources.test.errors.protocol')
  return t('sources.test.errors.server')
}

function schemaErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (error instanceof SourceClientError && error.status === 404)
    return t('sources.schema.notDiscovered')
  if (error instanceof SourceClientError && error.kind === 'network')
    return t('sources.schema.networkError')
  if (error instanceof SourceClientError && error.kind === 'protocol')
    return t('sources.schema.protocolError')
  return t('sources.schema.loadError')
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
  const [deletingSource, setDeletingSource] = useState<Source | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null)
  const [testReport, setTestReport] = useState<ConnectionTestReport | null>(null)
  const [testError, setTestError] = useState('')
  const [schemaRefreshingSourceId, setSchemaRefreshingSourceId] = useState<string | null>(null)
  const [schemaRefreshError, setSchemaRefreshError] = useState('')

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

  function toSource(source: SourceView, connector?: ConnectorSummary): Source {
    return {
      raw: source,
      id: source.id,
      name: source.id,
      type: source.connector,
      connectorName: connector?.name ?? source.connector,
      connectorIcon: connector?.icon ?? null,
      host: sourceEndpoint(source),
      tables: (source.tables ?? []).map((table, index) => toTable(table, index)),
    }
  }

  const sourcesQuery = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const editingSourceQuery = useQuery({
    queryKey: ['source', editingSourceId],
    enabled: editingSourceId !== null,
    retry: false,
    queryFn: () => getSource(editingSourceId!, apiFetch),
  })

  const connectorsById = new Map(
    (connectorsQuery.data ?? []).map((connector) => [connector.id, connector]),
  )
  const sources = (sourcesQuery.data ?? []).map((source) =>
    toSource(source, connectorsById.get(source.connector)),
  )
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
  const sourceSchemaQuery = useQuery({
    queryKey: ['source-schema', selectedSource?.id],
    enabled: selectedSource !== null,
    retry: false,
    queryFn: () => getSourceSchema(selectedSource!.id, apiFetch),
  })
  const discoveredTables = (sourceSchemaQuery.data?.tables ?? []).map(toSchemaTable)
  const visibleTables = sourceSchemaQuery.data ? discoveredTables : (selectedSource?.tables ?? [])
  const selectedConfiguredTable = selectedSource?.tables.find(
    (table) => table.id === selectedTableId,
  )
  const selectedTable =
    visibleTables.find((table) => table.id === selectedTableId) ??
    visibleTables.find((table) => table.name === selectedConfiguredTable?.name) ??
    null
  const selectedSchemaTable = selectedTable
    ? (sourceSchemaQuery.data?.tables.find((table) => table.name === selectedTable.name) ?? null)
    : null
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
    setActiveTab('columns')
  }

  async function runSourceTest(source: SourceView) {
    setTestReport(null)
    setTestError('')
    setTestingSourceId(source.id)
    try {
      setTestReport(
        await testConnection(
          { id: source.id, connectorId: source.connector, settings: source.config },
          apiFetch,
        ),
      )
    } catch (error) {
      setTestError(connectionTestErrorMessage(error, t))
    } finally {
      setTestingSourceId(null)
    }
  }

  async function refreshSourceSchema(source: SourceView) {
    setSchemaRefreshError('')
    setSchemaRefreshingSourceId(source.id)
    try {
      const report = await discoverSourceSchema(
        { id: source.id, connectorId: source.connector, settings: source.config },
        apiFetch,
      )
      queryClient.setQueryData<SourceSchemaReport>(['source-schema', source.id], report)
      setSuccessMessage(t('sources.schema.refreshSuccess', { id: source.id }))
    } catch (error) {
      setSchemaRefreshError(schemaErrorMessage(error, t))
    } finally {
      setSchemaRefreshingSourceId(null)
    }
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

  function onDeleted(source: Source) {
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      (current ?? []).filter((item) => item.id !== source.id),
    )
    queryClient.removeQueries({ queryKey: ['source', source.id] })
    queryClient.removeQueries({ queryKey: ['source-schema', source.id] })
    setDeletingSource(null)
    if (selectedSourceId === source.id) selectSource(null)
    setSuccessMessage(t('sources.delete.success', { id: source.id }))
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
        <Button
          type="button"
          className="px-3 text-[13px] font-medium shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('sources.actions.create')}
        </Button>
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
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'h-auto min-w-[160px] justify-start px-3 py-2 text-left text-[13px] md:min-w-0',
                selectedSource === null
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
              onClick={() => selectSource(null)}
            >
              <Database className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span className="truncate">{t('sources.allSources')}</span>
            </Button>

            {filteredSources.map((source) => (
              <Button
                key={source.id}
                type="button"
                variant="ghost"
                className={cn(
                  'h-auto min-w-[190px] justify-start px-3 py-2 text-left text-[13px] md:min-w-0',
                  selectedSource?.id === source.id
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
                onClick={() => selectSource(source)}
              >
                <ConnectorIcon
                  connectorId={source.type}
                  name={source.connectorName}
                  iconPath={source.connectorIcon}
                  size={16}
                  className="size-4 rounded-md border-0 bg-transparent"
                />
                <span className="truncate">{source.name}</span>
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
                  aria-hidden="true"
                />
              </Button>
            ))}
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
              <Button
                type="button"
                className="px-3 text-[13px] font-medium"
                onClick={() => void sourcesQuery.refetch()}
              >
                {t('state.error.retry')}
              </Button>
            </div>
          ) : selectedSource && !selectedTable ? (
            <>
              <div className="shrink-0 border-b border-gray-100/70 bg-white px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-50">
                      <ConnectorIcon
                        connectorId={selectedSource.type}
                        name={selectedSource.connectorName}
                        iconPath={selectedSource.connectorIcon}
                        size={24}
                        className="size-6 rounded-lg border-0 bg-transparent"
                      />
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
                      disabled={testingSourceId !== null}
                      onClick={() => void runSourceTest(selectedSource.raw)}
                    >
                      {testingSourceId === selectedSource.id && (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      )}
                      {t(
                        testingSourceId === selectedSource.id
                          ? 'sources.test.testing'
                          : 'sources.actions.test',
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={schemaRefreshingSourceId !== null}
                      onClick={() => void refreshSourceSchema(selectedSource.raw)}
                    >
                      <RefreshCw
                        className={cn(
                          'size-3.5',
                          schemaRefreshingSourceId === selectedSource.id && 'animate-spin',
                        )}
                      />
                      {t(
                        schemaRefreshingSourceId === selectedSource.id
                          ? 'sources.schema.refreshing'
                          : 'sources.actions.refreshSchema',
                      )}
                    </Button>
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
                    <Button
                      variant="outline"
                      type="button"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingSource(selectedSource)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t('sources.delete.confirm')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-gray-50/40 p-4 md:p-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-gray-900">
                    {t('sources.tablesIn', { name: selectedSource.name })}
                  </h3>
                  {sourceSchemaQuery.data && (
                    <span className="text-[12px] text-gray-500">
                      {t('sources.schema.discoveredAt', {
                        date: new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(sourceSchemaQuery.data.discoveredAt)),
                      })}
                    </span>
                  )}
                </div>

                {schemaRefreshError && (
                  <div
                    className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px]"
                    role="alert"
                  >
                    <span>{schemaRefreshError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void refreshSourceSchema(selectedSource.raw)}
                    >
                      {t('state.error.retry')}
                    </Button>
                  </div>
                )}

                {sourceSchemaQuery.isLoading ? (
                  <div
                    className="mb-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[13px] text-gray-500 shadow-sm"
                    role="status"
                  >
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    {t('sources.schema.loading')}
                  </div>
                ) : sourceSchemaQuery.error &&
                  sourceSchemaQuery.error instanceof SourceClientError &&
                  sourceSchemaQuery.error.status !== 404 ? (
                  <div
                    className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px]"
                    role="alert"
                  >
                    <span>{schemaErrorMessage(sourceSchemaQuery.error, t)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void sourceSchemaQuery.refetch()}
                    >
                      {t('state.error.retry')}
                    </Button>
                  </div>
                ) : sourceSchemaQuery.error instanceof SourceClientError &&
                  sourceSchemaQuery.error.status === 404 ? (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[13px] text-gray-500 shadow-sm">
                    <TableIcon className="size-4" aria-hidden="true" />
                    {t('sources.schema.notDiscovered')}
                  </div>
                ) : null}

                {visibleTables.length === 0 ? (
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
                    {visibleTables.map((table) => (
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
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto justify-start px-0 font-medium text-gray-500 hover:text-gray-900"
                    onClick={() => setSelectedTableId(null)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{selectedSource.name}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    className="cursor-not-allowed text-gray-300"
                    aria-label={t('common.expand')}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-5 overflow-x-auto text-[13px] font-medium">
                  {tabs.map((tab) => (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'relative top-px h-auto shrink-0 rounded-none px-0 pb-2.5',
                        activeTab === tab.value
                          ? 'border-gray-900 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700',
                      )}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      {t(tab.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row">
                <div className="min-w-0 flex-1 overflow-auto">
                  {activeTab === 'columns' ? (
                    <TableSchemaView
                      schemaTable={selectedSchemaTable}
                      loading={sourceSchemaQuery.isLoading}
                      unavailable={sourceSchemaQuery.error instanceof SourceClientError}
                    />
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          ) : (
            <AllSourcesView
              sources={sources}
              filteredSources={filteredSources}
              onCreate={() => setCreateOpen(true)}
              onSelect={selectSource}
              onTest={(source) => void runSourceTest(source.raw)}
              testingSourceId={testingSourceId}
            />
          )}
        </main>
      </div>

      <ConnectionTestResultDialog
        report={testReport}
        error={testError}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setTestReport(null)
            setTestError('')
          }
        }}
      />
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
      {deletingSource && (
        <SourceDeleteDialog
          open
          source={deletingSource.raw}
          etag={`"${deletingSource.raw.contentHash}"`}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDeletingSource(null)
          }}
          onDeleted={() => onDeleted(deletingSource)}
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

function TableSchemaView({
  schemaTable,
  loading,
  unavailable,
}: {
  schemaTable: SourceSchemaTable | null
  loading: boolean
  unavailable: boolean
}) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="page-state" role="status">
        <LoaderCircle className="h-7 w-7 animate-spin text-gray-300" aria-hidden="true" />
        <div className="page-state__title">{t('sources.schema.loading')}</div>
      </div>
    )
  }

  if (unavailable || !schemaTable) {
    return (
      <div className="page-state">
        <Columns className="h-8 w-8 text-gray-300" aria-hidden="true" />
        <div className="page-state__title">{t('sources.tableDetail.noSchema')}</div>
        <p className="page-state__body">{t('sources.tableDetail.noSchemaBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
        <span className="rounded-md bg-gray-50 px-2 py-1">
          {t('sources.schema.fieldsCount', { count: schemaTable.fields.length })}
        </span>
        <span className="rounded-md bg-gray-50 px-2 py-1">
          {t('sources.schema.primaryKey')}:{' '}
          {schemaTable.primaryKey.length > 0
            ? schemaTable.primaryKey.join(', ')
            : t('sources.schema.none')}
        </span>
        <span className="rounded-md bg-gray-50 px-2 py-1">
          {t('sources.schema.indexes')}: {schemaTable.indexes.length}
        </span>
      </div>

      {schemaTable.fields.length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-[13px] text-gray-500">
          {t('sources.schema.noFields')}
        </div>
      ) : (
        <DataTable headers={[t('sources.schema.fieldName'), t('sources.schema.fieldType')]}>
          {schemaTable.fields.map((field) => (
            <tr key={field.name}>
              <td className="px-4 py-3 font-medium text-gray-900">{field.name}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px] text-gray-600">
                {field.type ?? t('sources.schema.unknownType')}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {schemaTable.indexes.length > 0 && (
        <section className="rounded-lg border border-gray-200/70 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-gray-900">{t('sources.schema.indexes')}</h3>
          <ul className="mt-3 divide-y divide-gray-100/70 text-[13px]">
            {schemaTable.indexes.map((index) => (
              <li
                key={index.name}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-medium text-gray-700">{index.name}</span>
                <span className="shrink-0 text-gray-500">
                  {index.fields.join(', ')}
                  {index.unique ? ` · ${t('sources.schema.unique')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function AllSourcesView({
  sources,
  filteredSources,
  onCreate,
  onSelect,
  onTest,
  testingSourceId,
}: {
  sources: Source[]
  filteredSources: Source[]
  onCreate: () => void
  onSelect: (source: Source) => void
  onTest: (source: Source) => void
  testingSourceId: string | null
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
            <Button type="button" className="px-3 text-[13px] font-medium" onClick={onCreate}>
              {t('sources.actions.create')}
            </Button>
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
              filteredSources.map((source) => (
                <tr key={source.id} className="group transition-colors hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto justify-start px-0 text-left"
                      onClick={() => onSelect(source)}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200/70 bg-gray-50">
                        <ConnectorIcon
                          connectorId={source.type}
                          name={source.connectorName}
                          iconPath={source.connectorIcon}
                          size={16}
                          className="size-4 rounded-md border-0 bg-transparent"
                        />
                      </span>
                      <span className="font-medium text-gray-900">{source.name}</span>
                    </Button>
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-700"
                      type="button"
                      aria-label={`${t('sources.actions.test')} ${source.name}`}
                      title={t('sources.actions.test')}
                      disabled={testingSourceId !== null}
                      onClick={() => onTest(source)}
                    >
                      {testingSourceId === source.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Activity className="size-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </div>
    </div>
  )
}
