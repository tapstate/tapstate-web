import { Button as DifyButton } from '@langgenius/dify-ui/button'
import { IconButton as DifyIconButton } from '@langgenius/dify-ui/icon-button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@langgenius/dify-ui/popover'
import { Textarea as DifyTextarea } from '@langgenius/dify-ui/textarea'
import {
  Database,
  Table2,
  Plus,
  Trash2,
  FolderTree,
  Braces,
  X,
  FileCode,
  Play,
  Zap,
  Check,
  RefreshCw,
  Layers,
  Workflow,
  Copy,
  Sparkles,
} from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelinePreviewRun } from '@/service/pipelines/pipeline-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { Button } from '@/components/ui/button'

import './wizard-reference.css'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { DeploymentProfile } from '../../model/deployment-profile'

import { UnwindTargetIdentitySummary } from '../unwind-target-identity-summary'
import { PipelineAiCopilot, type BuilderAssistantContext } from './PipelineAiCopilot'
import { matchRelationFields, type RelationFieldTable } from './relation-field-matching'
import { FieldAutocomplete, SearchablePicker } from './searchable-picker'
import {
  TableTransformsManager,
  effectiveUnwindSourceIdField,
  type TransformStep,
} from './TableTransformsManager'
import {
  readWizard,
  relationKeysForTableChange,
  relationTableKeys,
  writeWizard,
} from './wizard-adapter'
import { reparentRelation } from './wizard-tree'

export interface WizardBuilderProps {
  catalog: DataSourceMeta[]
  destinationCatalog?: DataSourceMeta[]
  initial: WizardViewState
  onChange: (state: WizardViewState) => void
  destinationName: string
  deploymentProfile: DeploymentProfile
  footer: React.ReactNode
  actions?: React.ReactNode
  /** Notices kept above the editor, outside its read-only fieldset so they can be dismissed. */
  notices?: React.ReactNode
  compiledSpec: string
  livePreview: PipelinePreviewRun | null
  livePreviewStatus: 'idle' | 'loading' | 'stale' | 'complete' | 'error'
  livePreviewError: string
  sourceError?: string
  readOnly?: boolean
  readOnlyLabel?: string
  activeGuideTarget?: string
  renderGuideStep?: (step: number) => React.ReactNode
  showWorkbenchHeader?: boolean
  onInspectPlan?: () => Promise<string>
  onStart?: () => void
  startBusy?: boolean
  actionError?: string
  assistant?: BuilderAssistantContext
}

export interface JoinCondition {
  childKey: string
  parentTable?: string
  parentKey: string
  operator?: string
}

export interface RelationNode {
  id: string
  type: 'sub_array' | 'sub_doc' | 'flatten'
  source: string
  table: string
  key: string
  parentTable: string
  parentKey: string
  conditions?: JoinCondition[]
  targetField: string
  preProcessing: { id: string; title: string; detail: string }[]
  transforms?: TransformStep[]
  children?: RelationNode[]
  primaryKey?: string[]
  arrayKey?: string[]
  isConditionOpen?: boolean
  isPreProcessOpen?: boolean
  isTableEditing?: boolean
  isPathEditing?: boolean
}

export interface TableMeta {
  name: string
  primaryKey: string
  keys?: string[]
  discovered?: boolean
  rowCount: string
  columns: string[]
  defaultKey?: string
  defaultParentKey?: string
}

export interface DataSourceMeta {
  id: string
  name: string
  badge: string
  connector?: string
  connectorName?: string
  iconPath?: string | null
  sink?: boolean
  writeModes?: string[]
  tables: TableMeta[]
}

export interface RootConfig {
  source: string
  table: string
  primaryKey: string
  keys?: string[]
  rowCount: string
  columns: string[]
  transforms?: TransformStep[]
  isTransformsOpen?: boolean
}

export interface WizardViewState {
  root: RootConfig | null
  relations: RelationNode[]
  transforms: TransformStep[]
  destinationTable: string
  destinationSourceId: string
  destinationWriteMode: string
}

function expandNewAssistantTransforms(
  next: WizardViewState,
  previous: WizardViewState,
): WizardViewState {
  const expandSteps = (steps: TransformStep[] = [], prior: TransformStep[] = []) => {
    const priorById = new Map(prior.map((step) => [step.id, step]))
    return steps.map((step) => {
      const previousStep = priorById.get(step.id)
      return { ...step, isExpanded: previousStep ? previousStep.isExpanded : true }
    })
  }
  const expandRelations = (relations: RelationNode[], prior: RelationNode[]): RelationNode[] => {
    const priorById = new Map(prior.map((relation) => [relation.id, relation]))
    return relations.map((relation) => {
      const previousRelation = priorById.get(relation.id)
      const transforms = expandSteps(relation.transforms, previousRelation?.transforms)
      const hasNewTransform = transforms.some(
        (step) => !previousRelation?.transforms?.some((oldStep) => oldStep.id === step.id),
      )
      return {
        ...relation,
        transforms,
        isPreProcessOpen: hasNewTransform
          ? true
          : (previousRelation?.isPreProcessOpen ?? relation.isPreProcessOpen),
        children: expandRelations(relation.children || [], previousRelation?.children || []),
      }
    })
  }

  const rootTransforms = expandSteps(next.root?.transforms, previous.root?.transforms)
  const hasNewRootTransform = rootTransforms.some(
    (step) => !previous.root?.transforms?.some((oldStep) => oldStep.id === step.id),
  )
  return {
    ...next,
    root: next.root
      ? {
          ...next.root,
          transforms: rootTransforms,
          isTransformsOpen: hasNewRootTransform
            ? true
            : (previous.root?.isTransformsOpen ?? next.root.isTransformsOpen),
        }
      : null,
    relations: expandRelations(next.relations, previous.relations),
    transforms: expandSteps(next.transforms, previous.transforms),
  }
}

function ReadOnlyFieldset({
  disabled,
  label,
  children,
}: {
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset
      disabled={disabled}
      className="contents"
      aria-label={disabled ? label : undefined}
      onClickCapture={
        disabled
          ? (event) => {
              event.preventDefault()
              event.stopPropagation()
            }
          : undefined
      }
    >
      {children}
    </fieldset>
  )
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const ReferenceWizardBuilder: React.FC<WizardBuilderProps> = ({
  catalog: AVAILABLE_DATA_SOURCES,
  destinationCatalog: AVAILABLE_DESTINATIONS = AVAILABLE_DATA_SOURCES,
  initial,
  onChange,
  destinationName,
  deploymentProfile,
  footer,
  actions,
  notices,
  compiledSpec,
  livePreview,
  livePreviewStatus,
  livePreviewError,
  sourceError,
  readOnly = false,
  readOnlyLabel,
  activeGuideTarget,
  renderGuideStep,
  showWorkbenchHeader = false,
  onInspectPlan,
  onStart,
  startBusy = false,
  actionError,
  assistant,
}) => {
  const { t } = useTranslation()
  const [assistantOpen, setAssistantOpen] = React.useState(true)
  const [rightPanelTab, setRightPanelTab] = React.useState<'copilot' | 'preview'>(
    assistant && !readOnly ? 'copilot' : 'preview',
  )
  React.useEffect(() => {
    if (!assistant) return
    const toggle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setAssistantOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [assistant])
  const [assistantPrompt, setAssistantPrompt] = React.useState<{
    id: number
    text: string
    submit?: boolean
  } | null>(null)
  const [assistantHelperDraft, setAssistantHelperDraft] = React.useState<{
    focus: string
    intent: string
    text: string
  } | null>(null)
  const assistantHelperComposerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const textarea = assistantHelperComposerRef.current?.querySelector('textarea')
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 158)}px`
  }, [assistantHelperDraft?.text])
  const [rootPrompt, setRootPrompt] = React.useState('')
  const rootPromptInput = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => {
    const field = rootPromptInput.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 158)}px`
  }, [rootPrompt])
  const rootPromptRequestId = React.useRef<number | null>(null)
  const assistantPromptSequence = React.useRef(0)
  const [activeContext, setActiveContext] = React.useState('root')
  const [previewProjection, setPreviewProjection] = React.useState<'target' | 'logical'>('target')
  const [previewMode, setPreviewMode] = React.useState<'json' | 'table'>('json')
  const [planMode, setPlanMode] = React.useState<'dsl' | 'json' | null>(null)
  const [dsl, setDsl] = React.useState<string | null>(null)
  const [dslLoading, setDslLoading] = React.useState(false)
  const [dslError, setDslError] = React.useState('')
  async function inspectPlan() {
    if (!onInspectPlan) return
    setPlanMode('dsl')
    setDsl(null)
    setDslError('')
    setDslLoading(true)
    try {
      setDsl(await onInspectPlan())
    } catch (cause) {
      setDslError(cause instanceof Error ? cause.message : t('wizard.dslUnavailable'))
    } finally {
      setDslLoading(false)
    }
  }
  const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied' | 'failed'>('idle')
  const copyResetTimer = React.useRef<number | null>(null)
  const [targetCollection, setTargetCollection] = React.useState(initial.destinationTable)
  const [targetSourceId, setTargetSourceId] = React.useState(initial.destinationSourceId)
  const [targetWriteMode, setTargetWriteMode] = React.useState(
    initial.destinationWriteMode || 'upsert',
  )
  const [rootConfig, setRootConfig] = React.useState<RootConfig | null>(initial.root)
  const [isRootEditing, setIsRootEditing] = React.useState(!initial.root)
  const [scratchSelectedSource, setScratchSelectedSource] = React.useState(
    initial.root?.source || '',
  )
  const [scratchSelectedTable, setScratchSelectedTable] = React.useState(initial.root?.table || '')
  const unconfirmedRootEdit =
    isRootEditing && Boolean(rootConfig || scratchSelectedSource || scratchSelectedTable)
  const [relations, setRelations] = React.useState<RelationNode[]>(initial.relations)
  const [pipelineTransforms, setPipelineTransforms] = React.useState(initial.transforms)
  const [selectedDocumentIndex, setSelectedDocumentIndex] = React.useState(0)
  const hasUnwind = () =>
    [
      ...(rootConfig?.transforms || []),
      ...pipelineTransforms,
      ...flattenRelations(relations).flatMap((relation) => relation.transforms || []),
    ].some((step) => step.type === 'unwind' && step.enabled !== false)
  const identityPlans =
    livePreviewStatus === 'complete' || livePreviewStatus === 'error'
      ? livePreview?.identityPlans
      : undefined
  const targetDataSource = AVAILABLE_DESTINATIONS.find((source) => source.id === targetSourceId)
  const availableWriteModes = targetDataSource?.writeModes?.length
    ? targetDataSource.writeModes
    : ['upsert']
  const selectedWriteMode = availableWriteModes.includes(targetWriteMode)
    ? targetWriteMode
    : availableWriteModes[0]
  const destinationSources = React.useMemo(
    () =>
      AVAILABLE_DESTINATIONS.filter(
        (source) =>
          source.sink === true &&
          (deploymentProfile !== 'cloud' || source.connector === 'mongodb-atlas'),
      ),
    [AVAILABLE_DESTINATIONS, deploymentProfile],
  )
  const sourcePickerOptions = React.useMemo(
    () =>
      AVAILABLE_DATA_SOURCES.map((source) => ({
        value: source.name,
        label: source.name,
        detail: source.connectorName || source.badge,
        icon: (
          <ConnectorIcon
            connectorId={source.connector || source.badge}
            name={source.connectorName || source.badge}
            iconPath={source.iconPath}
            size={18}
          />
        ),
      })),
    [AVAILABLE_DATA_SOURCES],
  )
  const destinationPickerOptions = React.useMemo(
    () =>
      destinationSources.map((source) => ({
        value: source.id,
        label: source.name,
        detail: source.connectorName || source.badge,
        icon: (
          <ConnectorIcon
            connectorId={source.connector || source.badge}
            name={source.connectorName || source.badge}
            iconPath={source.iconPath}
            size={18}
          />
        ),
      })),
    [destinationSources],
  )
  const tablePickerOptionsBySource = React.useMemo(
    () =>
      new Map(
        AVAILABLE_DATA_SOURCES.map((source) => [
          source.name,
          source.tables.map((table) => ({
            value: table.name,
            label: table.name,
            icon: <Table2 className="text-text-tertiary size-4" aria-hidden="true" />,
            detail: table.primaryKey ? `PK: ${table.primaryKey}` : undefined,
          })),
        ]),
      ),
    [AVAILABLE_DATA_SOURCES],
  )
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const viewState = React.useMemo(
    () => ({
      root: rootConfig,
      relations,
      transforms: pipelineTransforms,
      destinationTable: targetCollection,
      destinationSourceId: targetSourceId,
      destinationWriteMode: selectedWriteMode,
    }),
    [
      rootConfig,
      relations,
      pipelineTransforms,
      targetCollection,
      targetSourceId,
      selectedWriteMode,
    ],
  )
  const lastView = React.useRef(JSON.stringify(viewState))
  const currentView = React.useRef(viewState)
  currentView.current = viewState
  const assistantUndo = React.useRef<{
    previous: WizardViewState
    appliedFingerprint: string
  } | null>(null)
  React.useEffect(() => {
    const fingerprint = JSON.stringify(viewState)
    if (lastView.current !== fingerprint) {
      lastView.current = fingerprint
      onChangeRef.current(viewState)
    }
  }, [viewState])

  function assistantScope(focus: string) {
    if (focus === 'root') return rootConfig?.table || t('wizard.assistant.inputTableFocus')
    if (focus === 'doc_process') return t('wizard.assistant.documentFocus')
    if (focus === 'relations') return t('wizard.assistant.relationsFocus')
    return flattenRelations(relations).find((relation) => relation.id === focus)?.table || focus
  }
  function sendAssistantHelper() {
    const draft = assistantHelperDraft
    const text = draft?.text.trim()
    if (
      !draft ||
      !text ||
      readOnly ||
      assistant?.blocked ||
      (assistant?.sendBlocked ?? assistant?.blocked) ||
      assistantPrompt?.submit
    )
      return
    setActiveContext(draft.focus)
    setAssistantOpen(true)
    setRightPanelTab('copilot')
    setAssistantPrompt({ id: ++assistantPromptSequence.current, text, submit: true })
    setAssistantHelperDraft(null)
  }
  function submitRootPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const text = rootPrompt.trim()
    if (!text || readOnly || !assistant || assistantPrompt?.submit) return
    const id = ++assistantPromptSequence.current
    rootPromptRequestId.current = id
    setActiveContext('root')
    setAssistantOpen(true)
    setRightPanelTab('copilot')
    setAssistantPrompt({ id, text, submit: true })
  }
  function handleAssistantPromptRequest(id: number) {
    setAssistantPrompt((current) => (current?.id === id ? null : current))
    if (rootPromptRequestId.current === id) {
      rootPromptRequestId.current = null
      setRootPrompt('')
    }
  }
  function applyAssistant(
    candidate: import('@/service/pipelines/pipeline-client').PipelineJsonObject,
  ) {
    if (readOnly || unconfirmedRootEdit || assistant?.blocked) return
    const previous = currentView.current
    const decoded = readWizard(
      writeWizard(candidate as unknown as WizardViewState, null, '', deploymentProfile),
      AVAILABLE_DATA_SOURCES,
    )
    const next = expandNewAssistantTransforms(decoded, previous)
    assistantUndo.current = { previous, appliedFingerprint: JSON.stringify(next) }
    setRootConfig(next.root)
    setRelations(next.relations)
    setPipelineTransforms(next.transforms)
    setTargetCollection(next.destinationTable)
    setTargetSourceId(next.destinationSourceId)
    setTargetWriteMode(next.destinationWriteMode)
    setIsRootEditing(!next.root)
    lastView.current = JSON.stringify(next)
    // Apply the canonical candidate as one editor transaction.
    assistant?.onApply(candidate)
  }
  function undoAssistantApply() {
    const transaction = assistantUndo.current
    if (
      readOnly ||
      unconfirmedRootEdit ||
      assistant?.undoBlocked ||
      !transaction ||
      JSON.stringify(currentView.current) !== transaction.appliedFingerprint
    )
      return false
    assistantUndo.current = null
    const previous = transaction.previous
    setRootConfig(previous.root)
    setIsRootEditing(!previous.root)
    setScratchSelectedSource(previous.root?.source || '')
    setScratchSelectedTable(previous.root?.table || '')
    setRelations(previous.relations)
    setPipelineTransforms(previous.transforms)
    setTargetCollection(previous.destinationTable)
    setTargetSourceId(previous.destinationSourceId)
    setTargetWriteMode(previous.destinationWriteMode)
    lastView.current = JSON.stringify(previous)
    assistant?.onApply(
      previous as unknown as import('@/service/pipelines/pipeline-client').PipelineJsonObject,
    )
    return true
  }
  const assistantHelper = (focus: string, intent: string) =>
    assistant && !readOnly ? (
      <Popover
        open={assistantHelperDraft?.focus === focus && assistantHelperDraft?.intent === intent}
        onOpenChange={(open) => {
          if (!open) {
            setAssistantHelperDraft(null)
            return
          }
          setAssistantHelperDraft({
            focus,
            intent,
            text: '',
          })
        }}
      >
        <PopoverTrigger
          render={
            <DifyIconButton
              type="button"
              variant="ghost-accent"
              size="md"
              aria-label={t(`wizard.assistant.helpers.${intent}`)}
              title={t(`wizard.assistant.helpers.${intent}`)}
              onClick={(event) => event.stopPropagation()}
              className="data-popup-open:bg-state-accent-active"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </DifyIconButton>
          }
        />
        <PopoverContent
          className="pipeline-ai-helper-popover w-72 max-w-[calc(100vw-2rem)] p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-3">
            <div>
              <PopoverTitle className="system-sm-semibold text-text-primary">
                {t(`wizard.assistant.intents.${intent}`)}
              </PopoverTitle>
              <PopoverDescription className="system-xs-regular text-text-tertiary mt-1 flex min-w-0 items-baseline gap-1">
                {t('wizard.assistant.helperPopover.scope')}{' '}
                <span className="system-xs-medium text-text-secondary truncate font-mono">
                  {assistantScope(focus)}
                </span>
              </PopoverDescription>
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`assistant-helper-${focus}-${intent}`}
                className="system-xs-medium text-text-secondary block"
              >
                {t('wizard.assistant.helperPopover.prompt')}
              </label>
              <div
                ref={assistantHelperComposerRef}
                className="pipeline-ai-composer pipeline-ai-composer--inline"
              >
                <DifyTextarea
                  id={`assistant-helper-${focus}-${intent}`}
                  autoFocus
                  size="medium"
                  rows={1}
                  value={
                    assistantHelperDraft?.focus === focus && assistantHelperDraft?.intent === intent
                      ? assistantHelperDraft.text
                      : ''
                  }
                  onValueChange={(text) =>
                    setAssistantHelperDraft((current) =>
                      current?.focus === focus && current.intent === intent
                        ? { ...current, text }
                        : current,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault()
                      sendAssistantHelper()
                    }
                  }}
                  placeholder={t(`wizard.assistant.helperPopover.placeholders.${intent}`)}
                  className="pipeline-ai-composer-input min-h-8 resize-none rounded-none border-0 bg-transparent px-1 py-1 pe-10 focus:border-transparent focus:bg-transparent focus:ring-0"
                  aria-label={t('wizard.assistant.helperPopover.prompt')}
                />
                <DifyButton
                  type="button"
                  variant="primary"
                  size="medium"
                  aria-label={t('wizard.assistant.helperPopover.send')}
                  title={t('wizard.assistant.helperPopover.send')}
                  disabled={
                    !assistantHelperDraft?.text.trim() ||
                    assistant.blocked ||
                    (assistant.sendBlocked ?? assistant.blocked)
                  }
                  onClick={sendAssistantHelper}
                  className="pipeline-ai-composer-send w-8 shrink-0 px-0"
                >
                  <span className="i-ri-send-plane-2-fill size-4" aria-hidden="true" />
                </DifyButton>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    ) : null

  // Inline Add Relation workflow state
  const [isAddingRelation, setIsAddingRelation] = React.useState(false)
  const [newRelType, setNewRelType] = React.useState<'sub_array' | 'sub_doc' | 'flatten'>(
    'sub_array',
  )
  const [newRelSource, setNewRelSource] = React.useState('')
  const [newRelTable, setNewRelTable] = React.useState('')
  const [newRelKey, setNewRelKey] = React.useState('')
  const [newRelParentKey, setNewRelParentKey] = React.useState('')
  const [newRelTargetField, setNewRelTargetField] = React.useState('')

  // Inline Add Sub-relation workflow state
  const [activeAddChildForRelId, setActiveAddChildForRelId] = React.useState<string | null>(null)
  const [newChildType, setNewChildType] = React.useState<'sub_array' | 'sub_doc' | 'flatten'>(
    'sub_array',
  )
  const [newChildSource, setNewChildSource] = React.useState('')
  const [newChildTable, setNewChildTable] = React.useState('')
  const [newChildKey, setNewChildKey] = React.useState('')
  const [newChildParentKey, setNewChildParentKey] = React.useState('')
  const [newChildTargetField, setNewChildTargetField] = React.useState('')

  const isRootConfigured = Boolean(rootConfig)

  const scratchAvailableTables = React.useMemo(() => {
    const src = AVAILABLE_DATA_SOURCES.find((s) => s.name === scratchSelectedSource)
    return src?.tables || []
  }, [scratchSelectedSource, AVAILABLE_DATA_SOURCES])

  const getTablesForSource = (sourceName: string) => {
    const s = AVAILABLE_DATA_SOURCES.find((d) => d.name === sourceName)
    return s?.tables || []
  }

  const flattenRelations = (nodes: RelationNode[]): RelationNode[] =>
    nodes.flatMap((r) => [r, ...flattenRelations(r.children || [])])
  const availableUnionInputs = React.useMemo(() => {
    const selectedSources = new Set([
      ...(rootConfig ? [rootConfig.source] : []),
      ...flattenRelations(relations).map((relation) => relation.source),
    ])
    return AVAILABLE_DATA_SOURCES.filter(
      (source) => !source.sink && selectedSources.has(source.id),
    ).flatMap((source) =>
      source.tables.map((table) => ({
        reference: `${source.id}.${table.name}`,
        label: `${source.name} · ${table.name}`,
      })),
    )
  }, [AVAILABLE_DATA_SOURCES, rootConfig, relations])
  const unionInputsFor = (
    sourceNameOrId: string,
    tableName: string,
    additionalExcluded: string[] = [],
  ) => {
    const sourceId =
      AVAILABLE_DATA_SOURCES.find(
        (source) => source.id === sourceNameOrId || source.name === sourceNameOrId,
      )?.id || sourceNameOrId
    const excluded = new Set([`${sourceId}.${tableName}`, ...additionalExcluded])
    return availableUnionInputs.filter((input) => !excluded.has(input.reference))
  }
  const pipelineUnionInputs = React.useMemo(() => {
    const sourceTable = (sourceNameOrId: string, tableName: string) => {
      const sourceId =
        AVAILABLE_DATA_SOURCES.find(
          (source) => source.id === sourceNameOrId || source.name === sourceNameOrId,
        )?.id || sourceNameOrId
      return `${sourceId}.${tableName}`
    }
    return [
      ...(rootConfig ? [sourceTable(rootConfig.source, rootConfig.table)] : []),
      ...flattenRelations(relations).map((relation) =>
        sourceTable(relation.source, relation.table),
      ),
    ]
  }, [AVAILABLE_DATA_SOURCES, rootConfig, relations])

  const tableToken = (r: RelationNode) => r.table + ' · ' + r.id
  const getColumnsForTable = (sourceName?: string, tableName?: string): string[] => {
    const entity = flattenRelations(relations).find((r) => tableToken(r) === tableName)
    const source = entity?.source || sourceName
    const table = entity?.table || tableName
    return (
      AVAILABLE_DATA_SOURCES.find(
        (ds) => (!source || ds.name === source) && ds.tables.some((t) => t.name === table),
      )?.tables.find((t) => t.name === table)?.columns || []
    )
  }
  const getAvailableJoinTables = (id?: string) => {
    const current = flattenRelations(relations).find((r) => r.id === id)
    const excluded = new Set(current ? flattenRelations([current]).map((r) => r.id) : [])
    return {
      pipelineTables: [
        rootConfig?.table || '',
        ...flattenRelations(relations)
          .filter((r) => !excluded.has(r.id))
          .map(tableToken),
      ].filter(Boolean),
      otherTables: [] as string[],
    }
  }
  const tablePickerOptionsForSource = (sourceNameOrId: string) => {
    const source = AVAILABLE_DATA_SOURCES.find(
      (candidate) => candidate.name === sourceNameOrId || candidate.id === sourceNameOrId,
    )
    return tablePickerOptionsBySource.get(source?.name ?? sourceNameOrId) ?? []
  }
  const findTableMeta = (sourceNameOrId: string, tableName: string) => {
    const source = AVAILABLE_DATA_SOURCES.find(
      (candidate) => candidate.name === sourceNameOrId || candidate.id === sourceNameOrId,
    )
    return source?.tables.find((table) => table.name === tableName)
  }
  const relationFieldTable = (sourceNameOrId: string, tableName: string): RelationFieldTable => {
    const sourceName =
      AVAILABLE_DATA_SOURCES.find(
        (source) => source.name === sourceNameOrId || source.id === sourceNameOrId,
      )?.name || sourceNameOrId
    if (rootConfig?.table === tableName && (!sourceName || rootConfig.source === sourceName)) {
      return {
        name: rootConfig.table,
        columns: rootConfig.columns,
        primaryKey: rootConfig.primaryKey,
        keys: rootConfig.keys,
        defaultKey: rootConfig.primaryKey,
      }
    }

    const candidates = flattenRelations(relations)
    const relation =
      candidates.find(
        (candidate) =>
          tableToken(candidate) === tableName && (!sourceName || candidate.source === sourceName),
      ) ||
      (sourceName
        ? candidates.find(
            (candidate) => candidate.table === tableName && candidate.source === sourceName,
          )
        : candidates.find((candidate) => candidate.table === tableName))
    if (relation) {
      return (
        findTableMeta(relation.source, relation.table) ?? {
          name: relation.table,
          columns: getColumnsForTable(relation.source, relation.table),
          primaryKey: relation.primaryKey?.[0] ?? relation.key,
          keys: relation.primaryKey,
        }
      )
    }

    return (
      findTableMeta(sourceNameOrId, tableName) ?? {
        name: tableName,
        columns: getColumnsForTable(sourceNameOrId, tableName),
      }
    )
  }

  const getConditions = React.useCallback(
    (rel: RelationNode): JoinCondition[] => {
      if (!rel.conditions || rel.conditions.length === 0) {
        return [
          {
            childKey: rel.key || 'id',
            parentTable: rel.parentTable || rootConfig?.table || 'root',
            parentKey: rel.parentKey || 'id',
            operator: '=',
          },
        ]
      }
      return rel.conditions.map((c) => ({
        ...c,
        parentTable: c.parentTable || rel.parentTable || rootConfig?.table || 'root',
        operator: c.operator || '=',
      }))
    },
    [rootConfig?.table],
  )

  const updateRelation = (id: string, updater: (r: RelationNode) => RelationNode) => {
    setRelations((previous) => {
      const before = flattenRelations(previous).find((r) => r.id === id)
      if (!before) return previous
      let after = updater(before)
      if (before.source !== after.source || before.table !== after.table) {
        const meta = getTablesForSource(after.source).find((t) => t.name === after.table)
        const previousConditions = getConditions(before)
        const parentTable =
          previousConditions[0]?.parentTable || before.parentTable || rootConfig?.table || ''
        const parentMeta = relationFieldTable('', parentTable)
        const match =
          meta && previousConditions.length === 1 ? matchRelationFields(meta, parentMeta) : null
        const fallbackChildKey =
          (meta?.columns.includes(after.key) ? after.key : '') ||
          meta?.defaultKey ||
          meta?.primaryKey ||
          ''
        const parentColumns = new Set(parentMeta.columns)
        after = {
          ...after,
          ...relationKeysForTableChange(after.type, meta),
          key: match?.childField ?? fallbackChildKey,
          parentKey: match?.parentField ?? after.parentKey,
          conditions: previousConditions.map((condition) => {
            const childFieldIsValid = Boolean(meta?.columns.includes(condition.childKey))
            const parentFieldIsValid = parentColumns.has(condition.parentKey)
            return {
              ...condition,
              childKey:
                match?.childField ??
                (childFieldIsValid
                  ? condition.childKey
                  : previousConditions.length === 1
                    ? fallbackChildKey
                    : ''),
              parentKey:
                match?.parentField ??
                (parentFieldIsValid
                  ? condition.parentKey
                  : previousConditions.length === 1
                    ? after.parentKey
                    : ''),
            }
          }),
        }
      }
      const walk = (nodes: RelationNode[]): RelationNode[] =>
        nodes.map((r) => {
          const next = r.id === id ? after : r
          return {
            ...next,
            children: walk(next.children || []),
            parentTable:
              next.parentTable === tableToken(before) ? tableToken(after) : next.parentTable,
            conditions: next.conditions?.map((c) => ({
              ...c,
              parentTable: c.parentTable === tableToken(before) ? tableToken(after) : c.parentTable,
            })),
          }
        })
      return walk(previous)
    })
  }

  const updateRelationType = (id: string, type: RelationNode['type']) => {
    setActiveContext(id)
    updateRelation(id, (relation) => {
      const meta = getTablesForSource(relation.source).find(
        (table) => table.name === relation.table,
      )
      return {
        ...relation,
        type,
        arrayKey: relationKeysForTableChange(type, meta).arrayKey,
      }
    })
  }

  const handleAddCondition = (rel: RelationNode) => {
    const conds = [...getConditions(rel)]
    const childCols = getColumnsForTable(rel.source, rel.table)
    const targetParentTable = rel.parentTable || rootConfig?.table || 'root'
    const parentCols = getColumnsForTable(undefined, targetParentTable)
    const nextChild =
      childCols.find((c) => !conds.some((cond) => cond.childKey === c)) || childCols[0] || 'id'
    const nextParent =
      parentCols.find((c) => !conds.some((cond) => cond.parentKey === c)) || parentCols[0] || 'id'
    conds.push({
      childKey: nextChild,
      parentTable: targetParentTable,
      parentKey: nextParent,
      operator: '=',
    })

    updateRelation(rel.id, (r) => ({
      ...r,
      conditions: conds,
      key: conds[0].childKey,
      parentTable: conds[0].parentTable || r.parentTable,
      parentKey: conds[0].parentKey,
    }))
  }

  const handleRemoveCondition = (rel: RelationNode, index: number) => {
    const conds = [...getConditions(rel)]
    if (conds.length > 1) {
      conds.splice(index, 1)
      updateRelation(rel.id, (r) => ({
        ...r,
        conditions: conds,
        key: conds[0].childKey,
        parentTable: conds[0].parentTable || r.parentTable,
        parentKey: conds[0].parentKey,
      }))
    }
  }

  const handleConditionChange = (
    rel: RelationNode,
    index: number,
    field: 'childKey' | 'parentTable' | 'parentKey' | 'operator',
    value: string,
  ) => {
    const conds = [...getConditions(rel)]
    if (field === 'parentTable') {
      const cols = getColumnsForTable(undefined, value)
      const childTable = findTableMeta(rel.source, rel.table)
      const match = childTable
        ? matchRelationFields(childTable, relationFieldTable('', value))
        : null
      const currentParentKey = conds[index].parentKey
      const newParentKey =
        match?.parentField ?? (cols.includes(currentParentKey) ? currentParentKey : cols[0] || '')
      const nextConditions = conds.map((condition, conditionIndex) => ({
        ...condition,
        parentTable: value,
        ...(conditionIndex === index && match ? { childKey: match.childField } : {}),
        parentKey:
          conditionIndex === index
            ? newParentKey
            : cols.includes(condition.parentKey)
              ? condition.parentKey
              : newParentKey,
      }))
      setRelations((prev) =>
        reparentRelation(prev, rel.id, value, rootConfig?.table || '', (r) => ({
          ...r,
          parentTable: value,
          parentKey: nextConditions[0].parentKey,
          conditions: nextConditions,
        })),
      )
      return
    } else {
      conds[index] = { ...conds[index], [field]: value }
    }
    updateRelation(rel.id, (r) => ({
      ...r,
      conditions: conds,
      key: conds[0].childKey,
      parentTable: conds[0].parentTable || r.parentTable,
      parentKey: conds[0].parentKey,
    }))
  }

  const startRootEdit = () => {
    if (rootConfig) {
      setScratchSelectedSource(rootConfig.source)
      setScratchSelectedTable(rootConfig.table)
    }
    setIsRootEditing(true)
  }

  const confirmRootTable = () => {
    const src = AVAILABLE_DATA_SOURCES.find((s) => s.name === scratchSelectedSource)
    const tbl = src?.tables.find((t) => t.name === scratchSelectedTable)
    if (!tbl) return

    setRootConfig({
      source: scratchSelectedSource,
      table: tbl.name,
      primaryKey: tbl.primaryKey,
      rowCount: tbl.rowCount,
      columns: tbl.columns,
      keys: tbl.keys,
      transforms: rootConfig?.transforms || [],
    })
    setIsRootEditing(false)
    if (rootConfig && rootConfig.table !== tbl.name) {
      const oldTable = rootConfig.table
      const update = (nodes: RelationNode[]): RelationNode[] =>
        nodes.map((r) => ({
          ...r,
          parentTable: r.parentTable === oldTable ? tbl.name : r.parentTable,
          conditions: r.conditions?.map((c) =>
            c.parentTable === oldTable
              ? {
                  ...c,
                  parentTable: tbl.name,
                  parentKey: tbl.columns.includes(c.parentKey) ? c.parentKey : '',
                }
              : c,
          ),
          children: update(r.children || []),
        }))
      setRelations(update)
    }
    setActiveContext('root')
  }

  const quickPickRoot = (sourceName: string, tableName: string) => {
    setScratchSelectedSource(sourceName)
    setScratchSelectedTable(tableName)
  }

  // Add Relation
  const openInlineAddRelation = () => {
    setNewRelType('sub_array')
    setNewRelSource(rootConfig?.source || '')
    setNewRelTable('')
    setNewRelKey('')
    setNewRelParentKey(rootConfig?.primaryKey || '')
    setNewRelTargetField('')
    setIsAddingRelation(true)
  }

  const handleNewRelTableSelect = (tableName: string, sourceName = newRelSource) => {
    setNewRelTable(tableName)
    const tbl = getTablesForSource(sourceName).find((t) => t.name === tableName)
    if (tbl) {
      const parentColumns = rootConfig?.columns || []
      const match = rootConfig
        ? matchRelationFields(tbl, relationFieldTable('', rootConfig.table))
        : null
      const preferredParentKey = tbl.defaultParentKey
      const defaultParentKey =
        (preferredParentKey && parentColumns.includes(preferredParentKey)
          ? preferredParentKey
          : '') ||
        rootConfig?.keys?.find((key) => parentColumns.includes(key)) ||
        parentColumns[0] ||
        ''
      setNewRelKey((match?.childField ?? tbl.defaultKey ?? tbl.primaryKey) || tbl.columns[0] || '')
      setNewRelParentKey(match?.parentField ?? defaultParentKey)
      setNewRelTargetField(tbl.name.split('.').pop() || 'items')
    }
  }

  const confirmAddRelation = () => {
    if (!newRelSource || !newRelTable || !newRelKey || !newRelParentKey) return
    const finalTarget = newRelTargetField.trim() || newRelTable.split('.').pop() || 'relation'
    const newRel: RelationNode = {
      id: crypto.randomUUID(),
      type: newRelType,
      source: newRelSource,
      table: newRelTable,
      key: newRelKey,
      primaryKey: relationTableKeys(
        getTablesForSource(newRelSource).find((t) => t.name === newRelTable),
      ),
      arrayKey:
        newRelType === 'sub_array'
          ? relationTableKeys(getTablesForSource(newRelSource).find((t) => t.name === newRelTable))
          : [],
      parentTable: rootConfig?.table || 'root',
      parentKey: newRelParentKey,
      conditions: [{ childKey: newRelKey, parentKey: newRelParentKey, operator: '=' }],
      targetField: finalTarget,
      preProcessing: [],
      isConditionOpen: false,
      isPreProcessOpen: false,
    }

    setRelations([...relations, newRel])
    setActiveContext(newRel.id)
    setIsAddingRelation(false)
  }

  const removeRelation = (id: string) => {
    const removed = flattenRelations(relations).find((relation) => relation.id === id)
    if (removed && flattenRelations([removed]).some((relation) => relation.id === activeContext)) {
      setActiveContext('root')
    }
    const remove = (nodes: RelationNode[]): RelationNode[] =>
      nodes.filter((r) => r.id !== id).map((r) => ({ ...r, children: remove(r.children || []) }))
    setRelations(remove)
  }

  // Sub-relations
  const openAddChildRelation = (parentRel: RelationNode) => {
    setActiveAddChildForRelId(parentRel.id)
    setNewChildType('sub_array')
    setNewChildSource(parentRel.source)
    setNewChildTable('')
    setNewChildKey('')
    setNewChildTargetField('')
    setNewChildParentKey(parentRel.primaryKey?.[0] || '')
  }

  const handleNewChildTableSelect = (
    tableName: string,
    sourceName = newChildSource,
    parentRelationId = activeAddChildForRelId,
  ) => {
    setNewChildTable(tableName)
    const tbl = getTablesForSource(sourceName).find((t) => t.name === tableName)
    if (tbl) {
      const parentRelation = flattenRelations(relations).find(
        (relation) => relation.id === parentRelationId,
      )
      const parentMeta = parentRelation
        ? relationFieldTable(parentRelation.source, parentRelation.table)
        : undefined
      const match = parentMeta ? matchRelationFields(tbl, parentMeta) : null
      setNewChildKey(
        (match?.childField ?? tbl.defaultKey ?? tbl.primaryKey) || tbl.columns[0] || '',
      )
      setNewChildParentKey(
        match?.parentField ?? parentRelation?.primaryKey?.[0] ?? parentRelation?.key ?? '',
      )
      setNewChildTargetField(tbl.name.split('.').pop() || 'items')
    }
  }

  const confirmAddChildRelation = (parentRelId: string) => {
    if (!newChildSource || !newChildTable || !newChildKey || !newChildParentKey) return
    const parentRel = flattenRelations(relations).find((r) => r.id === parentRelId)
    const targetParentTable = parentRel ? tableToken(parentRel) : rootConfig?.table || 'root'
    const finalTarget = newChildTargetField.trim() || newChildTable.split('.').pop() || 'items'
    const newChild: RelationNode = {
      id: crypto.randomUUID(),
      type: newChildType,
      source: newChildSource,
      table: newChildTable,
      key: newChildKey,
      primaryKey: relationTableKeys(
        getTablesForSource(newChildSource).find((t) => t.name === newChildTable),
      ),
      arrayKey:
        newChildType === 'sub_array'
          ? relationTableKeys(
              getTablesForSource(newChildSource).find((t) => t.name === newChildTable),
            )
          : [],
      parentTable: targetParentTable,
      parentKey: newChildParentKey,
      conditions: [
        {
          childKey: newChildKey,
          parentTable: targetParentTable,
          parentKey: newChildParentKey,
          operator: '=',
        },
      ],
      targetField: finalTarget,
      isConditionOpen: false,
      isPreProcessOpen: false,
      preProcessing: [],
    }

    updateRelation(parentRelId, (r) => ({ ...r, children: [...(r.children || []), newChild] }))
    setActiveContext(newChild.id)
    setActiveAddChildForRelId(null)
  }

  const relationChain = React.useMemo(() => {
    const find = (nodes: RelationNode[], parents: RelationNode[]): RelationNode[] | null => {
      for (const relation of nodes) {
        const chain = [...parents, relation]
        if (relation.id === activeContext) return chain
        const child = find(relation.children || [], chain)
        if (child) return child
      }
      return null
    }
    return find(relations, []) || []
  }, [activeContext, relations])

  const activeContextLabel = React.useMemo(() => {
    if (activeContext === 'root') {
      return t('wizard.previewPanel.rootContext', { table: rootConfig?.table || '' })
    }
    if (activeContext === 'doc_process') return t('wizard.previewPanel.transformsContext')
    if (activeContext === 'destination') return t('wizard.destinationContext')
    const relation = relationChain[relationChain.length - 1]
    if (relation) {
      return t('wizard.previewPanel.relationContext', {
        path: relationChain
          .map((item) => item.targetField)
          .filter(Boolean)
          .join('.'),
      })
    }
    return t('wizard.previewPanel.documentContext')
  }, [activeContext, relationChain, rootConfig?.table, t])

  const compiledPlanJson = compiledSpec
  const logicalPreview =
    previewProjection === 'logical' && livePreview?.logicalDocuments !== undefined
  const documents = (logicalPreview ? livePreview.logicalDocuments : livePreview?.documents) || []
  const selectedIndex = Math.min(selectedDocumentIndex, Math.max(0, documents.length - 1))
  const selectedDocument = documents[selectedIndex] || null
  const rootFields = new Set(rootConfig?.columns || [])
  const relationFields = new Set<string>()
  const collectRelationFields = (nodes: RelationNode[]) => {
    for (const relation of nodes) {
      if (relation.type === 'flatten') {
        getColumnsForTable(relation.source, relation.table).forEach((field) =>
          relationFields.add(field),
        )
      } else if (relation.targetField) {
        relationFields.add(relation.targetField)
      }
      collectRelationFields(relation.children || [])
    }
  }
  collectRelationFields(relations)

  const pointerSegment = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1')
  const previewContexts = livePreview?.contexts || []
  const computedFields = new Set(
    previewContexts
      .filter((context) => context.kind === 'transform' && Array.isArray(context.effects))
      .flatMap((context) => (context.effects as unknown[]).filter(isObjectRecord))
      .filter((effect) => effect.kind !== 'removed' && typeof effect.pointer === 'string')
      .map(
        (effect) =>
          (effect.pointer as string)
            .split('/')
            .filter(Boolean)
            .at(-1)
            ?.replace(/~1/g, '/')
            .replace(/~0/g, '~') || '',
      ),
  )
  const pointerPatterns = (context: Record<string, unknown> | undefined) =>
    Array.isArray(context?.pointerPatterns)
      ? context.pointerPatterns.filter((pointer): pointer is string => typeof pointer === 'string')
      : []
  const focusPaths = React.useMemo(() => {
    if (activeContext === 'root') {
      const reported = pointerPatterns(previewContexts.find((context) => context.id === 'root'))
      if (reported.length > 0) return reported
      // Root provenance is implicit in the server context. Keep relations and computed fields separate.
      return Object.keys(selectedDocument || {})
        .filter((field) => !relationFields.has(field) && !computedFields.has(field))
        .map((field) => `/${pointerSegment(field)}`)
    }
    if (activeContext !== 'doc_process') {
      const activeRelation = relationChain.at(-1)
      const activePath = relationChain
        .filter((relation) => relation.type !== 'flatten')
        .map((relation) => relation.targetField)
        .filter(Boolean)
        .join('/')
      const parentPath = relationChain
        .slice(0, -1)
        .filter((relation) => relation.type !== 'flatten')
        .map((relation) => relation.targetField)
        .filter(Boolean)
        .join('/')
      const matching = previewContexts.filter(
        (context) =>
          context.kind === 'relation' &&
          (activeRelation?.type === 'flatten'
            ? context.shape === 'flat' && context.parentPath === parentPath
            : context.path === activePath),
      )
      const serverPaths = matching.flatMap((context) => pointerPatterns(context))
      if (serverPaths.length > 0) return [...new Set(serverPaths)]

      // Flatten has no embedded path; use the returned root output fields for its local slice.
      if (activeRelation?.type === 'flatten') {
        const flattenOwners = new Map<string, number>()
        const countFlattenFields = (nodes: RelationNode[]) => {
          nodes.forEach((node) => {
            if (node.type === 'flatten') {
              getColumnsForTable(node.source, node.table).forEach((field) =>
                flattenOwners.set(field, (flattenOwners.get(field) || 0) + 1),
              )
            }
            countFlattenFields(node.children || [])
          })
        }
        countFlattenFields(relations)
        return getColumnsForTable(activeRelation.source, activeRelation.table)
          .filter(
            (field) =>
              field in (selectedDocument || {}) &&
              !rootFields.has(field) &&
              flattenOwners.get(field) === 1,
          )
          .map((field) => `/${pointerSegment(field)}`)
      }
      return activePath ? [`/${activePath.split('/').map(pointerSegment).join('/')}`] : []
    }
    return [
      ...new Set(
        previewContexts
          .filter((context) => context.kind === 'transform')
          .flatMap((context) => pointerPatterns(context)),
      ),
    ]
  }, [
    activeContext,
    pointerSegment,
    pointerPatterns,
    previewContexts,
    relationFields,
    relationChain,
    relations,
    rootFields,
    selectedDocument,
    computedFields,
  ])

  const transformTrace = React.useMemo(() => {
    if (activeContext !== 'doc_process') return null
    const effects = previewContexts.flatMap((context) =>
      context.kind === 'transform' && Array.isArray(context.effects)
        ? context.effects.filter(isObjectRecord)
        : [],
    )
    const annotations = effects
      .map((effect) => effect.annotation)
      .filter((annotation): annotation is string => typeof annotation === 'string')
    const unknownOrigins = previewContexts
      .filter((context) => context.kind === 'transform' && context.origin === 'unknown')
      .map((context) => context.stepId)
      .filter((stepId): stepId is string => typeof stepId === 'string')
    const fields = [
      ...new Set(
        effects
          .map((effect) => effect.pointer)
          .filter((pointer): pointer is string => typeof pointer === 'string')
          .map(
            (pointer) =>
              pointer.split('/').filter(Boolean).at(-1)?.replace(/~1/g, '/').replace(/~0/g, '~') ||
              '',
          ),
      ),
    ]
    const types = [
      ...new Set(
        previewContexts
          .filter((context) => context.kind === 'transform')
          .map((context) => context.type)
          .filter((type): type is string => typeof type === 'string'),
      ),
    ]
    if (effects.length === 0 && unknownOrigins.length === 0) return null
    return { type: types.join(', '), annotations, fields, unknownOrigins }
  }, [activeContext, previewContexts])

  const previewTableColumns = Array.from(
    new Set(documents.flatMap((document) => Object.keys(document))),
  ).slice(0, 32)
  const isExtendedJsonScalar = (value: unknown) =>
    isObjectRecord(value) &&
    Object.keys(value).length === 1 &&
    [
      '$binary',
      '$date',
      '$maxKey',
      '$minKey',
      '$numberDecimal',
      '$numberDouble',
      '$numberInt',
      '$numberLong',
      '$oid',
      '$regularExpression',
      '$timestamp',
      '$undefined',
      '$uuid',
    ].some((key) => key in value)

  const displayScalar = (value: unknown, quoteStrings = true): string => {
    if (isObjectRecord(value) && isExtendedJsonScalar(value)) {
      for (const key of ['$numberLong', '$numberInt', '$numberDouble', '$numberDecimal']) {
        const numeric = value[key]
        if (typeof numeric === 'string' && /^-?(?:\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(numeric))
          return numeric
      }
      for (const key of ['$oid', '$uuid', '$date']) {
        const text = value[key]
        if (typeof text === 'string') return quoteStrings ? JSON.stringify(text) : text
      }
    }
    return JSON.stringify(value)
  }

  const focusContains = (path: string) => {
    if (/\/\d+$/.test(path)) return false
    const segments = path
      .split('/')
      .filter(Boolean)
      .filter((segment) => !/^\d+$/.test(segment))
    return focusPaths.some((focused) => {
      const expected = focused
        .split('/')
        .filter(Boolean)
        .filter((segment) => segment !== '*')
      return (
        segments.length === expected.length &&
        segments.every((segment, index) => segment === expected[index])
      )
    })
  }

  const tableFieldFocused = (field: string) => {
    const path = `/${pointerSegment(field)}`
    return focusContains(path) || focusPaths.some((focused) => focused.startsWith(`${path}/`))
  }

  const focusClass =
    activeContext === 'doc_process'
      ? 'border-emerald-200 bg-emerald-50/70'
      : relationChain.length > 1
        ? 'border-purple-200 bg-purple-50/70'
        : 'border-blue-200 bg-blue-50/70'

  const renderJsonEntries = (
    entries: Array<[string, unknown]>,
    parentPath: string,
    depth: number,
    array: boolean,
  ): React.ReactNode => {
    const groups: Array<{ focused: boolean; items: Array<[string, unknown, number]> }> = []
    entries.forEach(([field, child], index) => {
      const childPath = `${parentPath}/${pointerSegment(field)}`
      const focused = focusContains(childPath)
      const last = groups.at(-1)
      if (last?.focused === focused && focused) last.items.push([field, child, index])
      else groups.push({ focused, items: [[field, child, index]] })
    })
    return groups.map((group) => {
      const firstPath = `${parentPath}/${pointerSegment(group.items[0][0])}`
      const children = group.items.map(([field, child, index]) => {
        const childPath = `${parentPath}/${pointerSegment(field)}`
        return (
          <React.Fragment key={childPath}>
            {renderJsonValue(
              child,
              childPath,
              depth + 1,
              array ? undefined : field,
              index < entries.length - 1,
              group.focused,
            )}
          </React.Fragment>
        )
      })
      if (!group.focused) return <React.Fragment key={firstPath}>{children}</React.Fragment>
      return (
        <div
          key={firstPath}
          data-preview-path={firstPath}
          data-preview-paths={group.items
            .map(([field]) => `${parentPath}/${pointerSegment(field)}`)
            .join(',')}
          data-preview-focused="true"
          className={cn('rounded-lg border px-1 py-0.5', focusClass)}
        >
          {children}
        </div>
      )
    })
  }

  const renderJsonValue = (
    value: unknown,
    path: string,
    depth = 0,
    label?: string,
    comma = false,
    grouped = false,
  ): React.ReactNode => {
    const highlighted = focusContains(path)
    const highlightClass = highlighted && !grouped ? focusClass : ''
    const rowClass = cn(
      'px-1 py-0.5',
      highlighted && !grouped && 'rounded-lg border',
      highlightClass,
    )
    const paddingLeft = `${depth * 16}px`
    const key =
      label === undefined ? null : (
        <>
          <span className={highlighted ? 'font-semibold text-blue-600' : 'text-blue-600'}>
            {JSON.stringify(label)}
          </span>
          <span className="text-gray-400">: </span>
        </>
      )
    const collapsed = collapsedJson.has(path)
    const complex = Array.isArray(value) || (isObjectRecord(value) && !isExtendedJsonScalar(value))
    if (!complex) {
      const scalar = displayScalar(value)
      return (
        <div
          data-preview-path={path}
          data-preview-focused={(highlighted && !grouped) || undefined}
          className={rowClass}
          style={{ paddingLeft }}
        >
          {key}
          <span
            className={
              typeof value === 'string' ||
              (isObjectRecord(value) && ('$oid' in value || '$uuid' in value || '$date' in value))
                ? 'text-emerald-700'
                : 'font-semibold text-blue-700'
            }
          >
            {scalar}
          </span>
          {comma && <span className="text-gray-400">,</span>}
        </div>
      )
    }
    const entries: Array<[string, unknown]> = Array.isArray(value)
      ? value.map((item, index) => [String(index), item])
      : Object.entries(value)
    const opening = Array.isArray(value) ? '[' : '{'
    const closing = Array.isArray(value) ? ']' : '}'
    return (
      <div
        data-preview-path={path}
        data-preview-focused={(highlighted && !grouped) || undefined}
        className={rowClass}
      >
        <div style={{ paddingLeft }}>
          {key}
          {entries.length > 0 && (
            <button
              type="button"
              className="mr-1 rounded px-0.5 text-gray-400 hover:bg-gray-100"
              aria-label={t(
                collapsed ? 'wizard.previewPanel.expand' : 'wizard.previewPanel.collapse',
              )}
              onClick={() =>
                setCollapsedJson((current) => {
                  const next = new Set(current)
                  if (next.has(path)) next.delete(path)
                  else next.add(path)
                  return next
                })
              }
            >
              {collapsed ? '▸' : '▾'}
            </button>
          )}
          <span className="text-gray-400">{opening}</span>
          {collapsed && <span className="text-gray-500">{entries.length} entries</span>}
        </div>
        {!collapsed && renderJsonEntries(entries, path, depth, Array.isArray(value))}
        {!collapsed && entries.length > 0 && (
          <div style={{ paddingLeft }} className="text-gray-400">
            {closing}
            {comma && ','}
          </div>
        )}
        {(collapsed || entries.length === 0) && (
          <span className="text-gray-400">
            {closing}
            {comma && ','}
          </span>
        )}
      </div>
    )
  }

  const [collapsedJson, setCollapsedJson] = React.useState<Set<string>>(() => new Set())
  const copyExecutionSpec = async () => {
    if (!livePreview) return
    try {
      await navigator.clipboard.writeText(compiledPlanJson)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current)
    copyResetTimer.current = window.setTimeout(() => setCopyStatus('idle'), 1600)
  }
  React.useEffect(
    () => () => {
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current)
    },
    [],
  )

  const renderRelation = (rel: RelationNode, nested = false): React.ReactNode => (
    <div key={rel.id} className="relative">
      {/* Exact branch connector from left dashed guide to this card */}
      <div
        className={
          nested
            ? 'absolute top-5 -left-4 w-4 border-b border-dashed border-purple-300'
            : 'absolute top-5 -left-6 w-6 border-b border-dashed border-gray-300'
        }
      />

      {/* Relation Card */}
      <div
        id={!nested && rel.id === relations[0]?.id ? 'step-first-relation' : undefined}
        data-guide-active={
          !nested && rel.id === relations[0]?.id && activeGuideTarget === 'step-first-relation'
            ? true
            : undefined
        }
        onClick={(event) => {
          event.stopPropagation()
          setActiveContext(rel.id)
        }}
        className={cn(
          'wizard-reference-relation-radius cursor-pointer border transition-all duration-150',
          nested ? 'bg-gray-50/80 p-3.5 shadow-2xs hover:bg-white' : 'bg-white p-4 shadow-xs',
          !nested && rel.id === relations[0]?.id && activeGuideTarget === 'step-first-relation'
            ? 'border-indigo-500 bg-gradient-to-b from-indigo-50/15 to-white shadow-md ring-2 ring-indigo-500/40'
            : activeContext === rel.id
              ? nested
                ? 'border-purple-500 bg-white ring-1 ring-purple-500/20'
                : 'border-blue-500 ring-1 ring-blue-500/20'
              : 'border-gray-200 hover:border-gray-300',
        )}
      >
        {/* Card Header (2-row title on the left, actions on the right) */}
        <div className="flex items-start justify-between gap-3">
          {/* Left side: 2 rows */}
          <div className="min-w-0 space-y-1.5">
            {/* Row 1: Document/Array/Flatten Segmented Toggle + Table Name + as path */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented Type Toggle */}
              <div className="inline-flex shrink-0 items-center rounded-lg border border-gray-200/90 bg-gray-100 p-0.5 text-[10px] font-medium">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateRelationType(rel.id, 'sub_doc')
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 transition-all',
                    rel.type === 'sub_doc'
                      ? 'bg-white font-semibold text-indigo-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                  title="Embed as nested document object {}"
                >
                  <Braces className="h-2.5 w-2.5 text-indigo-600" />
                  <span>Document</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateRelationType(rel.id, 'sub_array')
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 transition-all',
                    rel.type === 'sub_array'
                      ? 'bg-white font-semibold text-purple-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                  title="Embed as array of documents []"
                >
                  <FolderTree className="h-2.5 w-2.5 text-purple-600" />
                  <span>Array</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateRelationType(rel.id, 'flatten')
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 transition-all',
                    rel.type === 'flatten'
                      ? 'bg-white font-semibold text-emerald-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                  title="Flatten fields directly into parent document"
                >
                  <Layers className="h-2.5 w-2.5 text-emerald-600" />
                  <span>Flatten</span>
                </button>
              </div>

              {/* Table Name + as path */}
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="flex items-center gap-1 font-mono text-[13px] font-semibold text-gray-900">
                  <span>{rel.table}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateRelation(rel.id, (r) => ({
                        ...r,
                        isTableEditing: !r.isTableEditing,
                      }))
                    }}
                    className="inline-flex cursor-pointer items-center gap-0.5 font-sans text-[10px] font-normal text-blue-600 hover:text-blue-800 hover:underline"
                    title="Switch table"
                  >
                    (edit)
                  </button>
                </h3>

                {rel.type !== 'flatten' ? (
                  <>
                    <span className="font-sans text-[11px] text-gray-400">as</span>
                    {!rel.isPathEditing ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          updateRelation(rel.id, (r) => ({ ...r, isPathEditing: true }))
                        }}
                        className="group/path inline-flex cursor-pointer items-center gap-1"
                        title="Click to rename field"
                      >
                        <code className="rounded-lg border border-gray-200/80 bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 transition-colors group-hover/path:bg-blue-50 group-hover/path:text-blue-700">
                          {rel.targetField}
                        </code>
                        <span className="text-[9px] text-gray-400 opacity-0 transition-opacity group-hover/path:text-blue-600 group-hover/path:opacity-100">
                          ✎
                        </span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          value={rel.targetField}
                          onChange={(e) =>
                            updateRelation(rel.id, (r) => ({
                              ...r,
                              targetField: e.target.value,
                            }))
                          }
                          onBlur={() =>
                            updateRelation(rel.id, (r) => ({
                              ...r,
                              isPathEditing: false,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateRelation(rel.id, (r) => ({
                                ...r,
                                isPathEditing: false,
                              }))
                            }
                          }}
                          autoFocus
                          className="w-24 rounded-lg border border-blue-400 bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-900 ring-1 ring-blue-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateRelation(rel.id, (r) => ({
                              ...r,
                              isPathEditing: false,
                            }))
                          }
                          className="cursor-pointer text-[10px] font-medium text-blue-600 hover:underline"
                        >
                          Done
                        </button>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-sans text-[10px] text-emerald-700">
                    (flatten into root)
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Source Name */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Database className="h-3 w-3 text-gray-400" />
              <span>Source:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateRelation(rel.id, (r) => ({
                    ...r,
                    isTableEditing: !r.isTableEditing,
                  }))
                }}
                className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-gray-700 hover:text-blue-600 hover:underline"
                title="Change source"
              >
                <span>{rel.source}</span>
                <span className="text-[8px] text-gray-400">▾</span>
              </button>
            </div>
          </div>

          {/* Right Card Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {assistantHelper(rel.id, 'clean')}
            {/* Switch Table Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateRelation(rel.id, (r) => ({
                  ...r,
                  isTableEditing: !r.isTableEditing,
                }))
              }}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Switch source or table"
            >
              <Database className="h-3 w-3 text-gray-500" />
              <span>{rel.isTableEditing ? 'Close' : 'Switch Table'}</span>
            </button>

            {/* Transforms toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateRelation(rel.id, (r) => ({
                  ...r,
                  isPreProcessOpen: !r.isPreProcessOpen,
                }))
              }}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors',
                rel.isPreProcessOpen
                  ? 'border-blue-300 bg-blue-50 font-medium text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
              title="Configure transforms for this relation"
            >
              <Workflow className="h-3 w-3 text-blue-600" />
              <span>Transforms</span>
              {(rel.transforms?.length || 0) + (rel.preProcessing?.length || 0) > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {rel.transforms?.length || rel.preProcessing?.length}
                </span>
              )}
            </button>

            {/* Delete Relation */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeRelation(rel.id)
              }}
              className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Remove relation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Modify Source & Table for Relation */}
        {rel.isTableEditing && (
          <div
            className="mt-3 space-y-2.5 rounded-lg border border-t border-blue-200/80 border-gray-100 bg-blue-50/40 p-3 pt-3 text-[12px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-900">
                <Database className="h-3.5 w-3.5 text-blue-600" /> Modify Source & Table
              </span>
              <button
                type="button"
                onClick={() => updateRelation(rel.id, (r) => ({ ...r, isTableEditing: false }))}
                className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">
                  Source Connection
                </label>
                <SearchablePicker
                  ariaLabel={t('wizard.relations.source')}
                  emptyLabel={t('wizard.search.noResults')}
                  openLabel={t('wizard.search.openOptions')}
                  options={sourcePickerOptions}
                  placeholder={t('wizard.search.sources')}
                  value={rel.source || ''}
                  onValueChange={(newSrc) => {
                    if (!newSrc) return
                    const tables = getTablesForSource(newSrc)
                    const firstTbl = tables[0]
                    updateRelation(rel.id, (r) => ({
                      ...r,
                      source: newSrc,
                      table: firstTbl?.name || '',
                      key: firstTbl?.defaultKey || 'id',
                      targetField: firstTbl?.name.split('.').pop() || 'items',
                    }))
                  }}
                  renderSelectedLeading={(option) => option?.icon}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">Table</label>
                <SearchablePicker
                  ariaLabel={t('wizard.relations.table')}
                  emptyLabel={t('wizard.search.noResults')}
                  inputClassName="font-mono"
                  openLabel={t('wizard.search.openOptions')}
                  options={tablePickerOptionsForSource(rel.source)}
                  placeholder={t('wizard.search.tables')}
                  value={rel.table || ''}
                  onValueChange={(newTbl) => {
                    if (!newTbl) return
                    const tblMeta = getTablesForSource(rel.source).find((t) => t.name === newTbl)
                    updateRelation(rel.id, (r) => ({
                      ...r,
                      table: newTbl,
                      key: tblMeta?.defaultKey || 'id',
                      parentKey: tblMeta?.defaultParentKey || 'id',
                      targetField: tblMeta?.name.split('.').pop() || 'items',
                    }))
                  }}
                  renderSelectedLeading={(option) => option?.icon}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">
                  Semantic Structure
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => updateRelationType(rel.id, 'sub_doc')}
                    className={cn(
                      'cursor-pointer rounded-lg border px-1 py-1 text-center text-[10px] transition-colors',
                      rel.type === 'sub_doc'
                        ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    Document
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRelationType(rel.id, 'sub_array')}
                    className={cn(
                      'cursor-pointer rounded-lg border px-1 py-1 text-center text-[10px] transition-colors',
                      rel.type === 'sub_array'
                        ? 'border-purple-300 bg-purple-50 font-medium text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    Array
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRelationType(rel.id, 'flatten')}
                    className={cn(
                      'cursor-pointer rounded-lg border px-1 py-1 text-center text-[10px] transition-colors',
                      rel.type === 'flatten'
                        ? 'border-emerald-300 bg-emerald-50 font-medium text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    Flatten
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">
                  Target Field in Output
                </label>
                <input
                  value={rel.targetField}
                  onChange={(e) =>
                    updateRelation(rel.id, (r) => ({
                      ...r,
                      targetField: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] text-gray-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Join Conditions Area (Multi-condition supported) */}
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
          {getConditions(rel).map((cond, cIdx) => (
            <div key={cIdx} className="flex flex-wrap items-center gap-2 text-[11px]">
              {cIdx > 0 && (
                <span className="rounded-lg border border-blue-200/80 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-blue-700 uppercase">
                  AND
                </span>
              )}

              <FieldAutocomplete
                ariaLabel={t('wizard.relations.childField')}
                className="min-w-0 flex-1"
                emptyLabel={t('wizard.search.noResults')}
                inputClassName="font-mono"
                openLabel={t('wizard.search.openOptions')}
                options={getColumnsForTable(rel.source, rel.table)}
                placeholder={t('wizard.search.fields')}
                value={cond.childKey}
                onValueChange={(field) => handleConditionChange(rel, cIdx, 'childKey', field)}
              />

              <span className="font-mono text-[13px] font-bold text-gray-400">=</span>

              <SearchablePicker
                ariaLabel={t('wizard.relations.parentTable')}
                className="min-w-0 flex-1"
                emptyLabel={t('wizard.search.noResults')}
                openLabel={t('wizard.search.openOptions')}
                options={getAvailableJoinTables(rel.id).pipelineTables.map((table) => ({
                  value: table,
                  label: table,
                  detail: table === rootConfig?.table ? t('wizard.relations.rootTable') : undefined,
                }))}
                placeholder={t('wizard.search.tables')}
                value={cond.parentTable || rel.parentTable}
                onValueChange={(table) => handleConditionChange(rel, cIdx, 'parentTable', table)}
              />
              <FieldAutocomplete
                ariaLabel={t('wizard.relations.parentField')}
                className="min-w-0 flex-1"
                emptyLabel={t('wizard.search.noResults')}
                inputClassName="font-mono"
                openLabel={t('wizard.search.openOptions')}
                options={getColumnsForTable(undefined, cond.parentTable || rel.parentTable)}
                placeholder={t('wizard.search.fields')}
                value={cond.parentKey}
                onValueChange={(field) => handleConditionChange(rel, cIdx, 'parentKey', field)}
              />

              {getConditions(rel).length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveCondition(rel, cIdx)
                  }}
                  className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Remove this condition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Join Actions: Add Condition & Validation Indicator */}
          <div className="flex items-center justify-between pt-0.5 text-[10px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleAddCondition(rel)
              }}
              className="inline-flex cursor-pointer items-center gap-1 py-0.5 font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>Add Join Condition</span>
            </button>

            <div className="flex items-center gap-2 text-gray-400">
              <span className="flex items-center gap-0.5 font-medium text-emerald-600">
                <Check className="h-2.5 w-2.5" />
                <span>Association configured</span>
              </span>
            </div>
          </div>
        </div>

        {/* Expanded Pre-processing / Transforms (Inline) */}
        {rel.isPreProcessOpen && (
          <div className="mt-3 border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
            <TableTransformsManager
              identityPlans={identityPlans}
              tableName={rel.table}
              sourceName={rel.source}
              columns={getColumnsForTable(rel.source, rel.table)}
              transforms={rel.transforms || []}
              availableUnionInputs={unionInputsFor(rel.source, rel.table)}
              onChange={(nextTransforms) =>
                updateRelation(rel.id, (r) => ({ ...r, transforms: nextTransforms }))
              }
            />
          </div>
        )}

        {/* ======================================================= */}
        {/* NESTED SUB-RELATIONS SECTION (支持添加多个、修改表、可编辑) */}
        {/* ======================================================= */}
        <div className="mt-3.5 border-t border-gray-100 pt-3">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
              <FolderTree className="h-4 w-4 text-purple-600" />
              <span>Nested Sub-Relations</span>
              <span className="text-[12px] font-normal text-gray-400">
                ({rel.children?.length || 0})
              </span>
            </div>

            {activeAddChildForRelId !== rel.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openAddChildRelation(rel)
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-200/90 bg-purple-50 px-2.5 py-1 text-[12px] font-medium text-purple-700 shadow-2xs transition-colors hover:bg-purple-100 hover:text-purple-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Sub-relation to {rel.table.split('.').pop()}</span>
              </button>
            )}
          </div>

          {/* Sub-relations Tree Guide Track (Delicate dashed purple spine) */}
          <div className="relative ml-2 space-y-3 border-l border-dashed border-purple-300 pl-4">
            {/* Dynamic Sub Nested Cards */}
            {(rel.children || []).map((child) => renderRelation(child, true))}

            {/* Inline Add Sub-relation Form Card (挂接在子导轨上) */}
            {activeAddChildForRelId === rel.id && (
              <div className="relative">
                <div className="absolute top-5 -left-4 w-4 border-b border-dashed border-purple-300" />
                <div className="animate-in fade-in zoom-in-95 rounded-xl border-2 border-purple-400 bg-white p-4 text-[12px] shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                      <Plus className="h-4 w-4 text-purple-600" />
                      <span>
                        Add Sub-relation to{' '}
                        <strong className="font-mono text-purple-700">{rel.table}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAddChildForRelId(null)}
                      className="cursor-pointer text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* 1. Semantic */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewChildType('sub_doc')}
                        className={cn(
                          'cursor-pointer rounded-lg border p-2 text-left text-[11px] transition-all',
                          newChildType === 'sub_doc'
                            ? 'border-indigo-500 bg-indigo-50/70 font-medium ring-1 ring-indigo-400'
                            : 'border-gray-200 bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
                          <Braces className="h-3.5 w-3.5" /> Sub Doc &#123; &#125;
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewChildType('sub_array')}
                        className={cn(
                          'cursor-pointer rounded-lg border p-2 text-left text-[11px] transition-all',
                          newChildType === 'sub_array'
                            ? 'border-purple-500 bg-purple-50/70 font-medium ring-1 ring-purple-400'
                            : 'border-gray-200 bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-purple-700">
                          <FolderTree className="h-3.5 w-3.5" /> Sub Array [ ]
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewChildType('flatten')}
                        className={cn(
                          'cursor-pointer rounded-lg border p-2 text-left text-[11px] transition-all',
                          newChildType === 'flatten'
                            ? 'border-emerald-500 bg-emerald-50/70 font-medium ring-1 ring-emerald-400'
                            : 'border-gray-200 bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                          <Layers className="h-3.5 w-3.5" /> Flatten
                        </div>
                      </button>
                    </div>

                    {/* 2. Source & Table */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-600">
                          Source
                        </label>
                        <SearchablePicker
                          ariaLabel={t('wizard.relations.source')}
                          emptyLabel={t('wizard.search.noResults')}
                          openLabel={t('wizard.search.openOptions')}
                          options={sourcePickerOptions}
                          placeholder={t('wizard.search.sources')}
                          value={newChildSource}
                          onValueChange={(value) => {
                            if (!value) return
                            setNewChildSource(value)
                            const tables = getTablesForSource(value)
                            if (tables[0]) handleNewChildTableSelect(tables[0].name, value, rel.id)
                            else setNewChildTable('')
                          }}
                          renderSelectedLeading={(option) => option?.icon}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-600">
                          Child Table
                        </label>
                        <SearchablePicker
                          ariaLabel={t('wizard.relations.table')}
                          emptyLabel={t('wizard.search.noResults')}
                          inputClassName="font-mono"
                          openLabel={t('wizard.search.openOptions')}
                          options={tablePickerOptionsForSource(newChildSource)}
                          placeholder={t('wizard.search.tables')}
                          value={newChildTable}
                          onValueChange={(value) =>
                            value && handleNewChildTableSelect(value, newChildSource, rel.id)
                          }
                          renderSelectedLeading={(option) => option?.icon}
                        />
                      </div>
                    </div>

                    {/* 3. Join Condition */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        Join Condition
                      </label>
                      <div className="flex min-w-0 items-center gap-2 text-[12px]">
                        <span className="font-mono font-medium text-gray-600">
                          {newChildTable.split('.').pop()}.
                        </span>
                        <FieldAutocomplete
                          ariaLabel={t('wizard.relations.childField')}
                          className="min-w-0 flex-1"
                          emptyLabel={t('wizard.search.noResults')}
                          inputClassName="font-mono"
                          openLabel={t('wizard.search.openOptions')}
                          options={
                            getTablesForSource(newChildSource).find(
                              (table) => table.name === newChildTable,
                            )?.columns ?? []
                          }
                          placeholder={t('wizard.search.fields')}
                          value={newChildKey}
                          onValueChange={setNewChildKey}
                        />
                        <span className="font-bold text-gray-400">=</span>
                        <span className="font-mono font-medium text-gray-600">
                          {rel.table.split('.').pop()}.
                        </span>
                        <FieldAutocomplete
                          ariaLabel={t('wizard.relations.parentField')}
                          className="min-w-0 flex-1"
                          emptyLabel={t('wizard.search.noResults')}
                          inputClassName="font-mono"
                          openLabel={t('wizard.search.openOptions')}
                          options={getColumnsForTable(rel.source, rel.table)}
                          placeholder={t('wizard.search.fields')}
                          value={newChildParentKey}
                          onValueChange={setNewChildParentKey}
                        />
                      </div>
                    </div>

                    {/* 4. Target Field */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        Target Field in Document
                      </label>
                      <input
                        value={newChildTargetField}
                        onChange={(e) => setNewChildTargetField(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveAddChildForRelId(null)}
                        className="cursor-pointer px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmAddChildRelation(rel.id)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-2xs hover:bg-purple-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Embed Sub-relation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="wizard-reference flex h-full w-full flex-col overflow-hidden font-sans text-gray-900">
      {showWorkbenchHeader && (
        <>
          <header
            className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-gray-200/80 bg-white/80 px-4 saturate-150 backdrop-blur-md"
            data-testid="wizard-workbench-header"
          >
            <button
              type="button"
              onClick={() => void inspectPlan()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <FileCode className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              {t('wizard.inspectPlan')}
            </button>
            {!readOnly && onStart && (
              <button
                type="button"
                onClick={onStart}
                disabled={startBusy}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                {startBusy ? t('wizard.starting') : t('wizard.startPipeline')}
              </button>
            )}
          </header>
          {actionError && (
            <p
              className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700"
              role="alert"
            >
              {actionError}
            </p>
          )}
        </>
      )}
      {/* Main Workspace Split */}
      <div className="wizard-reference-workspace flex min-h-0 flex-1 overflow-hidden">
        {/* Left / Center Canvas */}
        <div className="wizard-reference-editor-column">
          {notices ? <div className="wizard-reference-notices">{notices}</div> : null}
          <main
            id="wizard-canvas-main"
            className="wizard-reference-canvas flex min-w-0 flex-1 flex-col overflow-y-auto"
            data-testid="wizard-editor-controls"
            data-read-only={readOnly ? 'true' : 'false'}
          >
            <div className="mx-auto w-full max-w-[720px] min-w-0 pb-24">
              {/* ================================================================= */}
              {/* STEP 1: ROOT TABLE (主表锚点 - 卡片原生就地配置，前后形态统一) */}
              {/* ================================================================= */}
              {activeGuideTarget === 'step-root-table' && renderGuideStep?.(0)}
              <ReadOnlyFieldset
                disabled={readOnly}
                label={readOnlyLabel ?? t('pipelines.workspace.readOnly.editorStatus')}
              >
                <section
                  id="step-root-table"
                  data-guide-active={activeGuideTarget === 'step-root-table' || undefined}
                  onClick={() => setActiveContext('root')}
                  className={cn(
                    'wizard-reference-root-card cursor-pointer border bg-white p-4 shadow-xs transition-all duration-150',
                    activeGuideTarget === 'step-root-table'
                      ? 'border-indigo-500 bg-gradient-to-b from-indigo-50/15 to-white shadow-md ring-2 ring-indigo-500/40'
                      : activeContext === 'root'
                        ? 'border-blue-500 ring-1 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-blue-200/60 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 uppercase">
                            Input Table
                          </span>
                          {isRootConfigured && !isRootEditing && rootConfig ? (
                            <h2 className="font-mono text-[13px] font-semibold text-gray-900">
                              {rootConfig.table}
                            </h2>
                          ) : (
                            <span className="text-[13px] font-semibold text-gray-900">
                              {isRootConfigured ? 'Edit Input Table' : 'Select Input Table'}
                            </span>
                          )}
                        </div>

                        {/* Subtitle / Meta info when configured */}
                        {isRootConfigured && !isRootEditing && rootConfig ? (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                            <span>
                              Source:{' '}
                              <strong className="font-normal text-gray-700">
                                {rootConfig.source}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              PK:{' '}
                              <code className="font-mono text-gray-700">
                                {rootConfig.primaryKey}
                              </code>
                            </span>
                            <span>•</span>
                            <span>{rootConfig.columns.length} columns</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-gray-500">
                            Anchor entity for document assembly. Each row maps to a MongoDB
                            document.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isRootConfigured && assistantHelper('root', 'clean')}
                      {isRootConfigured && !isRootEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRootConfig((prev) =>
                                prev ? { ...prev, isTransformsOpen: !prev.isTransformsOpen } : null,
                              )
                            }}
                            className={cn(
                              'flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium shadow-2xs transition-colors',
                              rootConfig?.isTransformsOpen
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}
                            title="Configure transforms and pre-processing for input table"
                          >
                            <Workflow className="h-3 w-3 text-blue-600" />
                            <span>Transforms</span>
                            {(rootConfig?.transforms?.length || 0) > 0 && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                                {rootConfig?.transforms?.length}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              startRootEdit()
                            }}
                            className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-2xs transition-colors hover:bg-gray-50 hover:text-gray-900"
                          >
                            <RefreshCw className="h-3 w-3 text-gray-400" />
                            Switch Table
                          </button>
                        </>
                      ) : !isRootConfigured ? (
                        <span className="rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Setup Required
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline Configuration Form */}
                  {(!isRootConfigured || isRootEditing) && (
                    <div
                      className="wizard-reference-root-form mt-3.5 space-y-3 border-t border-gray-100 pt-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {assistant && !readOnly && !isRootConfigured && (
                        <>
                          <form
                            onSubmit={submitRootPrompt}
                            className="pipeline-ai-inline space-y-1.5"
                          >
                            <label
                              htmlFor="pipeline-root-assistant-prompt"
                              className="text-foreground block text-[11px] font-medium"
                            >
                              {t('wizard.assistant.rootPromptLabel')}
                            </label>
                            <div className="pipeline-ai-composer">
                              <textarea
                                ref={rootPromptInput}
                                id="pipeline-root-assistant-prompt"
                                aria-label={t('wizard.assistant.rootPromptLabel')}
                                value={rootPrompt}
                                onChange={(event) => setRootPrompt(event.target.value)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === 'Enter' &&
                                    !event.shiftKey &&
                                    !event.nativeEvent.isComposing
                                  ) {
                                    event.preventDefault()
                                    event.currentTarget.form?.requestSubmit()
                                  }
                                }}
                                placeholder={t('wizard.assistant.rootPromptPlaceholder')}
                                rows={1}
                                maxLength={4000}
                                className="pipeline-ai-composer-input"
                              />
                              <div className="pipeline-ai-composer-actions">
                                <span className="system-xs-regular text-text-tertiary">
                                  {t('wizard.assistant.newline')}
                                </span>
                                <Button
                                  type="submit"
                                  size="medium"
                                  loading={Boolean(assistantPrompt?.submit)}
                                  aria-label={t('wizard.assistant.send')}
                                  title={t('wizard.assistant.send')}
                                  disabled={!rootPrompt.trim() || Boolean(assistantPrompt?.submit)}
                                  className="w-8 shrink-0 px-0"
                                >
                                  <span
                                    className="i-ri-send-plane-2-fill size-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </div>
                            </div>
                            {assistantPrompt?.submit && (
                              <p role="status" className="text-muted-foreground text-[11px]">
                                {t('wizard.assistant.queuedRootPrompt')}
                              </p>
                            )}
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              {t('wizard.assistant.rootPromptHint')}
                            </p>
                          </form>
                          <div className="border-border text-muted-foreground border-t pt-2 text-[11px]">
                            {t('wizard.assistant.manualRootSetup')}
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">
                            {t('wizard.sourceTitle')}
                          </label>
                          <SearchablePicker
                            ariaLabel={t('wizard.sourceTitle')}
                            emptyLabel={t('wizard.search.noResults')}
                            openLabel={t('wizard.search.openOptions')}
                            options={sourcePickerOptions}
                            placeholder={t('wizard.search.sources')}
                            value={scratchSelectedSource}
                            onValueChange={(value) => {
                              if (!value) return
                              setScratchSelectedSource(value)
                              const src = AVAILABLE_DATA_SOURCES.find((s) => s.name === value)
                              setScratchSelectedTable(src?.tables[0]?.name || '')
                            }}
                            renderSelectedLeading={(option) => option?.icon}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">
                            Table
                          </label>
                          <SearchablePicker
                            ariaLabel={t('wizard.rootTableLabel')}
                            emptyLabel={t('wizard.search.noResults')}
                            inputClassName="font-mono"
                            openLabel={t('wizard.search.openOptions')}
                            options={tablePickerOptionsForSource(scratchSelectedSource)}
                            placeholder={t('wizard.search.tables')}
                            value={scratchSelectedTable}
                            onValueChange={setScratchSelectedTable}
                            renderSelectedLeading={(option) => option?.icon}
                          />
                        </div>
                      </div>

                      {sourceError && (
                        <p role="alert" className="text-[11px] text-amber-700">
                          {sourceError}
                        </p>
                      )}
                      {/* Quick Presets & Confirm Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <span className="text-gray-400">Quick pick:</span>
                          {scratchAvailableTables.slice(0, 2).map((tbl) => (
                            <button
                              key={tbl.name}
                              type="button"
                              onClick={() => quickPickRoot(scratchSelectedSource, tbl.name)}
                              className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-600"
                            >
                              {tbl.name}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          {isRootConfigured && isRootEditing && (
                            <button
                              type="button"
                              onClick={() => setIsRootEditing(false)}
                              className="cursor-pointer px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={confirmRootTable}
                            className="flex cursor-pointer items-center gap-1 bg-blue-600 px-3.5 py-1.5 text-[11px] font-medium text-white shadow-2xs transition-colors hover:bg-blue-700"
                          >
                            <Check className="h-3 w-3" />
                            {isRootConfigured ? 'Save Changes' : 'Confirm Input Table'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Columns preview (when configured and not editing) */}
                  {rootConfig && !isRootEditing && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                      <div className="flex max-w-[500px] items-center gap-1.5 truncate">
                        <span>Columns:</span>
                        {rootConfig.columns.slice(0, 4).map((col) => (
                          <span
                            key={col}
                            className="rounded-lg bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700"
                          >
                            {col}
                          </span>
                        ))}
                        {rootConfig.columns.length > 4 && (
                          <span className="text-[10px] text-gray-400">
                            +{rootConfig.columns.length - 4} more
                          </span>
                        )}
                      </div>
                      <div>
                        Est. volume:{' '}
                        <strong className="text-gray-600">{rootConfig.rowCount}</strong>
                      </div>
                    </div>
                  )}

                  {/* Input Table Transforms Manager (Expanded) */}
                  {rootConfig && !isRootEditing && rootConfig.isTransformsOpen && (
                    <div
                      className="mt-3 border-t border-gray-100 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableTransformsManager
                        identityPlans={identityPlans}
                        tableName={rootConfig.table}
                        sourceName={rootConfig.source}
                        columns={rootConfig.columns}
                        transforms={rootConfig.transforms || []}
                        availableUnionInputs={unionInputsFor(rootConfig.source, rootConfig.table)}
                        onChange={(nextTransforms) =>
                          setRootConfig((prev) =>
                            prev ? { ...prev, transforms: nextTransforms } : null,
                          )
                        }
                      />
                    </div>
                  )}
                </section>
              </ReadOnlyFieldset>

              {/* ============================================================= */}
              {/* CONNECTOR: From Root down to Relations Tree (Delicate dashed spine) */}
              {/* ============================================================= */}
              <div className="ml-8 flex h-5 justify-start">
                <div className="h-full border-l border-dashed border-gray-300" />
              </div>

              {/* ============================================================= */}
              {/* STEP 2: RELATIONS LIST (动态子表树 - 精致虚线导轨，精准分支) */}
              {/* ============================================================= */}
              <div className="relative ml-8 space-y-3.5 border-l border-dashed border-gray-300 pl-6">
                {activeGuideTarget === 'step-first-relation' && renderGuideStep?.(1)}
                <ReadOnlyFieldset
                  disabled={readOnly}
                  label={readOnlyLabel ?? t('pipelines.workspace.readOnly.editorStatus')}
                >
                  <div className="wizard-reference-relation-list flex flex-col gap-4">
                    {/* Dynamically Render Each Relation Node */}
                    {relations.map((rel) => renderRelation(rel))}

                    {/* =========================================================== */}
                    {/* INLINE ADD RELATION CARD (在流中就地添加，完全对齐树形导轨) */}
                    {/* =========================================================== */}
                    <div className="relative">
                      {/* Exact branch connector from border-dashed guide to this button/card */}
                      <div className="absolute top-4 -left-6 w-6 border-b border-dashed border-gray-300" />

                      {/* ADD BUTTON (When closed) */}
                      {!isAddingRelation ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {assistantHelper('relations', 'relations')}
                          <button
                            type="button"
                            onClick={openInlineAddRelation}
                            disabled={!isRootConfigured}
                            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-2xs transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:scale-110" />
                            <span>Add Related Table</span>
                            <span className="font-normal text-gray-400">
                              (1:N Array or 1:1 Document)
                            </span>
                          </button>
                          {!isRootConfigured && (
                            <div className="w-full text-[11px] text-amber-600">
                              Please confirm the Input Table above first.
                            </div>
                          )}
                        </div>
                      ) : (
                        /* INLINE FORM CARD (When open) */
                        <div className="animate-in fade-in zoom-in-95 rounded-xl border-2 border-blue-400 bg-white p-4 text-[12px] shadow-md">
                          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                              <Plus className="h-4 w-4 text-blue-600" />
                              Add Related Table to{' '}
                              <span className="font-mono text-blue-700">
                                {rootConfig?.table || 'Root'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAddingRelation(false)}
                              className="cursor-pointer text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            {/* 1. Semantic Relationship Type */}
                            <div>
                              <label className="mb-1.5 block text-[11px] font-medium text-gray-600">
                                Relationship Semantic *
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setNewRelType('sub_doc')}
                                  className={cn(
                                    'cursor-pointer rounded-lg border p-2.5 text-left transition-all',
                                    newRelType === 'sub_doc'
                                      ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-400'
                                      : 'border-gray-200 bg-white hover:border-gray-300',
                                  )}
                                >
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                                    <Braces className="h-3.5 w-3.5" />
                                    Document &#123; &#125;
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-gray-500">
                                    Embed as nested object map
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setNewRelType('sub_array')}
                                  className={cn(
                                    'cursor-pointer rounded-lg border p-2.5 text-left transition-all',
                                    newRelType === 'sub_array'
                                      ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-400'
                                      : 'border-gray-200 bg-white hover:border-gray-300',
                                  )}
                                >
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                                    <FolderTree className="h-3.5 w-3.5" />
                                    Array [ ]
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-gray-500">
                                    Embed rows as array (1:N)
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setNewRelType('flatten')}
                                  className={cn(
                                    'cursor-pointer rounded-lg border p-2.5 text-left transition-all',
                                    newRelType === 'flatten'
                                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                                      : 'border-gray-200 bg-white hover:border-gray-300',
                                  )}
                                >
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                    <Layers className="h-3.5 w-3.5" />
                                    Flatten
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-gray-500">
                                    Merge fields directly into root
                                  </div>
                                </button>
                              </div>
                            </div>

                            {/* 2. Source & Table Pickers */}
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                  Child Data Source
                                </label>
                                <SearchablePicker
                                  ariaLabel={t('wizard.relations.source')}
                                  emptyLabel={t('wizard.search.noResults')}
                                  openLabel={t('wizard.search.openOptions')}
                                  options={sourcePickerOptions}
                                  placeholder={t('wizard.search.sources')}
                                  value={newRelSource}
                                  onValueChange={(value) => {
                                    if (!value) return
                                    setNewRelSource(value)
                                    const tables = getTablesForSource(value)
                                    if (tables.length > 0)
                                      handleNewRelTableSelect(tables[0].name, value)
                                    else setNewRelTable('')
                                  }}
                                  renderSelectedLeading={(option) => option?.icon}
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                  Child Table
                                </label>
                                <SearchablePicker
                                  ariaLabel={t('wizard.relations.table')}
                                  emptyLabel={t('wizard.search.noResults')}
                                  inputClassName="font-mono"
                                  openLabel={t('wizard.search.openOptions')}
                                  options={tablePickerOptionsForSource(newRelSource)}
                                  placeholder={t('wizard.search.tables')}
                                  value={newRelTable}
                                  onValueChange={(value) =>
                                    value && handleNewRelTableSelect(value, newRelSource)
                                  }
                                  renderSelectedLeading={(option) => option?.icon}
                                />
                              </div>
                            </div>

                            {/* 3. Join Condition */}
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                Join Condition
                              </label>
                              <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                                <span className="font-mono text-gray-600">
                                  {newRelTable.split('.').pop()}.
                                </span>
                                <FieldAutocomplete
                                  ariaLabel={t('wizard.relations.childField')}
                                  className="min-w-0 flex-1"
                                  emptyLabel={t('wizard.search.noResults')}
                                  inputClassName="font-mono"
                                  openLabel={t('wizard.search.openOptions')}
                                  options={
                                    getTablesForSource(newRelSource).find(
                                      (table) => table.name === newRelTable,
                                    )?.columns ?? []
                                  }
                                  placeholder={t('wizard.search.fields')}
                                  value={newRelKey}
                                  onValueChange={setNewRelKey}
                                />
                                <span className="font-bold text-gray-400">=</span>
                                <span className="font-mono text-gray-600">
                                  {rootConfig?.table || 'root'}.
                                </span>
                                <FieldAutocomplete
                                  ariaLabel={t('wizard.relations.parentField')}
                                  className="min-w-0 flex-1"
                                  emptyLabel={t('wizard.search.noResults')}
                                  inputClassName="font-mono"
                                  openLabel={t('wizard.search.openOptions')}
                                  options={rootConfig?.columns ?? []}
                                  placeholder={t('wizard.search.fields')}
                                  value={newRelParentKey}
                                  onValueChange={setNewRelParentKey}
                                />
                              </div>
                            </div>

                            {/* 4. Embed Field Name */}
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                Target Field in Document
                              </label>
                              <input
                                value={newRelTargetField}
                                onChange={(e) => setNewRelTargetField(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 font-mono text-[11px] text-gray-800"
                                placeholder="e.g. orders"
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsAddingRelation(false)}
                                className="cursor-pointer px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={confirmAddRelation}
                                className="flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[11px] font-medium text-white shadow-2xs transition-colors hover:bg-blue-700"
                              >
                                <Check className="h-3 w-3" />
                                Embed Relation
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ReadOnlyFieldset>
              </div>

              {/* ============================================================= */}
              {/* CONNECTOR: From Stage 1 (Root & Relations) down to Stage 2 (Transform) */}
              {/* ============================================================= */}
              <div className="ml-8 flex h-6 justify-start">
                <div className="h-full border-l border-dashed border-gray-300" />
              </div>

              {/* ============================================================= */}
              {/* PIPELINE TRANSFORMS */}
              {/* ============================================================= */}
              <section
                id="step-doc-process"
                data-guide-active={activeGuideTarget === 'step-doc-process' || undefined}
                onClick={() => setActiveContext('doc_process')}
                className={cn(
                  'cursor-pointer rounded-xl border bg-white p-4 shadow-xs transition-all duration-150',
                  activeGuideTarget === 'step-doc-process'
                    ? 'border-indigo-500 bg-gradient-to-b from-indigo-50/15 to-white shadow-md ring-2 ring-indigo-500/40'
                    : activeContext === 'doc_process'
                      ? 'border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300',
                )}
              >
                {activeGuideTarget === 'step-doc-process' && renderGuideStep?.(2)}
                <ReadOnlyFieldset
                  disabled={readOnly}
                  label={readOnlyLabel ?? t('pipelines.workspace.readOnly.editorStatus')}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                        <Workflow className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-semibold tracking-tight text-gray-900">
                          Transform
                        </h3>
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-400">
                          {pipelineTransforms.length}{' '}
                          {pipelineTransforms.length === 1 ? 'step' : 'steps'}
                        </span>
                      </div>
                    </div>
                    {assistantHelper('doc_process', 'metrics')}
                  </div>
                  <div className="mt-3.5" onClick={(event) => event.stopPropagation()}>
                    <TableTransformsManager
                      identityPlans={identityPlans}
                      tableName={rootConfig?.table || 'root'}
                      sourceName={rootConfig?.source || 'Pipeline'}
                      columns={Array.from(
                        new Set([
                          ...getColumnsForTable(rootConfig?.source || '', rootConfig?.table || ''),
                          ...flattenRelations(relations).flatMap((relation) =>
                            getColumnsForTable(relation.source, relation.table),
                          ),
                        ]),
                      )}
                      availableUnionInputs={
                        rootConfig
                          ? unionInputsFor(rootConfig.source, rootConfig.table, pipelineUnionInputs)
                          : []
                      }
                      inheritedSourceIdField={
                        relations.length === 0
                          ? effectiveUnwindSourceIdField(rootConfig?.transforms)
                          : undefined
                      }
                      transforms={pipelineTransforms}
                      onChange={setPipelineTransforms}
                      hideHeader={true}
                    />
                  </div>
                </ReadOnlyFieldset>
              </section>

              {/* ============================================================= */}
              {/* CONNECTOR: Transform stage to the configured destination */}
              {/* ============================================================= */}
              <div className="ml-8 flex h-6 justify-start">
                <div className="h-full border-l border-dashed border-gray-300" />
              </div>

              <ReadOnlyFieldset
                disabled={readOnly}
                label={readOnlyLabel ?? t('pipelines.workspace.readOnly.editorStatus')}
              >
                {/* ============================================================= */}
                {/* Destination */}
                {/* ============================================================= */}
                <section
                  id="step-destination"
                  onClick={() => setActiveContext('destination')}
                  className={cn(
                    'cursor-pointer rounded-xl border bg-white p-4 shadow-xs transition-all duration-150',
                    activeContext === 'destination'
                      ? 'border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-gray-900">
                          {targetDataSource
                            ? `${targetDataSource.connectorName || targetDataSource.connector} (${targetDataSource.name})`
                            : destinationName || t('wizard.configureDestination')}
                        </h3>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="grid min-w-0 gap-2">
                            <span
                              id="wizard-destination-source-label"
                              className="text-foreground text-[13px] leading-none font-medium"
                            >
                              {t(
                                deploymentProfile === 'cloud'
                                  ? 'wizard.destinationAtlasSource'
                                  : 'wizard.destinationTargetSource',
                              )}
                            </span>
                            <SearchablePicker
                              ariaLabel={t(
                                deploymentProfile === 'cloud'
                                  ? 'wizard.destinationAtlasSource'
                                  : 'wizard.destinationTargetSource',
                              )}
                              ariaLabelledBy="wizard-destination-source-label"
                              emptyLabel={t('wizard.search.noResults')}
                              openLabel={t('wizard.search.openOptions')}
                              options={destinationPickerOptions}
                              placeholder={t('wizard.search.sources')}
                              value={targetSourceId}
                              onValueChange={(value) => {
                                if (!value) return
                                setTargetSourceId(value)
                                const next = AVAILABLE_DESTINATIONS.find(
                                  (source) => source.id === value,
                                )
                                if (
                                  next?.writeModes?.length &&
                                  !next.writeModes.includes(targetWriteMode)
                                ) {
                                  setTargetWriteMode(next.writeModes[0])
                                }
                              }}
                              renderSelectedLeading={(option) => option?.icon}
                            />
                          </div>
                          <div className="grid min-w-0 gap-2">
                            <span
                              id="wizard-destination-table-label"
                              className="text-foreground text-[13px] leading-none font-medium"
                            >
                              {t('wizard.destinationTable')}
                            </span>
                            <Input
                              aria-labelledby="wizard-destination-table-label"
                              value={targetCollection}
                              onChange={(event) => setTargetCollection(event.target.value)}
                              placeholder={t('wizard.destinationTablePlaceholder')}
                              className="w-full font-mono text-[13px] font-normal"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const modes = availableWriteModes
                      return modes.length > 1 ? (
                        <label className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-[var(--pipeline-text-muted)]">
                          {t('wizard.writeStrategy')}
                          <Select
                            value={selectedWriteMode}
                            onValueChange={(value) => value !== null && setTargetWriteMode(value)}
                          >
                            <SelectTrigger className="rounded-control h-8 w-28 bg-white text-[11px] font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {modes.map((mode) => (
                                <SelectItem key={mode} value={mode}>
                                  {mode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[var(--pipeline-text-muted)]">
                          {t('wizard.writeStrategy')}:{' '}
                          <strong className="font-semibold text-[var(--pipeline-text)]">
                            {selectedWriteMode}
                          </strong>
                        </div>
                      )
                    })()}
                  </div>
                </section>
                {footer}
              </ReadOnlyFieldset>
            </div>
          </main>
          {activeGuideTarget === 'step-publish-action' && (
            <div className="wizard-reference-launch-guide">{renderGuideStep?.(4)}</div>
          )}
          {actions}
        </div>

        <aside
          id={assistant ? 'step-preview-panel' : undefined}
          data-guide-active={(assistant && activeGuideTarget === 'step-preview-panel') || undefined}
          className={cn(
            assistant ? 'wizard-reference-sidebar' : 'contents',
            assistant && (assistantOpen ? 'flex' : 'hidden'),
          )}
        >
          {assistant && (
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200/80 bg-gray-50/70 px-3">
              <div
                role="tablist"
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  const next =
                    event.key === 'Home'
                      ? 'copilot'
                      : event.key === 'End'
                        ? 'preview'
                        : rightPanelTab === 'copilot'
                          ? 'preview'
                          : 'copilot'
                  setRightPanelTab(next)
                  event.currentTarget
                    .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [next === 'copilot' ? 0 : 1]?.focus()
                }}
                aria-label={t('wizard.assistant.title')}
                className="flex items-center gap-1 rounded-lg bg-gray-200/60 p-0.5 text-[11px] font-medium"
              >
                <button
                  type="button"
                  role="tab"
                  tabIndex={rightPanelTab === 'copilot' ? 0 : -1}
                  aria-selected={rightPanelTab === 'copilot'}
                  aria-controls="builder-copilot-panel"
                  onClick={() => setRightPanelTab('copilot')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 whitespace-nowrap transition-colors',
                    rightPanelTab === 'copilot'
                      ? 'bg-white font-semibold text-blue-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  {t('wizard.assistant.open')}
                </button>
                <button
                  type="button"
                  role="tab"
                  tabIndex={rightPanelTab === 'preview' ? 0 : -1}
                  aria-selected={rightPanelTab === 'preview'}
                  aria-controls="builder-preview-panel"
                  onClick={() => setRightPanelTab('preview')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 whitespace-nowrap transition-colors',
                    rightPanelTab === 'preview'
                      ? 'bg-white font-semibold text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t('wizard.previewPanel.title')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                aria-label={t('wizard.assistant.close')}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {assistant && (
            <div
              id="builder-copilot-panel"
              role="tabpanel"
              aria-label={t('wizard.assistant.open')}
              className={cn(
                'wizard-reference-assistant',
                rightPanelTab === 'copilot' ? 'flex' : 'hidden',
              )}
            >
              <PipelineAiCopilot
                context={{
                  ...assistant,
                  blocked: assistant.blocked || unconfirmedRootEdit,
                  sendBlocked: assistant.sendBlocked ?? assistant.blocked,
                  prepareRequest: assistant.prepareRequest,
                  onPromptRequestHandled: handleAssistantPromptRequest,
                  undoBlocked: readOnly || unconfirmedRootEdit || assistant.undoBlocked,
                  onApply: applyAssistant,
                  onUndoApply: undoAssistantApply,
                }}
                focus={activeContext}
                focusLabel={
                  activeContext === 'root'
                    ? `Step 1 · ${rootConfig?.table || t('wizard.assistant.unconfigured')}`
                    : activeContext === 'doc_process'
                      ? t('wizard.assistant.documentFocus')
                      : `Step 2 · ${activeContext}`
                }
                promptRequest={assistantPrompt}
                onClose={() => setAssistantOpen(false)}
              />
            </div>
          )}
          <div
            id={assistant ? 'builder-preview-panel' : 'step-preview-panel'}
            data-guide-active={
              (!assistant && activeGuideTarget === 'step-preview-panel') || undefined
            }
            role={assistant ? 'tabpanel' : undefined}
            aria-label={assistant ? t('wizard.previewPanel.title') : undefined}
            className={cn(
              assistant && rightPanelTab === 'copilot' ? 'hidden' : 'flex',
              'wizard-reference-preview flex-col overflow-hidden bg-white',
            )}
          >
            <div className="flex min-h-11 shrink-0 items-center justify-between gap-1 border-b border-gray-200/80 bg-white/75 px-3 py-2 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    livePreviewStatus === 'error'
                      ? 'bg-destructive'
                      : livePreviewStatus === 'loading'
                        ? 'animate-pulse bg-emerald-500'
                        : livePreviewStatus === 'complete'
                          ? 'bg-emerald-500'
                          : 'bg-muted-foreground',
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-gray-900">
                  {t('wizard.previewPanel.title')}
                </span>
                <span className="max-w-28 truncate font-mono text-[10px] text-gray-400">
                  ({activeContextLabel})
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void copyExecutionSpec()}
                  disabled={!livePreview}
                  className="inline-flex items-center gap-1 rounded border border-gray-200/80 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 shadow-xs hover:border-gray-300 hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-live="polite"
                >
                  {copyStatus === 'copied' ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {t(
                    copyStatus === 'copied'
                      ? 'wizard.previewPanel.copied'
                      : copyStatus === 'failed'
                        ? 'wizard.previewPanel.copyFailed'
                        : 'wizard.previewPanel.copy',
                  )}
                </button>
                <div className="flex items-center rounded border border-gray-200/60 bg-gray-100/80 p-0.5 text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('json')}
                    aria-pressed={previewMode === 'json'}
                    className={cn(
                      'rounded px-1.5 py-0.5 transition-colors',
                      previewMode === 'json'
                        ? 'bg-white font-semibold text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {t('wizard.previewPanel.jsonDoc')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('table')}
                    aria-pressed={previewMode === 'table'}
                    className={cn(
                      'rounded px-1.5 py-0.5 transition-colors',
                      previewMode === 'table'
                        ? 'bg-white font-semibold text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {t('wizard.previewPanel.tableView')}
                  </button>
                </div>
              </div>
            </div>

            {activeGuideTarget === 'step-preview-panel' && (
              <div className="border-b border-indigo-100 bg-indigo-50/20 p-3">
                {renderGuideStep?.(3)}
              </div>
            )}

            <div className="flex min-h-9 items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-1.5 text-[11px] text-gray-500">
              <span className="min-w-0 truncate">
                {selectedDocument
                  ? t('wizard.previewPanel.sampleRecord', { number: selectedIndex + 1 })
                  : livePreviewStatus === 'loading'
                    ? t('wizard.previewPanel.loading')
                    : t('wizard.previewPanel.awaitingPreview')}
              </span>
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1 font-medium',
                  livePreviewStatus === 'stale'
                    ? 'text-gray-600'
                    : livePreviewStatus === 'error'
                      ? 'text-red-600'
                      : livePreviewStatus === 'complete'
                        ? 'text-emerald-700'
                        : 'text-gray-500',
                )}
                role="status"
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    livePreviewStatus === 'complete' ? 'bg-emerald-500' : 'bg-gray-400',
                  )}
                />
                {t(`wizard.previewPanel.status.${livePreviewStatus}`)}
              </span>
            </div>

            {livePreview?.logicalDocuments && hasUnwind() && (
              <div
                className="border-border flex gap-2 border-b px-3 py-2"
                role="group"
                aria-label={t('wizard.previewPanel.projection')}
              >
                {(['target', 'logical'] as const).map((projection) => (
                  <button
                    key={projection}
                    type="button"
                    aria-pressed={previewProjection === projection}
                    onClick={() => setPreviewProjection(projection)}
                    className={cn(
                      'focus-visible:outline-ring rounded-md border px-2 py-1 text-xs focus-visible:outline-2',
                      previewProjection === projection
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {t(`wizard.previewPanel.${projection}Projection`)}
                  </button>
                ))}
              </div>
            )}

            <UnwindTargetIdentitySummary
              enabled={hasUnwind()}
              plans={identityPlans}
              status={livePreviewStatus}
            />

            {livePreviewStatus === 'error' && (
              <p
                className="border-border text-destructive border-b px-3 py-2 text-xs"
                role="alert"
                title={livePreviewError}
              >
                {t('wizard.previewPanel.failed')}
                {livePreviewError && <span className="ml-1 font-mono">{livePreviewError}</span>}
              </p>
            )}

            <div className="min-h-48 flex-1 overflow-auto bg-white p-4 font-mono text-xs text-gray-800">
              {!rootConfig ? (
                <div className="text-muted-foreground flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                  <Database className="size-8 opacity-60" />
                  <span className="font-sans font-medium">
                    {t('wizard.previewPanel.noRootTitle')}
                  </span>
                  <span className="max-w-xs font-sans text-[11px]">
                    {t('wizard.previewPanel.noRootBody')}
                  </span>
                </div>
              ) : !livePreview && livePreviewStatus === 'error' ? (
                <p className="text-muted-foreground font-sans text-sm">
                  {t('wizard.previewPanel.noResult')}
                </p>
              ) : !livePreview || !selectedDocument ? (
                <p className="text-muted-foreground font-sans text-sm">
                  {livePreviewStatus === 'loading'
                    ? t('wizard.previewPanel.loading')
                    : t('wizard.previewPanel.noDocuments')}
                </p>
              ) : previewMode === 'json' ? (
                <>
                  {documents.length > 1 && (
                    <div className="mb-2 flex items-center justify-end gap-1 font-sans text-[11px] text-gray-500">
                      <button
                        type="button"
                        className="border-border hover:bg-accent rounded border px-1.5 py-0.5 disabled:opacity-40"
                        aria-label={t('wizard.previewPanel.previousDocument')}
                        disabled={selectedIndex <= 0}
                        onClick={() => setSelectedDocumentIndex((index) => Math.max(0, index - 1))}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="border-border hover:bg-accent rounded border px-1.5 py-0.5 disabled:opacity-40"
                        aria-label={t('wizard.previewPanel.nextDocument')}
                        disabled={selectedIndex >= documents.length - 1}
                        onClick={() =>
                          setSelectedDocumentIndex((index) =>
                            Math.min(documents.length - 1, index + 1),
                          )
                        }
                      >
                        ›
                      </button>
                    </div>
                  )}
                  <div className="space-y-0.5 leading-relaxed break-words">
                    {renderJsonValue(selectedDocument, '', 0)}
                  </div>
                </>
              ) : (
                <div>
                  {documents.length > 200 && (
                    <p className="text-muted-foreground mb-2 font-sans text-[11px]">
                      {t('wizard.previewPanel.tableLimit', { shown: 200, count: documents.length })}
                    </p>
                  )}
                  <table className="w-full border-collapse text-left font-sans text-[11px]">
                    <thead>
                      <tr className="border-border text-muted-foreground border-b">
                        {previewTableColumns.map((field) => (
                          <th
                            className={cn(
                              'px-2 py-2 font-medium',
                              tableFieldFocused(field) && 'bg-blue-50 font-semibold text-blue-700',
                            )}
                            key={field}
                          >
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {documents.slice(0, 200).map((document, rowIndex) => (
                        <tr
                          className="border-border border-b"
                          key={`${String(document._id ?? 'row')}-${rowIndex}`}
                        >
                          {previewTableColumns.map((field) => {
                            const value = document[field]
                            const relation = relationFields.has(field)
                            const computed = computedFields.has(field)
                            const display =
                              relation && Array.isArray(value)
                                ? t('wizard.previewPanel.embeddedArray', { count: value.length })
                                : relation && isObjectRecord(value) && !isExtendedJsonScalar(value)
                                  ? t('wizard.previewPanel.embeddedDocument')
                                  : typeof value === 'string'
                                    ? value
                                    : displayScalar(value, false)
                            return (
                              <td
                                className={cn(
                                  'max-w-56 truncate px-2 py-2 text-gray-900',
                                  tableFieldFocused(field) &&
                                    'bg-blue-50/70 ring-1 ring-blue-200 ring-inset',
                                )}
                                key={field}
                                title={display}
                                data-preview-path={`/${pointerSegment(field)}`}
                                data-preview-focused={tableFieldFocused(field) || undefined}
                              >
                                <span
                                  className={cn(
                                    rootFields.has(field) && 'text-primary',
                                    relation && 'text-foreground',
                                    computed && 'bg-accent rounded px-1',
                                  )}
                                >
                                  {display ?? 'null'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {transformTrace &&
              (transformTrace.fields.length > 0 ||
                transformTrace.annotations.length > 0 ||
                transformTrace.unknownOrigins.length > 0) && (
                <div
                  className="border-border bg-accent/30 text-foreground border-t px-3 py-2 text-[11px]"
                  role="note"
                >
                  <span className="bg-primary/10 text-primary mr-2 rounded px-1.5 py-0.5 font-sans font-medium">
                    {transformTrace.type || t('wizard.previewPanel.transformsContext')}
                  </span>
                  {transformTrace.annotations.length > 0 ? (
                    <span>{transformTrace.annotations.join('; ')}</span>
                  ) : (
                    transformTrace.fields.length > 0 && (
                      <span>
                        {t('wizard.previewPanel.transformAnnotation', {
                          fields: transformTrace.fields.join(', '),
                        })}
                      </span>
                    )
                  )}
                  {transformTrace.unknownOrigins.length > 0 && (
                    <span className="text-muted-foreground ml-2">
                      {t('wizard.previewPanel.unknownTransformOrigin', {
                        steps: transformTrace.unknownOrigins.join(', '),
                      })}
                    </span>
                  )}
                </div>
              )}

            <div className="border-border bg-muted/30 text-muted-foreground flex items-center justify-between gap-3 border-t px-3 py-2 text-[11px]">
              <span className="truncate">
                {t(
                  logicalPreview
                    ? 'wizard.previewPanel.logicalProjection'
                    : livePreview?.format === 'mongo-extended-json'
                      ? 'wizard.previewPanel.mongoExtendedJsonTarget'
                      : 'wizard.previewPanel.logicalJsonTarget',
                  { destination: destinationName },
                )}
              </span>
              <button
                type="button"
                onClick={() => setPlanMode('json')}
                className="cursor-pointer text-blue-600 hover:underline"
              >
                {t('wizard.previewPanel.viewSpec')}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {planMode && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-in fade-in flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {planMode === 'dsl' ? t('wizard.dslPreview') : 'Wizard JSON Spec'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanMode(null)}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-[11px] leading-relaxed text-gray-100">
              {planMode === 'json' ? (
                <pre>{compiledPlanJson}</pre>
              ) : dslLoading ? (
                <p role="status">{t('wizard.dslLoading')}</p>
              ) : dslError ? (
                <p role="alert" className="text-red-300">
                  {dslError}
                </p>
              ) : (
                <pre>{dsl}</pre>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setPlanMode(null)}
                className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
