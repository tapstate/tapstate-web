import { ArrowRight, Plus, Sparkles, X } from 'lucide-react'

import type { ConnectorSummary } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'

import type { OverviewSourceItem } from '../overview-model'

interface AddSourcesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: OverviewSourceItem[]
  connectors?: ConnectorSummary[]
  onConnect: (connectorId: string | null) => void
  sample?: SampleOffer | null
}

export interface SampleOffer {
  names: string[]
  added: boolean
  adding: boolean
  error: string | null
  onAdd: () => void
}

/** The prototype source step with live connector icons and server-owned samples. */
export function AddSourcesDialog({
  open,
  onOpenChange,
  sources,
  connectors = [],
  onConnect,
  sample,
}: AddSourcesDialogProps) {
  if (!open) return null
  const choices = connectors.filter(
    (connector) =>
      connector.id !== 'mongodb-atlas' &&
      connector.modes.length > 0 &&
      ['mysql', 'postgres', 'mongodb', 'oracle', 'sqlserver'].some((family) =>
        connector.id.toLowerCase().includes(family),
      ),
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Add databases"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4F46E5] text-white shadow-xs">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">
                Add the databases you build from (Step 2)
              </h3>
              <p className="text-[11px] text-slate-500">
                Connect operational databases and event streams to replicate CDC mutations into
                MongoDB Atlas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto p-6">
          {sample && (
            <button
              type="button"
              disabled={sample.added || sample.adding}
              onClick={sample.onAdd}
              className="group w-full cursor-pointer rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white p-3.5 text-left transition-all hover:border-indigo-500 hover:shadow-md disabled:cursor-default"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                        Sample bank sources
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-indigo-700 uppercase">
                        Recommended
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">
                      {sample.names.join(' & ')}. Ready for the guided pipeline builder.
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-xl bg-[#4F46E5] px-3.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-white shadow-xs transition-colors group-hover:bg-[#4338CA]">
                  {sample.added ? 'Added' : sample.adding ? 'Adding…' : 'Initialize'}{' '}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </span>
              {sample.error && (
                <span className="mt-2 block text-[11px] text-red-600" role="alert">
                  {sample.error}
                </span>
              )}
            </button>
          )}
          <div className="px-1 pt-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Or connect self-hosted / cloud database
          </div>
          {choices.map((connector) => (
            <button
              key={connector.id}
              type="button"
              onClick={() => onConnect(connector.id)}
              className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-indigo-100">
                  <ConnectorIcon
                    connectorId={connector.id}
                    name={connector.name}
                    iconPath={connector.icon}
                    size={28}
                  />
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                    {connector.name}
                  </span>
                  <span className="text-[11px] text-slate-400">{connector.group}</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4F46E5] group-hover:underline">
                Connect <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
          {choices.length === 0 && (
            <button
              type="button"
              onClick={() => onConnect(null)}
              className="text-[12px] font-semibold text-[#4F46E5]"
            >
              Connect a source
            </button>
          )}
          {sources.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Connected: {sources.map((source) => source.id).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3 text-[11px] text-slate-500">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer font-semibold text-[#4F46E5] hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
