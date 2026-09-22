import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Search,
  Server,
  Settings2,
  Table2,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { SourceSchemaReport, SourceView } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { Button } from '@/components/ui/button'
import {
  getSourceSchema,
  listConnectors,
  listSources,
  SourceClientError,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

const ATLAS_CONNECTOR_ID = 'mongodb-atlas'

interface DestinationTable {
  name: string
  fields: Array<{ name: string; type: string | null }>
  primaryKey: string[]
}

export function DestinationsPage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [query, setQuery] = useState('')
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null)
  const sourcesQuery = useQuery({
    queryKey: ['destinations'],
    queryFn: () => listSources(apiFetch),
  })
  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const atlas = useMemo(
    () =>
      (sourcesQuery.data ?? []).find((source) => source.connector === ATLAS_CONNECTOR_ID) ?? null,
    [sourcesQuery.data],
  )
  const connector = useMemo(
    () => (connectorsQuery.data ?? []).find((item) => item.id === ATLAS_CONNECTOR_ID),
    [connectorsQuery.data],
  )
  const schemaQuery = useQuery({
    queryKey: ['destination-schema', atlas?.id],
    enabled: atlas !== null,
    retry: false,
    queryFn: () => getSourceSchema(atlas!.id, apiFetch),
  })
  const tables = useMemo(
    () => destinationTables(atlas, schemaQuery.data, t),
    [atlas, schemaQuery.data, t],
  )
  const visibleTables = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tables
    return tables.filter((table) => table.name.toLowerCase().includes(needle))
  }, [query, tables])
  const selectedTable =
    tables.find((table) => table.name === selectedTableName) ?? visibleTables[0] ?? null

  useEffect(() => {
    if (!selectedTable || selectedTable.name !== selectedTableName) {
      setSelectedTableName(selectedTable?.name ?? null)
    }
  }, [selectedTable, selectedTableName])

  if (sourcesQuery.isPending || connectorsQuery.isPending) {
    return (
      <DestinationState
        icon={<LoaderCircle className="size-7 animate-spin" />}
        title={t('destinations.states.loading')}
      />
    )
  }

  if (sourcesQuery.isError || connectorsQuery.isError) {
    return (
      <DestinationState
        icon={<AlertCircle className="size-7" />}
        title={t('destinations.states.error')}
        body={t('destinations.states.errorBody')}
        action={
          <Button
            onClick={() => {
              void sourcesQuery.refetch()
              void connectorsQuery.refetch()
            }}
          >
            {t('state.error.retry')}
          </Button>
        }
      />
    )
  }

  if (!atlas) {
    return (
      <DestinationState
        icon={<Database className="size-7" />}
        title={t('destinations.empty.title')}
        body={t('destinations.empty.body')}
        action={
          <Link to="/sources" className="destination-page__primary-link">
            {t('destinations.configure')}
            <ExternalLink className="size-3.5" />
          </Link>
        }
      />
    )
  }

  const endpoint = sourceEndpoint(atlas, t('destinations.endpointUnavailable'))
  const schemaError = schemaQuery.error instanceof SourceClientError

  return (
    <section className="destination-page">
      <header className="destination-page__header">
        <div>
          <p className="destination-page__eyebrow">{t('destinations.eyebrow')}</p>
          <h1>{t('destinations.title')}</h1>
          <p>{t('destinations.subtitle')}</p>
        </div>
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: atlas.id }}
          className="destination-page__source-link"
        >
          <Settings2 className="size-3.5" />
          {t('destinations.manageAtlas')}
        </Link>
      </header>

      <div className="destination-page__content">
        <section className="destination-page__connection-card">
          <div className="destination-page__connection-identity">
            <span className="destination-page__atlas-mark">
              <ConnectorIcon
                connectorId={atlas.connector}
                name={connector?.name ?? t('destinations.atlas')}
                iconPath={connector?.icon}
                size={27}
                className="rounded-lg border-0 bg-transparent"
              />
            </span>
            <div className="min-w-0">
              <div className="destination-page__title-row">
                <h2>{t('destinations.atlas')}</h2>
                <span className="destination-page__ready-badge">
                  <CheckCircle2 className="size-3" />
                  {t('destinations.ready')}
                </span>
              </div>
              <p>{atlas.id}</p>
            </div>
          </div>
          <div className="destination-page__connection-actions">
            <Button
              variant="outline"
              type="button"
              disabled={schemaQuery.isFetching}
              onClick={() => void schemaQuery.refetch()}
            >
              <RefreshCw
                className={schemaQuery.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
              />
              {t('destinations.refresh')}
            </Button>
            <Link
              to="/sources/$sourceId"
              params={{ sourceId: atlas.id }}
              className="destination-page__edit-link"
            >
              {t('destinations.openSource')}
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
          <div className="destination-page__connection-meta">
            <MetaItem
              icon={<Server className="size-3.5" />}
              label={t('destinations.endpoint')}
              value={endpoint}
            />
            <MetaItem
              icon={<Database className="size-3.5" />}
              label={t('destinations.connector')}
              value={connector?.name ?? atlas.connector}
            />
            <MetaItem
              icon={<Table2 className="size-3.5" />}
              label={t('destinations.tables')}
              value={String(tables.length)}
            />
          </div>
        </section>

        <section className="destination-page__catalog">
          <div className="destination-page__catalog-heading">
            <div>
              <p className="destination-page__eyebrow">{t('destinations.catalogEyebrow')}</p>
              <h2>{t('destinations.tableTitle')}</h2>
            </div>
            <label className="destination-page__search">
              <Search className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t('destinations.search.label')}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('destinations.search.placeholder')}
              />
            </label>
          </div>

          {schemaError && (
            <div className="destination-page__schema-note" role="status">
              <AlertCircle className="size-4" />
              <span>{t('destinations.schemaUnavailable')}</span>
            </div>
          )}

          {visibleTables.length === 0 ? (
            <div className="destination-page__empty-table">
              <Table2 className="size-5" />
              <strong>{t('destinations.noTables')}</strong>
              <span>{t('destinations.noTablesBody')}</span>
            </div>
          ) : (
            <div className="destination-page__table-browser">
              <div className="destination-page__table-list">
                {visibleTables.map((table) => (
                  <button
                    key={table.name}
                    type="button"
                    className="destination-page__table-item"
                    data-active={table.name === selectedTable?.name}
                    onClick={() => setSelectedTableName(table.name)}
                  >
                    <Table2 className="size-3.5" />
                    <span>{table.name}</span>
                    <small>{table.fields.length || '—'}</small>
                  </button>
                ))}
              </div>
              <div className="destination-page__table-detail">
                {selectedTable ? (
                  <TableDetail table={selectedTable} />
                ) : (
                  <div className="destination-page__welcome">
                    <Table2 className="size-5" />
                    <span>{t('destinations.empty.selectTitle')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function destinationTables(
  source: SourceView | null,
  schema: SourceSchemaReport | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): DestinationTable[] {
  if (schema?.tables) return schema.tables
  return (source?.tables ?? []).map((table) => ({
    name: table.name ?? table.pattern ?? table.filter ?? t('destinations.unnamedTable'),
    fields: [],
    primaryKey: table.pk ?? [],
  }))
}

function sourceEndpoint(source: SourceView, fallback: string) {
  const value = Object.entries(source.config).find(
    ([key, item]) => /host|url|uri|server/i.test(key) && typeof item === 'string',
  )?.[1]
  return typeof value === 'string' ? value : fallback
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="destination-page__meta-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong title={value}>{value}</strong>
      </div>
    </div>
  )
}

function TableDetail({ table }: { table: DestinationTable }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="destination-page__table-detail-heading">
        <div>
          <p className="destination-page__eyebrow">{t('destinations.selectedTable')}</p>
          <h3>{table.name}</h3>
        </div>
        <span className="destination-page__field-count">
          {table.fields.length
            ? t('destinations.fields', { count: table.fields.length })
            : t('destinations.fieldsUnknown')}
        </span>
      </div>
      {table.fields.length > 0 ? (
        <div className="destination-page__field-list">
          {table.fields.map((field) => (
            <div key={field.name} className="destination-page__field-row">
              <span>{field.name}</span>
              <code>{field.type ?? 'unknown'}</code>
            </div>
          ))}
        </div>
      ) : (
        <div className="destination-page__schema-empty">
          <Table2 className="size-4" />
          <span>{t('destinations.schemaEmpty')}</span>
        </div>
      )}
    </>
  )
}

function DestinationState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <section className="destination-page destination-page--state">
      <div className="destination-page__state">
        <span>{icon}</span>
        <h1>{title}</h1>
        {body && <p>{body}</p>}
        {action}
      </div>
    </section>
  )
}
