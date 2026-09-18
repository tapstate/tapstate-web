import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  Braces,
  Check,
  Database,
  LoaderCircle,
  Plus,
  Table2,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  PipelineJsonObject,
  PipelineMutation,
  PipelineTransformStep,
} from '@/service/pipelines/pipeline-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPipeline } from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineTransformType } from '../components/node-library/pipeline-node-library-types'
import type { PipelineTransformConfigurationPatch } from '../components/transform/types'

import { PipelineSourceTablePicker } from '../components/node-config/pipeline-node-config-panel'
import { TransformEditor } from '../components/transform/transform-editor'

const ATLAS_CONNECTOR_ID = 'mongodb-atlas'
const transformTypes: PipelineTransformType[] = ['filter', 'map', 'join', 'union', 'nest', 'js']

interface WizardStep {
  id: string
  type: PipelineTransformType
  body: PipelineJsonObject
  from?: unknown
  options?: PipelineJsonObject | null
}

const fanInTransformTypes = new Set<PipelineTransformType>(['join', 'union'])

function inputReferenceFor(sourceId: string, tables: readonly string[], previousStep?: WizardStep) {
  if (previousStep) return previousStep.id
  const references = sourceReferences(sourceId, tables)
  return references.length === 1 ? (references[0] ?? '') : references
}

function createWizardStep(
  type: PipelineTransformType,
  id: string,
  sourceId: string,
  sourceTables: readonly string[],
): WizardStep {
  const references = sourceReferences(sourceId, sourceTables)
  if (type === 'join' && references.length > 1) {
    return {
      id,
      type,
      from: { left: references[0], right: references[1] },
      body: { engine: 'duckdb', sql: '' },
    }
  }
  if (type === 'union' && references.length > 1) {
    return { id, type, from: references, body: {} }
  }
  if (type === 'nest') {
    return {
      id,
      type,
      body: { root: { from: references[0] ?? '', key: [], mode: 'upsert' } },
    }
  }
  if (type === 'js') return { id, type, body: { engine: 'javascript', script: '' } }
  return { id, type, body: type === 'filter' ? { expr: '' } : { fields: {} } }
}

function transformStepReady(step: WizardStep) {
  if (step.type === 'filter') return typeof step.body.expr === 'string' && step.body.expr.trim() !== ''
  if (step.type === 'map') {
    const fields = step.body.fields
    return (
      typeof fields === 'object' &&
      fields !== null &&
      !Array.isArray(fields) &&
      Object.entries(fields).some(([key, value]) => key.trim() && value !== '')
    )
  }
  if (step.type === 'join') {
    const inputs = step.from
    return (
      typeof inputs === 'object' &&
      inputs !== null &&
      !Array.isArray(inputs) &&
      Object.values(inputs).filter((value) => typeof value === 'string' && value.trim()).length >= 2 &&
      typeof step.body.sql === 'string' &&
      step.body.sql.trim() !== ''
    )
  }
  if (step.type === 'union') {
    return (
      Array.isArray(step.from) &&
      step.from.filter((value) => typeof value === 'string' && value.trim()).length >= 2
    )
  }
  if (step.type === 'nest') {
    const root =
      typeof step.body.root === 'object' &&
      step.body.root !== null &&
      !Array.isArray(step.body.root)
        ? (step.body.root as Record<string, unknown>)
        : null
    return (
      root !== null &&
      typeof root.from === 'string' &&
      root.from.trim() !== '' &&
      Array.isArray(root.key) &&
      root.key.length > 0
    )
  }
  return step.type === 'js' && typeof step.body.script === 'string' && step.body.script.trim() !== ''
}

function sourceReferences(sourceId: string, tables: readonly string[]) {
  return tables.map((table) => `${sourceId}.${table}`)
}

function previewValue(value: unknown) {
  if (typeof value === 'string') return value.trim() ? value : "''"
  if (value === undefined) return "''"
  return JSON.stringify(value)
}

function previewDsl(
  pipelineId: string | undefined,
  sourceId: string,
  sourceTables: readonly string[],
  steps: readonly WizardStep[],
  destinationId: string | undefined,
) {
  const transforms = steps.length
    ? steps
        .map((step, index) => {
          const from = step.from ?? inputReferenceFor(sourceId, sourceTables, steps[index - 1])
          const body = Object.entries(step.body)
            .map(([key, value]) => `    ${key}: ${previewValue(value)}`)
            .join('\n')
          const options = step.options
            ? `    options: ${previewValue(step.options)}`
            : ''
          return [
            `  - id: ${step.id}`,
            `    type: ${step.type}`,
            `    from: ${previewValue(from)}`,
            body,
            options,
          ]
            .filter(Boolean)
            .join('\n')
        })
        .join('\n')
    : '  []'
  return `version: tapstate/v1
kind: pipeline
id: ${pipelineId || 'your_pipeline'}
source: ${sourceId || 'choose_source'}
transforms:
${transforms}
serve: ${destinationId || 'configure_atlas'}`
}

function buildPipelineMutation({
  pipelineId,
  description,
  sourceId,
  sourceTables,
  steps,
  destinationId,
  destinationTable,
}: {
  pipelineId: string
  description: string
  sourceId: string
  sourceTables: readonly string[]
  steps: readonly WizardStep[]
  destinationId: string
  destinationTable: string
}): PipelineMutation {
  const initialReferences = sourceReferences(sourceId, sourceTables)
  const initialReference = initialReferences.length === 1 ? initialReferences[0] : initialReferences
  const transforms: PipelineTransformStep[] = steps.map((step, index) => ({
    id: step.id,
    from: step.from ?? (index === 0 ? initialReference : steps[index - 1]!.id),
    type: step.type,
    ...step.body,
    ...(step.options ? { options: step.options } : {}),
  }))
  const outputReference = steps.at(-1)?.id ?? initialReference

  return {
    id: pipelineId,
    metadata: { labels: {}, description: description || null },
    sources: [sourceId],
    transforms,
    view: null,
    serve: {
      id: 'atlas',
      from: outputReference,
      sync: [{ id: destinationTable, source: destinationId, writeMode: 'upsert' }],
    },
    settings: null,
    experimental: null,
  }
}

export function WizardBuilder({
  onComplete,
  pipelineId,
  description,
}: {
  onComplete: () => void
  pipelineId?: string
  description?: string
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [sourceId, setSourceId] = useState('')
  const [sourceTables, setSourceTables] = useState<string[]>([])
  const [steps, setSteps] = useState<WizardStep[]>([])
  const [destinationTable, setDestinationTable] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const sourcesQuery = useQuery({
    queryKey: ['wizard', 'sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectorsQuery = useQuery({
    queryKey: ['wizard', 'connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const sources = sourcesQuery.data ?? []
  const source = sources.find((item) => item.id === sourceId)
  const sourceSchemaQuery = useQuery({
    queryKey: ['wizard', 'source-schema', sourceId],
    queryFn: () => getSourceSchema(sourceId, apiFetch),
    enabled: Boolean(sourceId && source?.tables === null),
  })
  const atlasDestination = useMemo(
    () => sources.find((source) => source.connector === ATLAS_CONNECTOR_ID) ?? null,
    [sources],
  )
  const connectorsById = useMemo(
    () => new Map((connectorsQuery.data ?? []).map((connector) => [connector.id, connector])),
    [connectorsQuery.data],
  )
  const sourceTableOptions = useMemo(() => {
    if (!source) return []
    if (source.tables === null) {
      return (sourceSchemaQuery.data?.tables ?? []).map((table) => ({
        label: table.name,
        value: table.name,
      }))
    }
    return (source.tables ?? [])
      .map((table) => table.name)
      .filter((table): table is string => Boolean(table))
      .map((table) => ({ label: table, value: table }))
  }, [source, sourceSchemaQuery.data?.tables])
  const sourceTableSummary =
    sourceTables.length > 1
      ? `${sourceTables[0]} +${sourceTables.length - 1}`
      : (sourceTables[0] ?? '')
  const sourceTableLoading = Boolean(source?.tables === null && sourceSchemaQuery.isPending)
  const ready = Boolean(
    pipelineId &&
    sourceId &&
    sourceTables.length > 0 &&
    steps.every(transformStepReady) &&
    atlasDestination &&
    destinationTable.trim(),
  )
  const isLoading = sourcesQuery.isPending || connectorsQuery.isPending
  const atlasConnector = atlasDestination
    ? connectorsById.get(atlasDestination.connector)
    : undefined

  function addStepOfType(type: PipelineTransformType) {
    if (!sourceId || sourceTables.length === 0) return
    if (fanInTransformTypes.has(type) && (steps.length > 0 || sourceTables.length < 2)) return
    const nextIndex = steps.length + 1
    setSteps((current) => [
      ...current,
      createWizardStep(type, `${type}_${nextIndex}`, sourceId, sourceTables),
    ])
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateStep(index: number, patch: PipelineTransformConfigurationPatch) {
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index
          ? {
              ...step,
              body: patch.body ?? step.body,
              ...(patch.from !== undefined ? { from: patch.from } : {}),
              ...(patch.options !== undefined ? { options: patch.options } : {}),
            }
          : step,
      ),
    )
  }

  async function handleSave() {
    if (!ready || !pipelineId || !atlasDestination || isSaving) return
    setError('')
    setIsSaving(true)
    try {
      await createPipeline(
        buildPipelineMutation({
          pipelineId,
          description: description?.trim() ?? '',
          sourceId,
          sourceTables,
          steps,
          destinationId: atlasDestination.id,
          destinationTable: destinationTable.trim(),
        }),
        apiFetch,
      )
      onComplete()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }

  const [previewMode, setPreviewMode] = useState<'dsl' | 'rows'>('dsl')

  return (
    <section className="pipeline-wizard" data-testid="wizard-builder">
      <div className="pipeline-wizard__workspace">
        <main className="pipeline-wizard__stack pr-2 pl-3" aria-label={t('wizard.flowLabel')}>
          <WizardNodeCard tone="source">
            <div className="pipeline-wizard__node-heading">
              <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--source">
                <Database className="size-4" aria-hidden="true" />
              </span>
              <div className="pipeline-wizard__node-title">
                <h1>{sourceTableSummary || t('wizard.sourceTitle')}</h1>
                <p>{t('wizard.sourceHint')}</p>
              </div>
            </div>
            <div className="pipeline-wizard__fields">
              <label className="pipeline-wizard__field">
                <span>{t('wizard.sourceSelect')}</span>
                <Select
                  value={sourceId}
                  onValueChange={(value) => {
                    setSourceId(value ?? '')
                    setSourceTables([])
                    setSteps([])
                  }}
                >
                  <SelectTrigger
                    className="pipeline-wizard__select"
                    aria-label={t('wizard.sourceSelect')}
                  >
                    <SelectValue
                      placeholder={isLoading ? t('wizard.loading') : t('wizard.sourceSelect')}
                    />
                  </SelectTrigger>
                  <SelectContent className="pipeline-wizard__source-select-content">
                    {sources.map((item) => {
                      const connector = connectorsById.get(item.connector)
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          <ConnectorIcon
                            connectorId={item.connector}
                            name={connector?.name ?? item.connector}
                            iconPath={connector?.icon}
                            size={20}
                          />
                          <span className="pipeline-wizard__source-option-label">{item.id}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </label>
              {source && (
                <PipelineSourceTablePicker
                  key={source.id}
                  sourceId={source.id}
                  sources={sources}
                  options={sourceTableOptions}
                  loading={sourceTableLoading}
                  value={sourceTables}
                  onChange={(nextTables) => {
                    setSourceTables(nextTables)
                    if (steps.some((step) => fanInTransformTypes.has(step.type))) {
                      setSteps([])
                    }
                  }}
                />
              )}
            </div>
            {source && (
              <p className="pipeline-wizard__meta">
                <Check className="size-3.5" aria-hidden="true" />
                {connectorsById.get(source.connector)?.name ?? source.connector}
                <span aria-hidden="true">·</span>
                <code>
                  {sourceTables.length > 0
                    ? sourceReferences(source.id, sourceTables).join(', ')
                    : t('wizard.awaitingTable')}
                </code>
              </p>
            )}
          </WizardNodeCard>

          {steps.map((step, index) => (
            <div key={step.id} className="pipeline-wizard__segment">
              <FlowConnector />
              <WizardNodeCard tone="transform">
                <div className="pipeline-wizard__node-heading">
                  <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--transform">
                    <WandSparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div className="pipeline-wizard__node-title">
                    <h2>{t(`wizard.transforms.${step.type}`)}</h2>
                    <p>{t(`wizard.transformDescriptions.${step.type}`)}</p>
                  </div>
                  <span className="pipeline-wizard__step-kind">{step.type}</span>
                  <button
                    type="button"
                    className="pipeline-wizard__icon-button"
                    aria-label={t('wizard.removeStep')}
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="pipeline-wizard__step-context">
                  <span>{t('wizard.input')}</span>
                  <code>
                    {JSON.stringify(
                      step.from ?? inputReferenceFor(sourceId, sourceTables, steps[index - 1]),
                    )}
                  </code>
                </div>
                <div className="pipeline-wizard__step-editor">
                  <TransformEditor
                    config={{
                      kind: 'transform',
                      nodeId: `wizard:${step.id}`,
                      stepId: step.id,
                      transformType: step.type,
                      from: step.from ?? inputReferenceFor(sourceId, sourceTables, steps[index - 1]),
                      options: step.options ?? null,
                      body: step.body,
                    }}
                    onChange={(patch) => updateStep(index, patch)}
                  />
                </div>
                {!transformStepReady(step) && (
                  <p className="pipeline-wizard__step-warning">
                    {t('wizard.stepNeedsConfiguration')}
                  </p>
                )}
              </WizardNodeCard>
            </div>
          ))}

          <AddStepControl
            canAdd={Boolean(sourceId && sourceTables.length > 0)}
            canAddFanIn={steps.length === 0 && sourceTables.length > 1}
            onAdd={addStepOfType}
          />

          <FlowConnector />
          <WizardNodeCard tone="output">
            <div className="pipeline-wizard__node-heading">
              <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--output">
                <Table2 className="size-4" aria-hidden="true" />
              </span>
              <div className="pipeline-wizard__node-title">
                <h2>{t('wizard.outputTitle')}</h2>
                <p>{t('wizard.outputHint')}</p>
              </div>
            </div>
            <div className="pipeline-wizard__atlas-row">
              <span className="pipeline-wizard__atlas-mark" aria-hidden="true">
                <Database className="size-4" />
              </span>
              <div>
                <strong>{atlasDestination?.id ?? t('wizard.atlasNotConfigured')}</strong>
                <span>{atlasConnector?.name ?? t('wizard.atlasHint')}</span>
              </div>
              {!atlasDestination && (
                <Link to="/sources" className="pipeline-wizard__configure-link">
                  {t('wizard.configureAtlas')}
                </Link>
              )}
            </div>
            {atlasDestination && (
              <label className="pipeline-wizard__field">
                <span>{t('wizard.destinationTableSelect')}</span>
                <input
                  className="pipeline-wizard__input"
                  value={destinationTable}
                  onChange={(event) => setDestinationTable(event.target.value)}
                  placeholder={t('wizard.destinationTablePlaceholder')}
                />
              </label>
            )}
          </WizardNodeCard>

          <div className="pipeline-wizard__actions">
            {error && (
              <p className="pipeline-wizard__error" role="alert">
                {error}
              </p>
            )}
            <Button type="button" disabled={!ready || isSaving} onClick={() => void handleSave()}>
              {isSaving && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
              {isSaving ? t('wizard.saving') : t('wizard.create')}
            </Button>
          </div>
        </main>

        <aside className="pipeline-wizard__preview" aria-label={t('wizard.preview.title')}>
          <div className="pipeline-wizard__preview-header">
            <h2>{t('wizard.preview.title')}</h2>
            <div className="pipeline-wizard__preview-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'dsl'}
                aria-label={t('wizard.preview.codeLabel')}
                data-active={previewMode === 'dsl'}
                onClick={() => setPreviewMode('dsl')}
              >
                <Braces className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'rows'}
                aria-label={t('wizard.preview.grid')}
                data-active={previewMode === 'rows'}
                onClick={() => setPreviewMode('rows')}
              >
                <Table2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="pipeline-wizard__preview-body">
            {previewMode === 'dsl' ? (
              <pre
                className="pipeline-wizard__dsl"
                aria-label={t('wizard.preview.codeLabel')}
            >{previewDsl(pipelineId, sourceId, sourceTables, steps, atlasDestination?.id)}</pre>
            ) : (
              <div className="pipeline-wizard__empty-preview">
                <span className="pipeline-wizard__empty-icon" aria-hidden="true">
                  <Table2 className="size-5" />
                </span>
                <strong>{t('wizard.preview.empty')}</strong>
                <span>{t('wizard.preview.emptyHint')}</span>
              </div>
            )}
          </div>
          <div className="pipeline-wizard__preview-footer">
            <span className="pipeline-wizard__preview-dot" aria-hidden="true" />
            <span>{t('wizard.preview.note')}</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

function WizardNodeCard({
  tone,
  children,
}: {
  tone: 'source' | 'transform' | 'output'
  children: ReactNode
}) {
  return (
    <article
      className={`pipeline-wizard__node-card-wrapper pipeline-wizard__node-card-wrapper--${tone}`}
    >
      {children}
    </article>
  )
}

function FlowConnector() {
  return (
    <div className="pipeline-wizard__connector" aria-hidden="true">
      <span />
      <ArrowDown className="size-3.5" />
    </div>
  )
}

function AddStepControl({
  canAdd,
  canAddFanIn,
  onAdd,
}: {
  canAdd: boolean
  canAddFanIn: boolean
  onAdd: (type: PipelineTransformType) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="pipeline-wizard__add-control">
      <div className="pipeline-wizard__add-line" aria-hidden="true" />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="pipeline-wizard__add-button"
              disabled={!canAdd}
              aria-label={t('wizard.chooseTransform')}
              title={t('wizard.chooseTransform')}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          }
        />
        <DropdownMenuContent align="center" sideOffset={8} className="pipeline-wizard__step-menu">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('wizard.chooseTransform')}</DropdownMenuLabel>
            {transformTypes.map((type) => (
              <DropdownMenuItem
                key={type}
                disabled={!canAdd || (fanInTransformTypes.has(type) && !canAddFanIn)}
                onClick={() => {
                  onAdd(type)
                  setOpen(false)
                }}
              >
                <WandSparkles className="size-3.5" aria-hidden="true" />
                <span className="pipeline-wizard__step-menu-copy">
                  <strong>{t(`wizard.transforms.${type}`)}</strong>
                  <small>{t(`wizard.transformDescriptions.${type}`)}</small>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
