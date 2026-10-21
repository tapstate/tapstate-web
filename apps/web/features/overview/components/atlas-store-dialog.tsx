import type { ISchema } from '@formily/json-schema'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Database, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ClusterEgressAddressGuidance } from '@/components/cluster-egress-address-guidance'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConnectorFormily } from '@/features/sources/connector-formily'
import {
  connectorSpecConfigFields,
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
import { loadCloudWorkspaceContext } from '@/service/cloud-workspace-client'
import {
  getConnector,
  testConnection,
  type ConnectorDetail,
  type SourceView,
} from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

interface AtlasStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
}

/** The Atlas setup step keeps the prototype modal and renders the live connector contract. */
export function AtlasStoreDialog({ open, onOpenChange, onCreated }: AtlasStoreDialogProps) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const isCloudDeployment = getDeploymentProfile() === 'cloud'
  const cloudContext = useQuery({
    queryKey: ['cloud-workspace-context'],
    queryFn: () => loadCloudWorkspaceContext(apiFetch),
    enabled: isCloudDeployment && open,
    staleTime: 0,
    retry: 1,
  })
  const [egressAddressCopied, setEgressAddressCopied] = useState(false)
  const [egressAddressCopyFailed, setEgressAddressCopyFailed] = useState(false)
  const [connector, setConnector] = useState<ConnectorDetail | null>(null)
  const [schema, setSchema] = useState<ISchema | null>(null)
  const [config, setConfig] = useState<SourceConfigState>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState('')
  const [saving, setSaving] = useState(false)
  const egressAddress = cloudContext.isError ? null : cloudContext.data?.ec2PublicIp?.trim() || null
  const egressStatus = cloudContext.data?.egressAddressStatus ?? (egressAddress ? 'DYNAMIC' : null)

  useEffect(() => {
    setEgressAddressCopied(false)
    setEgressAddressCopyFailed(false)
  }, [open])

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
        const fields = normalizeConnectorConfigFields(
          detail.id,
          connectorSpecConfigFields(detail.spec.text, detail.config, 'en'),
        )
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

  async function copyEgressAddress() {
    if (!egressAddress) return
    setEgressAddressCopied(false)
    setEgressAddressCopyFailed(false)
    try {
      await navigator.clipboard.writeText(egressAddress)
      setEgressAddressCopied(true)
    } catch {
      setEgressAddressCopyFailed(true)
    }
  }

  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel="Close"
        className="border-border bg-background flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-xl ring-0 sm:max-w-lg"
      >
        <DialogHeader className="border-border flex shrink-0 flex-row items-start gap-3 border-b px-5 py-4 pr-12">
          <span className="bg-muted text-foreground mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-foreground text-base leading-6 font-semibold">
              Connect MongoDB Atlas
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] leading-5">
              Connect an Atlas cluster to store materialized collections.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col">
          <div
            data-atlas-dialog-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          >
            <div className="grid gap-5">
              {isCloudDeployment && (
                <ClusterEgressAddressGuidance
                  isLoading={cloudContext.isLoading}
                  isError={cloudContext.isError}
                  address={egressAddress}
                  status={egressStatus}
                  copied={egressAddressCopied}
                  copyFailed={egressAddressCopyFailed}
                  onCopy={() => void copyEgressAddress()}
                />
              )}
              {requestError && (
                <div
                  role="alert"
                  className="border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-5"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{requestError}</span>
                </div>
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
                <div
                  role="status"
                  className="text-muted-foreground flex min-h-20 items-center justify-center gap-2 text-[13px]"
                >
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Loading Atlas connector…
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-border bg-background flex shrink-0 items-center justify-end gap-2 border-t px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!connector || saving}>
              {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Verifying…' : 'Save & Authorize'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
