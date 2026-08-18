import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Database,
  LoaderCircle,
  Pencil,
  Server,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  getSource,
  SourceClientError,
  type SourceEnvelope,
  type SourceView,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { SourceDeleteDialog } from './source-delete-dialog'
import { SourceEditDialog } from './source-edit-dialog'

function endpoint(source: SourceView, fallback: string) {
  for (const key of [
    'host',
    'hostname',
    'server',
    'url',
    'uri',
    'connectionString',
    'bootstrapServers',
  ]) {
    const value = source.config[key]
    if (typeof value === 'string' && value) return value
  }
  return fallback
}

export function SourceDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams({ from: '/_authenticated/sources/$id' })
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const sourceQuery = useQuery({
    queryKey: ['source', id],
    queryFn: () => getSource(id, apiFetch),
  })
  const result = sourceQuery.data

  function onSaved(next: SourceEnvelope) {
    queryClient.setQueryData(['source', id], next)
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      (current ?? []).map((item) => (item.id === id ? next.source : item)),
    )
  }

  async function onDeleted() {
    queryClient.removeQueries({ queryKey: ['source', id] })
    queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
      (current ?? []).filter((item) => item.id !== id),
    )
    await navigate({ to: '/sources' })
  }

  if (sourceQuery.isLoading) {
    return (
      <div className="page-state">
        <LoaderCircle className="h-7 w-7 animate-spin text-gray-300" aria-hidden="true" />
        <div className="page-state__title">{t('sources.states.loading')}</div>
      </div>
    )
  }

  if (sourceQuery.error || !result) {
    const notFound =
      sourceQuery.error instanceof SourceClientError &&
      sourceQuery.error.code === 'source.not-found'
    return (
      <div className="page-state">
        <AlertCircle className="h-8 w-8 text-orange-400" aria-hidden="true" />
        <div className="page-state__title">
          {notFound ? t('sources.detail.notFoundTitle') : t('state.error.title')}
        </div>
        <p className="page-state__body">
          {notFound ? t('sources.detail.notFoundBody') : t('sources.states.error')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium"
            onClick={() => void navigate({ to: '/sources' })}
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white"
            onClick={() => void sourceQuery.refetch()}
          >
            {t('state.error.retry')}
          </button>
        </div>
      </div>
    )
  }

  const source = result.source
  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100/70 px-4 py-3 md:px-6">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900"
          onClick={() => void navigate({ to: '/sources' })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('sources.detail.back')}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> {t('sources.detail.edit')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[13px] font-medium text-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('sources.detail.delete')}
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto bg-gray-50/40 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                  <Database className="h-5 w-5 text-gray-500" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold text-gray-900">{source.id}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
                    <span>{source.connector}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-gray-400" />
                      {endpoint(source, t('sources.details.endpointUnavailable'))}
                    </span>
                    <span className="rounded-lg bg-gray-50 px-1.5 py-0.5 ring-1 ring-gray-600/15 ring-inset">
                      {t('sources.details.secretConfiguredCount', {
                        count: source.configuredSecrets.length,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] text-gray-500">
                <div>
                  <dt>{t('sources.details.mode')}</dt>
                  <dd className="font-medium text-gray-800">
                    {source.mode ?? t('sources.details.connectionOnly')}
                  </dd>
                </div>
                <div>
                  <dt>{t('sources.details.hash')}</dt>
                  <dd className="font-mono text-gray-700">{source.contentHash.slice(0, 12)}…</dd>
                </div>
              </dl>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
              <h2 className="text-[13px] font-semibold text-gray-900">
                {t('sources.details.configuration')}
              </h2>
              {Object.keys(source.config).length === 0 ? (
                <p className="mt-3 text-[12px] text-gray-500">
                  {t('sources.details.noConfiguration')}
                </p>
              ) : (
                <dl className="mt-3 divide-y divide-gray-100 text-[12px]">
                  {Object.entries(source.config).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 py-2">
                      <dt className="font-medium text-gray-500">{key}</dt>
                      <dd className="max-w-[65%] text-right font-mono break-words text-gray-800">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
            <section className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
              <h2 className="text-[13px] font-semibold text-gray-900">
                {t('sources.details.tableSelection')}
              </h2>
              {source.tables?.length ? (
                <ul className="mt-3 space-y-2">
                  {source.tables.map((table, index) => (
                    <li
                      key={`${table.type}-${index}`}
                      className="rounded-lg bg-gray-50 px-3 py-2 text-[12px]"
                    >
                      <span className="font-medium text-gray-700">{table.type}</span>
                      <span className="ml-2 font-mono text-gray-500">
                        {table.name ??
                          table.pattern ??
                          table.filter ??
                          t('sources.details.unnamedTable')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[12px] text-gray-500">{t('sources.details.noTables')}</p>
              )}
            </section>
          </div>

          <section
            className={cn(
              'rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm',
              source.srs && 'ring-1 ring-gray-900/5',
            )}
          >
            <h2 className="text-[13px] font-semibold text-gray-900">{t('sources.details.srs')}</h2>
            {source.srs ? (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-50 p-3 text-[12px] text-gray-700">
                {JSON.stringify(source.srs, null, 2)}
              </pre>
            ) : (
              <p className="mt-3 text-[12px] text-gray-500">{t('sources.details.noSrs')}</p>
            )}
          </section>
        </div>
      </main>

      <SourceEditDialog
        open={editOpen}
        source={source}
        etag={result.etag}
        onOpenChange={setEditOpen}
        onSaved={onSaved}
      />
      <SourceDeleteDialog
        open={deleteOpen}
        source={source}
        etag={result.etag}
        onOpenChange={setDeleteOpen}
        onDeleted={() => void onDeleted()}
      />
    </section>
  )
}
