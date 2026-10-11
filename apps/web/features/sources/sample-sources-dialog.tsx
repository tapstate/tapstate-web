import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  Database,
  LoaderCircle,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectorIcon } from '@/components/connector-icon'
import {
  getSampleInstallStatus,
  startSampleInstall,
  type SampleSourceSetting,
} from '@/service/sample-source-client'
import { SourceClientError } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

const STORAGE_KEY = 'tapstate.sample-installation'
function stageLabel(stage: string) {
  switch (stage) {
    case 'TESTING':
      return 'Testing the connection'
    case 'CREATING':
      return 'Creating the Source'
    case 'DISCOVERING':
      return 'Discovering tables and keys'
    case 'READY':
      return 'Ready to use'
    case 'FAILED':
      return 'Needs attention'
    default:
      return 'Waiting'
  }
}

export function SampleSourcesDialog({
  open,
  onOpenChange,
  samples,
  installedIds,
  onDemo,
  onBuild,
  onConnectOwn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  samples: SampleSourceSetting[]
  installedIds: string[]
  onDemo: (sourceId: string) => void
  onBuild: () => void
  onConnectOwn: () => void
}) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const available = samples.filter((sample) => sample.available !== false)
  const comingSoon = samples.filter((sample) => sample.available === false)
  const [selected, setSelected] = useState<string[]>(() => {
    const preferred = available.find(
      (sample) => sample.connector === 'mysql' && !installedIds.includes(sample.id),
    )
    return preferred ? [preferred.id] : []
  })
  const [jobId, setJobId] = useState(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY),
  )
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const statusQuery = useQuery({
    queryKey: ['sample-installation', jobId],
    enabled: Boolean(jobId),
    queryFn: () => getSampleInstallStatus(jobId!, apiFetch),
    refetchInterval: (query) => (query.state.error || query.state.data?.finished ? false : 1200),
    retry: false,
  })
  const statusError = statusQuery.error instanceof SourceClientError ? statusQuery.error : null
  const missingJob = statusError?.status === 400 || statusError?.status === 404
  const job = statusQuery.data
  const ready = job?.items.filter((item) => item.stage === 'READY') ?? []
  const failures = job?.items.filter((item) => item.stage === 'FAILED') ?? []
  const demoSources = available.filter(
    (sample) =>
      sample.guidedDemo !== false &&
      (installedIds.includes(sample.id) || ready.some((item) => item.id === sample.id)),
  )
  const [demoSourceId, setDemoSourceId] = useState('sample_core_banking')

  function chooseMore() {
    window.localStorage.removeItem(STORAGE_KEY)
    setJobId(null)
    setSelected([])
  }

  useEffect(() => {
    if (!job?.finished) return
    void queryClient.invalidateQueries({ queryKey: ['sources'] })
    void queryClient.invalidateQueries({ queryKey: ['source-schema'] })
  }, [job?.finished, queryClient])

  async function install(ids: string[]) {
    setStartError('')
    setStarting(true)
    try {
      const result = await startSampleInstall(ids, apiFetch)
      window.localStorage.setItem(STORAGE_KEY, result.id)
      queryClient.setQueryData(['sample-installation', result.id], result)
      setJobId(result.id)
    } catch (error) {
      setStartError(
        error instanceof SourceClientError && error.code
          ? `${error.message} (${error.code})`
          : 'Installation could not start. Check the cluster connection and try again.',
      )
    } finally {
      setStarting(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-dialog-title"
        className="flex max-h-[min(780px,calc(100vh-32px))] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl border border-[#DCE4F0] bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E5EAF2] px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[12px] font-medium text-indigo-600">
              Add databases · Sample sources
            </p>
            <h2
              id="sample-dialog-title"
              className="mt-1 text-[21px] font-semibold tracking-[-0.025em] text-slate-900"
            >
              {job ? 'Preparing your sample data' : 'Choose data to explore'}
            </h2>
            <p className="mt-1 max-w-[560px] text-[13px] leading-5 text-slate-500">
              {job
                ? 'These are live setup steps. You can close this window and return while setup continues.'
                : 'Each sample is its own database. Select any combination, or connect your own database instead.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close sample sources"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7">
          {job ? (
            <div className="space-y-3" aria-live="polite">
              <p className="text-[12px] font-medium text-slate-600">
                {ready.length} of {job.items.length} ready
                {!job.finished && ' · Setup continues in the background'}
              </p>
              {job.items.map((item) => {
                const sample = samples.find((entry) => entry.id === item.id)
                const active = !['QUEUED', 'READY', 'FAILED'].includes(item.stage)
                const currentStep =
                  item.stage === 'READY'
                    ? 3
                    : item.stage === 'DISCOVERING'
                      ? 2
                      : item.stage === 'CREATING'
                        ? 1
                        : 0
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                      {active ? (
                        <LoaderCircle className="size-4 animate-spin text-indigo-600" />
                      ) : item.stage === 'READY' ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : item.stage === 'FAILED' ? (
                        <AlertCircle className="size-4 text-red-600" />
                      ) : (
                        <Database className="size-4 text-slate-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-900">
                        {sample?.name ?? item.id}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">{stageLabel(item.stage)}</p>
                      <div className="mt-2 flex gap-1" aria-hidden="true">
                        {[1, 2, 3].map((step) => (
                          <span
                            key={step}
                            className={`h-1 flex-1 rounded-full ${
                              item.stage === 'FAILED'
                                ? 'bg-red-200'
                                : currentStep >= step
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      {item.errorCode && (
                        <div className="mt-2 text-[12px] text-red-700">
                          <p>
                            {item.errorDetail || 'Setup failed. Review the connection and retry.'}
                          </p>
                          <details className="mt-1 text-slate-500">
                            <summary className="cursor-pointer">Technical detail</summary>
                            <code className="mt-1 block break-all">{item.errorCode}</code>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {job.finished && failures.length > 0 && (
                <button
                  type="button"
                  onClick={() => void install(failures.map((item) => item.id))}
                  disabled={starting}
                  className="text-[13px] font-medium text-indigo-600 hover:underline"
                >
                  Retry failed samples
                </button>
              )}
              {job.finished && (
                <div className="mt-5 rounded-xl border border-indigo-200 bg-[#F5F7FF] p-4">
                  <p className="text-[14px] font-semibold text-slate-900">
                    What would you like to do next?
                  </p>
                  <p className="mt-1 text-[12px] text-slate-600">
                    Try a guided Order 360 demo, or build a Pipeline your way.
                  </p>
                  {demoSources.length > 1 && (
                    <label className="mt-3 block text-[12px] text-slate-700">
                      Demo database
                      <select
                        value={demoSourceId}
                        onChange={(event) => setDemoSourceId(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px]"
                      >
                        {demoSources.map((sample) => (
                          <option key={sample.id} value={sample.id}>
                            {sample.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {demoSources.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onDemo(
                            demoSources.some((sample) => sample.id === demoSourceId)
                              ? demoSourceId
                              : demoSources[0].id,
                          )
                        }
                        className="rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
                      >
                        Try Order 360 demo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onBuild}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Build my own Pipeline
                    </button>
                    {available.some(
                      (sample) =>
                        !installedIds.includes(sample.id) &&
                        !ready.some((item) => item.id === sample.id),
                    ) && (
                      <button
                        type="button"
                        onClick={chooseMore}
                        className="px-2 py-2 text-[13px] font-medium text-indigo-700 hover:underline"
                      >
                        Choose more samples
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {demoSources.length > 0 && (
                <div className="mb-5 rounded-xl border border-indigo-200 bg-[#F5F7FF] p-4">
                  <p className="text-[14px] font-semibold text-slate-900">
                    Your sample data is ready
                  </p>
                  <p className="mt-1 text-[12px] text-slate-600">
                    Try the guided Order 360 demo, or build your own Pipeline.
                  </p>
                  {demoSources.length > 1 && (
                    <label className="mt-3 block text-[12px] text-slate-700">
                      Demo database
                      <select
                        value={demoSourceId}
                        onChange={(event) => setDemoSourceId(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px]"
                      >
                        {demoSources.map((sample) => (
                          <option key={sample.id} value={sample.id}>
                            {sample.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onDemo(
                          demoSources.some((sample) => sample.id === demoSourceId)
                            ? demoSourceId
                            : demoSources[0].id,
                        )
                      }
                      className="rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
                    >
                      Try Order 360 demo
                    </button>
                    <button
                      type="button"
                      onClick={onBuild}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Build my own Pipeline
                    </button>
                  </div>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  {available.map((sample) => {
                    const installed = installedIds.includes(sample.id)
                    const checked = selected.includes(sample.id)
                    return (
                      <label
                        key={sample.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${checked ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-indigo-600"
                          disabled={installed}
                          checked={checked || installed}
                          onChange={() =>
                            setSelected((current) =>
                              checked
                                ? current.filter((id) => id !== sample.id)
                                : [...current, sample.id],
                            )
                          }
                        />
                        <ConnectorIcon
                          connectorId={sample.connector}
                          name={sample.name}
                          size={24}
                          className="size-8 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-900">
                            {sample.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">
                            {sample.description}
                          </span>
                          {installed && (
                            <span className="mt-1 block text-[11px] font-medium text-emerald-700">
                              Already installed
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <aside className="rounded-xl border border-[#DCE4F0] bg-[#F8FAFD] p-4">
                  <p className="text-[13px] font-semibold text-slate-900">The Order 360 document</p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-600">
                    A real order is the root. Its customer and line items become part of the same
                    document.
                  </p>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] leading-6 text-slate-700">
                    <div>
                      order <span className="text-slate-400">&#123; warehouse, district, id</span>
                    </div>
                    <div className="pl-4 text-indigo-700">
                      customer{' '}
                      <span className="text-slate-500">&#123; name, balance, ... &#125;</span>
                    </div>
                    <div className="pl-4 text-indigo-700">
                      lines[]{' '}
                      <span className="text-slate-500">&#123; item, quantity, amount &#125;</span>
                    </div>
                    <div className="text-slate-400">&#125;</div>
                  </div>
                  <p className="mt-3 text-[11px] leading-4 text-slate-500">
                    MySQL and PostgreSQL contain separate datasets. The demo uses one database at a
                    time.
                  </p>
                </aside>
              </div>
              {comingSoon.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-[12px] font-semibold text-slate-700">Coming soon</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    These samples are planned and cannot be selected yet.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {comingSoon.map((sample) => (
                      <span
                        key={sample.id}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-500"
                      >
                        {sample.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {startError && (
            <p role="alert" className="mt-3 text-[12px] text-red-700">
              {startError}
            </p>
          )}
          {statusQuery.isError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>
                {missingJob
                  ? 'This setup status is no longer available.'
                  : statusError?.status === 500
                    ? 'The cluster encountered an internal error while preparing samples. The setup may have stopped.'
                    : 'Could not check sample setup status. The cluster may still be working.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 font-medium">
                {missingJob ? (
                  <button type="button" className="underline" onClick={chooseMore}>
                    Choose samples again
                  </button>
                ) : (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void statusQuery.refetch()}
                  >
                    Retry status
                  </button>
                )}
              </div>
              <details className="mt-2 text-red-700">
                <summary className="cursor-pointer">Technical details</summary>
                <div className="mt-1 font-mono break-all">
                  <div>Job: {jobId}</div>
                  {statusError?.status != null && <div>HTTP {statusError.status}</div>}
                  {statusError?.code && <div>Code: {statusError.code}</div>}
                  {statusError?.message && <div>{statusError.message}</div>}
                </div>
              </details>
            </div>
          )}
        </div>
        {!job && (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF2] bg-slate-50/70 px-5 py-3.5 sm:px-7">
            <button
              type="button"
              onClick={onConnectOwn}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-indigo-700"
            >
              <ChevronLeft className="size-4" /> Connect my database
            </button>
            <button
              type="button"
              disabled={selected.length === 0 || starting}
              onClick={() => void install(selected)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {starting
                ? 'Starting…'
                : `Initialize ${selected.length} ${selected.length === 1 ? 'sample' : 'samples'}`}
              <ArrowRight className="size-4" />
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}
