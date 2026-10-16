import type { ISchema } from '@formily/json-schema'

import { Layers, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectorFormily } from '@/features/sources/connector-formily'
import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
  normalizeConnectorConfigFields,
  normalizeConnectorConfigValues,
} from '@/features/sources/connector-spec-formily-schema'
import {
  buildSourceConfig,
  createInitialConfig,
  type SourceConfigState,
} from '@/features/sources/source-form'
import {
  getConnector,
  testConnection,
  type ConnectorDetail,
  type SourceView,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

interface AtlasStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
}

/** The Atlas setup step keeps the prototype modal and renders the live connector contract. */
export function AtlasStoreDialog({ open, onOpenChange, onCreated }: AtlasStoreDialogProps) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
  const [config, setConfig] = useState<SourceConfigState>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setConnector(null)
    setSchema(null)
    setRequestError('')
    getConnector('mongodb-atlas', apiFetch)
      .then((detail) => {
        if (!active) return
        if (detail.spec.text === null) throw new Error('Atlas connector form is unavailable')
        const fields = normalizeConnectorConfigFields(detail.id, detail.config)
        setSchema(
          withoutTextHints(connectorSpecConnectionSchema(detail.spec.text, 'en', detail.id)),
        )
        setConfig({
          ...createInitialConfig(fields),
          ...normalizeConnectorConfigValues(
            detail.id,
            connectorSpecInitialValues(detail.spec.text, detail.id),
          ),
        })
        setConnector({ ...detail, config: fields })
      })
      .catch((error: unknown) => {
        if (active)
          setRequestError(error instanceof Error ? error.message : 'Atlas connector unavailable')
      })
    return () => {
      active = false
    }
  }, [apiFetch, open])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!connector) return
    const built = buildSourceConfig(connector.config, config)
    if (Object.keys(built.errors).length > 0) {
      setErrors(
        Object.fromEntries(
          Object.entries(built.errors).map(([field]) => [field, 'Required field']),
        ),
      )
      return
    }
    setSaving(true)
    setRequestError('')
    try {
      const id = 'atlas-store'
      const report = await testConnection(
        { id, connectorId: connector.id, settings: built.config },
        apiFetch,
      )
      if (report.outcome !== 'PASSED') {
        setRequestError('Could not connect to MongoDB Atlas. Check the connector settings.')
        return
      }
      const response = await apiFetch('/api/state-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(built.config),
      })
      if (!response.ok) throw new Error('Could not save the Atlas store')
      const created = (await response.json()) as SourceView
      onCreated(created)
      onOpenChange(false)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not save the Atlas store')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Connect MongoDB Atlas"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">
                Connect MongoDB Atlas (Step 1)
              </h3>
              <p className="text-[11px] text-slate-500">
                Authorize the target cluster where real-time collections will materialize.
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
        <form onSubmit={(event) => void save(event)} className="space-y-4 p-6">
          {requestError && (
            <p role="alert" className="text-[12px] text-red-600">
              {requestError}
            </p>
          )}
          {connector && schema ? (
            <ConnectorFormily
              fields={connector.config}
              schema={schema}
              resetKey={`${connector.id}:${connector.spec.contentHash}`}
              initialValues={config}
              errors={errors}
              disabled={saving}
              onValuesChange={(values) => {
                setConfig(values)
                setErrors({})
              }}
            />
          ) : !requestError ? (
            <p className="text-[12px] text-slate-500">Loading Atlas connector…</p>
          ) : null}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!connector || saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Verifying…' : 'Save & Authorize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** The PDK's Text fields are tooltip hints; Formily renders them as empty form rows here. */
function withoutTextHints(schema: ISchema): ISchema {
  return {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, field]) => field['x-component'] !== 'Text')
        .map(([name, field]) => [name, withoutTextHints(field)]),
    ),
  }
}
