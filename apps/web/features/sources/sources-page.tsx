import type { ComponentType, SVGProps } from 'react'

import {
  AlertDialog as SourceAlertDialog,
  AlertDialogBody as SourceAlertDialogBody,
  AlertDialogCancelButton as SourceAlertDialogCancelButton,
  AlertDialogConfirmButton as SourceAlertDialogConfirmButton,
  AlertDialogContent as SourceAlertDialogContent,
  AlertDialogDescription as SourceAlertDialogDescription,
  AlertDialogFooter as SourceAlertDialogFooter,
  AlertDialogHeader as SourceAlertDialogHeader,
  AlertDialogTitle as SourceAlertDialogTitle,
} from '@langgenius/dify-ui/alert-dialog'
import { Button as SourceButton } from '@langgenius/dify-ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { FirstEmptyActionCard } from '@langgenius/dify-ui/first-empty-action-card'
import { LoadingPlaceholder } from '@langgenius/dify-ui/loading-placeholder'
import { SearchInput } from '@langgenius/dify-ui/search-input'
import { StatusDot } from '@langgenius/dify-ui/status-dot'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useOptionalToast } from '@tapstate-web/ui'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Columns,
  Database,
  FileText,
  GitMerge,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Table as TableIcon,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { ResourceListHeader } from '@/components/resource-list-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RouteTabs } from '@/components/ui/route-tabs'
import { cn } from '@/lib/utils'
import {
  isSampleSource,
  loadSampleSources,
  removeSampleSources,
} from '@/service/sample-source-client'
import {
  discoverSourceSchema,
  getConnectionTestResult,
  getSource,
  getSourceSchema,
  listConnectors,
  listSources,
  SourceClientError,
  testConnection,
  type ConnectionTestReport,
} from '@/service/source-client'
import { isDataSource } from '@/service/state-store-source'
import { useAuthStore } from '@/stores/auth-store'
import { useSourceFeedbackStore } from '@/stores/source-feedback-store'

import { ConnectionTestResultDialog } from './connection-test-result'
import { SampleSourcesDialog } from './sample-sources-dialog'
import { SourceCreateDialog } from './source-create-dialog'
import { SourceDeleteDialog } from './source-delete-dialog'
import { SourceEditDialog } from './source-edit-dialog'

export type SourceTab = 'data' | 'columns' | 'settings' | 'lineage' | 'log'

export interface SourcesPageRoute {
  sourceId?: string
  tableName?: string
  tab?: SourceTab
}

interface SourcesPageProps {
  route?: SourcesPageRoute
  onNavigate?: (route: SourcesPageRoute) => void
  /** Opens the new-source form when the page first shows. */
  createOnArrival?: boolean
  /** Called once the arrival form has closed, so the caller can drop the request from the URL. */
  onArrivalCreateClosed?: () => void
}

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

function schemaErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (error instanceof SourceClientError && error.status === 404)
    return t('sources.schema.notDiscovered')
  if (error instanceof SourceClientError && error.kind === 'network')
    return t('sources.schema.networkError')
  if (error instanceof SourceClientError && error.kind === 'protocol')
    return t('sources.schema.protocolError')
  return t('sources.schema.loadError')
}

export function SourcesPage({
  route,
  onNavigate,
  createOnArrival = false,
  onArrivalCreateClosed,
}: SourcesPageProps = {}) {
  const { t } = useTranslation()
  const toast = useOptionalToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [searchText, setSearchText] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [activeTabState, setActiveTabState] = useState<SourceTab>('data')
  const [createOpen, setCreateOpen] = useState(createOnArrival)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [deletingSource, setDeletingSource] = useState<Source | null>(null)
  const successMessage = useSourceFeedbackStore((state) => state.successMessage)
  const setSuccessMessage = useSourceFeedbackStore((state) => state.setSuccessMessage)
  const takeSuccessMessage = useSourceFeedbackStore((state) => state.takeSuccessMessage)
  const [removingSamples, setRemovingSamples] = useState(false)
  const [sampleRemoveConfirmOpen, setSampleRemoveConfirmOpen] = useState(false)
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)
  // Same key as Overview; a deployment without sample settings leaves this null.
  const samplesQuery = useQuery({
    queryKey: ['sample-sources'],
    queryFn: () => loadSampleSources(apiFetch),
    staleTime: Infinity,
  })
  const [sampleRemoveError, setSampleRemoveError] = useState('')
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null)
  const [testReport, setTestReport] = useState<ConnectionTestReport | null>(null)
  const [testError, setTestError] = useState<unknown>(null)
  const [schemaRefreshingSourceId, setSchemaRefreshingSourceId] = useState<string | null>(null)
  const [schemaRefreshError, setSchemaRefreshError] = useState('')
  const autoDiscoveryAttempted = useRef(new Set<string>())

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
  const sources = (sourcesQuery.data ?? [])
    .filter(isDataSource)
    .map((source) => toSource(source, connectorsById.get(source.connector)))
  const sourceSearchQuery = searchText.trim().toLowerCase()
  const filteredSources = sourceSearchQuery
    ? sources.filter(
        (source) =>
          source.name.toLowerCase().includes(sourceSearchQuery) ||
          source.type.toLowerCase().includes(sourceSearchQuery) ||
          source.host.toLowerCase().includes(sourceSearchQuery),
      )
    : sources

  const selectedSource = route
    ? (sources.find((source) => source.id === route.sourceId) ?? null)
    : (sources.find((source) => source.id === selectedSourceId) ?? null)
  const sourceSchemaQuery = useQuery({
    queryKey: ['source-schema', selectedSource?.id],
    enabled: selectedSource !== null,
    retry: false,
    queryFn: () => getSourceSchema(selectedSource!.id, apiFetch),
  })
  const selectedSchemaDiscovering = schemaRefreshingSourceId === selectedSource?.id
  const discoveredTables = (sourceSchemaQuery.data?.tables ?? []).map(toSchemaTable)
  const visibleTables = sourceSchemaQuery.data ? discoveredTables : (selectedSource?.tables ?? [])
  const selectedConfiguredTable = selectedSource?.tables.find(
    (table) => table.id === selectedTableId,
  )
  const routeTable = route?.tableName
    ? (visibleTables.find((table) => table.name === route.tableName) ?? null)
    : null
  const selectedTable = route
    ? routeTable
    : (visibleTables.find((table) => table.id === selectedTableId) ??
      visibleTables.find((table) => table.name === selectedConfiguredTable?.name) ??
      null)
  const selectedSchemaTable = selectedTable
    ? (sourceSchemaQuery.data?.tables.find((table) => table.name === selectedTable.name) ?? null)
    : null
  const activeTab = route ? (route.tab ?? (route.tableName ? 'columns' : 'data')) : activeTabState
  const activeTabLabel = t(
    tabs.find((tab) => tab.value === activeTab)?.labelKey ?? 'sources.tabs.data',
  )

  function selectSource(source: Source | null) {
    if (onNavigate) {
      onNavigate(source ? { sourceId: source.id } : {})
      return
    }
    setSelectedSourceId(source?.id ?? null)
    setSelectedTableId(null)
    setActiveTabState('data')
  }

  function selectTable(table: SourceTable) {
    if (onNavigate && selectedSource) {
      onNavigate({ sourceId: selectedSource.id, tableName: table.name, tab: 'columns' })
      return
    }
    setSelectedTableId(table.id)
    setActiveTabState('columns')
  }

  function selectTab(tab: SourceTab) {
    if (onNavigate && selectedSource && selectedTable) {
      onNavigate({ sourceId: selectedSource.id, tableName: selectedTable.name, tab })
      return
    }
    setActiveTabState(tab)
  }

  async function runSourceTest(source: SourceView) {
    setTestReport(null)
    setTestError(null)
    setTestingSourceId(source.id)
    try {
      const report = await testConnection(
        { id: source.id, connectorId: source.connector, settings: source.config },
        apiFetch,
      )
      setTestReport(report)
      queryClient.setQueryData(['source-test-result', source.id], report)
    } catch (error) {
      setTestError(error)
    } finally {
      setTestingSourceId(null)
    }
  }

  async function refreshSourceSchema(
    source: SourceView,
    { announceSuccess = true }: { announceSuccess?: boolean } = {},
  ) {
    setSchemaRefreshError('')
    setSchemaRefreshingSourceId(source.id)
    try {
      const report = await discoverSourceSchema(
        { id: source.id, connectorId: source.connector, settings: source.config },
        apiFetch,
      )
      queryClient.setQueryData<SourceSchemaReport>(['source-schema', source.id], report)
      if (announceSuccess) {
        setSuccessMessage(t('sources.schema.refreshSuccess', { id: source.id }))
      }
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
    setSuccessMessage(t('sources.create.success', { id: created.id }))
    if (onNavigate) {
      onNavigate({ sourceId: created.id })
    } else {
      setSelectedSourceId(created.id)
      setSelectedTableId(null)
    }
    autoDiscoveryAttempted.current.add(created.id)
    void refreshSourceSchema(created, { announceSuccess: false })
  }

  function onEdited(result: SourceEnvelope) {
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      [...(current ?? []).filter((item) => item.id !== result.source.id), result.source].sort(
        (left, right) => left.id.localeCompare(right.id),
      ),
    )
    queryClient.setQueryData<SourceEnvelope>(['source', result.source.id], result)
    queryClient.removeQueries({ queryKey: ['source-schema', result.source.id] })
    queryClient.removeQueries({ queryKey: ['source-test-result', result.source.id] })
    setSuccessMessage(t('sources.edit.success', { id: result.source.id }))
    autoDiscoveryAttempted.current.add(result.source.id)
    void refreshSourceSchema(result.source, { announceSuccess: false })
    if (onNavigate) {
      onNavigate({ sourceId: result.source.id })
    } else {
      setSelectedSourceId(result.source.id)
      setSelectedTableId(null)
    }
    setEditingSourceId(null)
  }

  const samplesAvailable = (samplesQuery.data ?? []).some((sample) => sample.available !== false)

  async function removeSamples() {
    setRemovingSamples(true)
    setSampleRemoveError('')
    try {
      const result = await removeSampleSources(sourcesQuery.data ?? [], apiFetch)
      queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
        (current ?? []).filter((item) => !result.removed.includes(item.id)),
      )
      if (selectedSource && result.removed.includes(selectedSource.id)) selectSource(null)
      if (result.refused) {
        setSampleRemoveError(
          t('sources.samples.inUse', {
            id: result.refused.sourceId,
            pipelines: result.refused.referrers.join(', '),
          }),
        )
        return
      } else {
        setSuccessMessage(t('sources.samples.removed', { count: result.removed.length }))
      }
      setSampleRemoveConfirmOpen(false)
    } catch {
      setSampleRemoveError(t('sources.samples.error'))
    } finally {
      setRemovingSamples(false)
    }
  }

  function onDeleted(source: Source) {
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      (current ?? []).filter((item) => item.id !== source.id),
    )
    queryClient.removeQueries({ queryKey: ['source', source.id] })
    queryClient.removeQueries({ queryKey: ['source-schema', source.id] })
    queryClient.removeQueries({ queryKey: ['source-test-result', source.id] })
    setDeletingSource(null)
    if (selectedSource?.id === source.id) selectSource(null)
    setSuccessMessage(t('sources.delete.success', { id: source.id }))
  }

  useEffect(() => {
    if (!successMessage || !toast || !takeSuccessMessage(successMessage)) return
    toast.show({ tone: 'success', title: successMessage, duration: 4000 })
  }, [successMessage, takeSuccessMessage, toast])

  useEffect(() => {
    if (!selectedSource || !(sourceSchemaQuery.error instanceof SourceClientError)) return
    if (sourceSchemaQuery.error.status !== 404) return
    if (autoDiscoveryAttempted.current.has(selectedSource.id)) return
    autoDiscoveryAttempted.current.add(selectedSource.id)
    void refreshSourceSchema(selectedSource.raw, { announceSuccess: false })
  }, [selectedSource, sourceSchemaQuery.error])

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
      <ResourceListHeader title={t('sources.title')}>
        {samplesAvailable && (
          <Button type="button" variant="ghost" onClick={() => setSampleDialogOpen(true)}>
            {t('overview.addSources.sample.action')}
          </Button>
        )}
        {(sourcesQuery.data ?? []).some(isSampleSource) && (
          <Button
            type="button"
            variant="ghost"
            disabled={removingSamples}
            onClick={() => {
              setSampleRemoveError('')
              setSampleRemoveConfirmOpen(true)
            }}
          >
            {removingSamples ? t('sources.samples.removing') : t('sources.samples.remove')}
          </Button>
        )}
        {selectedSource && (
          <Button type="button" variant="ghost" onClick={() => selectSource(null)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('sources.allSources')}
          </Button>
        )}
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" aria-hidden="true" />
          {t('sources.actions.create')}
        </Button>
      </ResourceListHeader>
      {sampleRemoveError && (
        <div
          className="text-destructive flex items-start justify-between gap-3 border-b border-gray-100/70 px-4 py-2 text-[13px] md:px-6"
          role="alert"
        >
          <p>{sampleRemoveError}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSampleRemoveError('')}>
            {t('sources.samples.dismiss')}
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="bg-components-card-bg border-divider-subtle flex w-full shrink-0 flex-col border-b md:w-64 md:border-r md:border-b-0">
          <div className="border-divider-subtle border-b p-3">
            <SearchInput
              className="w-full"
              value={searchText}
              onValueChange={setSearchText}
              aria-label={t('sources.search.label')}
              clearLabel={t('sources.search.clear')}
              placeholder={t('sources.search.placeholder')}
            />
          </div>
          <nav
            aria-label={t('sources.allSources')}
            className="flex min-h-[150px] flex-1 gap-1 overflow-auto p-2 md:flex-col"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={selectedSource === null}
              className={cn(
                'h-auto min-h-8 min-w-[160px] shrink-0 justify-start px-3 py-2 text-left md:min-w-0',
                selectedSource === null
                  ? 'bg-background-default-hover text-text-primary font-medium'
                  : 'text-text-secondary',
              )}
              onClick={() => selectSource(null)}
            >
              <Database className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('sources.allSources')}</span>
            </Button>
            {filteredSources.map((source) => (
              <Button
                key={source.id}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={selectedSource?.id === source.id}
                className={cn(
                  'h-auto min-h-8 min-w-[190px] shrink-0 justify-start px-3 py-2 text-left md:min-w-0',
                  selectedSource?.id === source.id
                    ? 'bg-background-default-hover text-text-primary font-medium'
                    : 'text-text-secondary',
                )}
                onClick={() => selectSource(source)}
              >
                <ConnectorIcon
                  connectorId={source.type}
                  name={source.connectorName}
                  iconPath={source.connectorIcon}
                  size={16}
                  className="size-4 shrink-0 rounded-md border-0 bg-transparent"
                />
                <span className="min-w-0 flex-1 truncate">{source.name}</span>
                {isSampleSource(source.raw) && (
                  <Badge variant="dimm" uppercase={false}>
                    {t('sources.samples.tag')}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {sourcesQuery.isLoading ? (
            <LoadingPlaceholder className="h-full" label={t('sources.states.loading')} />
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
              <div className="border-divider-subtle shrink-0 border-b bg-white px-4 py-4 md:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-background-default-subtle border-divider-subtle flex size-10 shrink-0 items-center justify-center rounded-xl border">
                      <ConnectorIcon
                        connectorId={selectedSource.type}
                        name={selectedSource.connectorName}
                        iconPath={selectedSource.connectorIcon}
                        size={24}
                        className="size-6 rounded-lg border-0 bg-transparent"
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-text-primary truncate text-base font-semibold">
                        {selectedSource.name}
                      </h2>
                      <div className="system-xs-regular text-text-tertiary mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Server className="size-3.5" aria-hidden="true" />
                          {selectedSource.host}
                        </span>
                        <span>{selectedSource.type}</span>
                        <span className="inline-flex items-center gap-1.5">
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
                      variant="secondary"
                      type="button"
                      disabled={editLoading}
                      onClick={() => setEditingSourceId(selectedSource.id)}
                    >
                      {editLoading && <LoaderCircle className="size-3.5 animate-spin" />}
                      {t('sources.detail.edit')}
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        render={
                          <SourceButton variant="tertiary" type="button">
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                            {t('common.more')}
                          </SourceButton>
                        }
                      />
                      <DropdownMenuContent placement="bottom-end" sideOffset={4}>
                        <DropdownMenuItem
                          disabled={testingSourceId !== null}
                          onClick={() => void runSourceTest(selectedSource.raw)}
                        >
                          {testingSourceId === selectedSource.id ? (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Activity className="size-4" aria-hidden="true" />
                          )}
                          {t(
                            testingSourceId === selectedSource.id
                              ? 'sources.test.testing'
                              : 'sources.actions.test',
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={schemaRefreshingSourceId !== null}
                          onClick={() => void refreshSourceSchema(selectedSource.raw)}
                        >
                          <RefreshCw
                            className={cn(
                              'size-4',
                              schemaRefreshingSourceId === selectedSource.id && 'animate-spin',
                            )}
                            aria-hidden="true"
                          />
                          {t(
                            schemaRefreshingSourceId === selectedSource.id
                              ? 'sources.schema.refreshing'
                              : 'sources.actions.refreshSchema',
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingSource(selectedSource)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          {t('sources.delete.confirm')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

                {sourceSchemaQuery.isLoading ||
                (selectedSchemaDiscovering && !sourceSchemaQuery.data) ? (
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

                {!sourceSchemaQuery.data &&
                (sourceSchemaQuery.isLoading ||
                  selectedSchemaDiscovering) ? null : visibleTables.length === 0 &&
                  sourceSchemaQuery.data ? (
                  <div className="page-state rounded-lg border border-gray-200/70 bg-white">
                    <TableIcon className="h-8 w-8 text-gray-300" aria-hidden="true" />
                    <div className="page-state__title">{t('sources.noTablesTitle')}</div>
                    <p className="page-state__body">{t('sources.details.noTables')}</p>
                  </div>
                ) : visibleTables.length > 0 ? (
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
                ) : null}
              </div>
            </>
          ) : selectedSource && selectedTable ? (
            <div className="flex h-full min-h-0 flex-col">
              <SourceTableDetailHeader
                sourceName={selectedSource.name}
                tableName={selectedTable.name}
                activeTab={activeTab}
                onBack={() => {
                  if (onNavigate) {
                    onNavigate({ sourceId: selectedSource.id })
                  } else {
                    setSelectedTableId(null)
                  }
                }}
                onSelectTab={selectTab}
              />
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
              onSample={() => setSampleDialogOpen(true)}
              samplesAvailable={samplesAvailable}
              onSelect={selectSource}
              onTest={(source) => void runSourceTest(source.raw)}
              testingSourceId={testingSourceId}
              autoDiscoveryAttempted={autoDiscoveryAttempted.current}
            />
          )}
        </main>
      </div>

      <SourceAlertDialog
        open={sampleRemoveConfirmOpen}
        onOpenChange={(nextOpen) => {
          if (!removingSamples) setSampleRemoveConfirmOpen(nextOpen)
        }}
      >
        <SourceAlertDialogContent>
          <SourceAlertDialogHeader>
            <SourceAlertDialogTitle>
              {t('sources.samples.removeConfirmTitle')}
            </SourceAlertDialogTitle>
            <SourceAlertDialogDescription>
              {t('sources.samples.removeConfirmBody')}
            </SourceAlertDialogDescription>
          </SourceAlertDialogHeader>
          {sampleRemoveError && (
            <SourceAlertDialogBody>
              <p className="system-sm-regular text-text-destructive" role="alert">
                {sampleRemoveError}
              </p>
            </SourceAlertDialogBody>
          )}
          <SourceAlertDialogFooter>
            <SourceAlertDialogCancelButton variant="secondary" disabled={removingSamples}>
              {t('sources.delete.cancel')}
            </SourceAlertDialogCancelButton>
            <SourceAlertDialogConfirmButton
              disabled={removingSamples}
              onClick={() => void removeSamples()}
            >
              {removingSamples ? t('sources.samples.removing') : t('sources.samples.remove')}
            </SourceAlertDialogConfirmButton>
          </SourceAlertDialogFooter>
        </SourceAlertDialogContent>
      </SourceAlertDialog>
      <ConnectionTestResultDialog
        report={testReport}
        error={testError}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setTestReport(null)
            setTestError(null)
          }
        }}
      />
      <SampleSourcesDialog
        open={sampleDialogOpen}
        onOpenChange={setSampleDialogOpen}
        samples={samplesQuery.data ?? []}
        installedIds={(sourcesQuery.data ?? []).filter(isSampleSource).map((source) => source.id)}
        onDemo={(sourceId) => {
          window.sessionStorage.setItem('tapstate.sample.next-demo', sourceId)
          void navigate({ to: '/overview' })
        }}
        onBuild={() => {
          window.sessionStorage.setItem('tapstate.sample.next-build', 'true')
          void navigate({ to: '/overview' })
        }}
        onConnectOwn={() => {
          setSampleDialogOpen(false)
          setCreateOpen(true)
        }}
      />
      <SourceCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) onArrivalCreateClosed?.()
        }}
        onCreated={onCreated}
      />
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

function SourceTableDetailHeader({
  sourceName,
  tableName,
  activeTab,
  onBack,
  onSelectTab,
}: {
  sourceName: string
  tableName: string
  activeTab: SourceTab
  onBack: () => void
  onSelectTab: (tab: SourceTab) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="shrink-0 border-b border-gray-100/70 bg-white px-4 pt-4 md:px-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label={t('sources.title')}>
        <Button
          type="button"
          variant="ghost"
          className="h-8 max-w-[45%] min-w-0 justify-start rounded-md px-2 font-medium text-gray-500 hover:text-gray-900"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{sourceName}</span>
        </Button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
        <span className="min-w-0 truncate font-semibold text-gray-900" title={tableName}>
          {tableName}
        </span>
      </nav>
      <RouteTabs
        aria-label={t('sources.tabs.label')}
        className="mt-3"
        items={tabs.map((tab) => ({ value: tab.value, label: t(tab.labelKey) }))}
        value={activeTab}
        onValueChange={onSelectTab}
      />
    </div>
  )
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-175 border-collapse border-0 text-left text-sm">
        <thead className="border-divider-subtle text-text-tertiary h-8 border-b text-xs/8 font-medium uppercase">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className={cn(
                  'px-4 font-[weight:inherit] whitespace-nowrap',
                  index === headers.length - 1 && 'text-right',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-text-secondary">{children}</tbody>
      </table>
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
  onSample,
  samplesAvailable,
  onSelect,
  onTest,
  testingSourceId,
  autoDiscoveryAttempted,
}: {
  sources: Source[]
  filteredSources: Source[]
  onCreate: () => void
  onSample: () => void
  samplesAvailable: boolean
  onSelect: (source: Source) => void
  onTest: (source: Source) => void
  testingSourceId: string | null
  autoDiscoveryAttempted: Set<string>
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-auto px-4 pt-2 pb-6 md:px-8">
        {sources.length === 0 ? (
          <div className="relative min-h-130 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-x-0 inset-y-2 grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] grid-rows-4 gap-3"
              aria-hidden="true"
            >
              {Array.from({ length: 16 }, (_, index) => (
                <div key={index} className="bg-background-default-lighter rounded-xl opacity-75" />
              ))}
            </div>
            <div className="from-background-body/0 to-background-body pointer-events-none absolute inset-0 bg-linear-to-b" />
            <section
              className="absolute inset-0 flex items-center justify-center overflow-hidden p-2"
              aria-labelledby="sources-first-empty-title"
            >
              <div className="flex w-full max-w-130 flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="border-divider-regular bg-components-card-bg flex size-14 items-center justify-center overflow-hidden rounded-xl border border-dashed p-1 backdrop-blur-md">
                    <Database className="text-text-tertiary size-6" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <h2
                      id="sources-first-empty-title"
                      className="system-sm-medium text-text-primary"
                    >
                      {t('sources.empty.title')}
                    </h2>
                    <p className="system-sm-regular text-text-tertiary mt-1">
                      {t('sources.empty.body')}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 pb-8">
                  <FirstEmptyActionCard
                    title={t('sources.actions.create')}
                    description={t('sources.empty.body')}
                    icon={<Plus className="size-4" aria-hidden="true" />}
                    onClick={onCreate}
                  />
                  {samplesAvailable && (
                    <FirstEmptyActionCard
                      title={t('overview.addSources.sample.action')}
                      description={t('sources.empty.sampleDescription')}
                      icon={<Database className="size-4" aria-hidden="true" />}
                      onClick={onSample}
                    />
                  )}
                </div>
              </div>
            </section>
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
                <SourceListRow
                  key={source.id}
                  source={source}
                  onSelect={onSelect}
                  onTest={onTest}
                  testingSourceId={testingSourceId}
                  autoDiscoveryAttempted={autoDiscoveryAttempted}
                />
              ))
            )}
          </DataTable>
        )}
      </div>
    </div>
  )
}

function SourceListRow({
  source,
  onSelect,
  onTest,
  testingSourceId,
  autoDiscoveryAttempted,
}: {
  source: Source
  onSelect: (source: Source) => void
  onTest: (source: Source) => void
  testingSourceId: string | null
  autoDiscoveryAttempted: Set<string>
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const [discovering, setDiscovering] = useState(false)
  const [discoveryFailed, setDiscoveryFailed] = useState(false)
  const schemaQuery = useQuery({
    queryKey: ['source-schema', source.id],
    queryFn: () => getSourceSchema(source.id, apiFetch),
    retry: false,
  })
  const testQuery = useQuery({
    queryKey: ['source-test-result', source.id],
    queryFn: () => getConnectionTestResult(source.id, apiFetch),
    retry: false,
  })

  useEffect(() => {
    if (!(schemaQuery.error instanceof SourceClientError) || schemaQuery.error.status !== 404)
      return
    if (autoDiscoveryAttempted.has(source.id)) return
    autoDiscoveryAttempted.add(source.id)
    setDiscovering(true)
    void discoverSourceSchema(
      { id: source.id, connectorId: source.type, settings: source.raw.config },
      apiFetch,
    )
      .then(
        (report) => queryClient.setQueryData(['source-schema', source.id], report),
        () => setDiscoveryFailed(true),
      )
      .finally(() => setDiscovering(false))
  }, [
    apiFetch,
    autoDiscoveryAttempted,
    queryClient,
    schemaQuery.error,
    source.id,
    source.raw.config,
    source.type,
  ])

  const testing = testingSourceId === source.id || testQuery.isPending
  const testStatus = testing
    ? t('sources.test.testing')
    : testQuery.data?.outcome === 'PASSED'
      ? t('sources.test.status.passed')
      : testQuery.data?.outcome === 'FAILED'
        ? t('sources.test.status.failed')
        : testQuery.error instanceof SourceClientError && testQuery.error.status === 404
          ? t('sources.test.notTested')
          : t('sources.test.statusUnavailable')
  const tableStatus = schemaQuery.data
    ? t('sources.tablesCount', { count: schemaQuery.data.tables.length })
    : discovering || schemaQuery.isPending
      ? t('sources.schema.loading')
      : discoveryFailed
        ? t('sources.schema.discoveryFailed')
        : schemaQuery.error instanceof SourceClientError && schemaQuery.error.status === 404
          ? t('sources.schema.notDiscovered')
          : t('sources.schema.loadError')

  async function retryDiscovery() {
    setDiscoveryFailed(false)
    setDiscovering(true)
    try {
      const report = await discoverSourceSchema(
        { id: source.id, connectorId: source.type, settings: source.raw.config },
        apiFetch,
      )
      queryClient.setQueryData(['source-schema', source.id], report)
    } catch {
      setDiscoveryFailed(true)
    } finally {
      setDiscovering(false)
    }
  }

  return (
    <tr className="group border-divider-subtle hover:bg-background-default-hover h-8 border-b transition-colors">
      <td className="px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start px-0 text-left"
          onClick={() => onSelect(source)}
        >
          <span className="bg-background-default-subtle flex size-6 items-center justify-center rounded-lg">
            <ConnectorIcon
              connectorId={source.type}
              name={source.connectorName}
              iconPath={source.connectorIcon}
              size={16}
              className="size-4 rounded-md border-0 bg-transparent"
            />
          </span>
          <span className="text-text-primary font-medium">{source.name}</span>
          {isSampleSource(source.raw) && (
            <Badge variant="dimm" uppercase={false}>
              {t('sources.samples.tag')}
            </Badge>
          )}
        </Button>
      </td>
      <td className="text-text-secondary px-4 py-3">{source.type}</td>
      <td className="px-4 py-3">
        <span className="text-text-secondary inline-flex items-center gap-2">
          <StatusDot
            className="size-1 rounded-full"
            status={
              testQuery.data?.outcome === 'PASSED'
                ? 'success'
                : testQuery.data?.outcome === 'FAILED'
                  ? 'error'
                  : testing
                    ? 'normal'
                    : 'disabled'
            }
          />
          {testStatus}
        </span>
      </td>
      <td className="text-text-tertiary px-4 py-3">{source.host}</td>
      <td className="text-text-secondary px-4 py-3">
        {tableStatus}
        {discoveryFailed && (
          <button
            type="button"
            className="text-text-accent ml-2 hover:underline"
            onClick={() => void retryDiscovery()}
          >
            {t('state.error.retry')}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-text-tertiary opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
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
  )
}
