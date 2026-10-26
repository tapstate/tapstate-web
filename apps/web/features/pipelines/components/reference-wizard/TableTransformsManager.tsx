import { Button } from '@tapstate-web/ui/button'
import { Checkbox } from '@tapstate-web/ui/checkbox'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { Input } from '@tapstate-web/ui/input'
import { Textarea } from '@tapstate-web/ui/textarea'
import {
  Filter,
  Layers,
  FileCode2,
  Workflow,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Code,
  ArrowRight,
  ShieldAlert,
  Search,
  X,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineTargetIdentity } from '@/service/pipelines/pipeline-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { cn } from '@/lib/utils'

import { TransformSelect } from '../transform/transform-select'
import { MapOperationsEditor as MapEditor } from './map-operations-editor'
import { SearchablePicker, type SearchablePickerOption } from './searchable-picker'
import {
  parseWizardFilter,
  wizardFilterExpression,
  type WizardFilterCondition,
} from './wizard-filter-conditions'

export const DEFAULT_UNWIND_SOURCE_ID_FIELD = '_unwind_source_id'

export type TransformType = 'filter' | 'map' | 'unwind' | 'js' | 'union'

export interface UnionInputOption {
  reference: string
  label: string
  sourceId?: string
  sourceName?: string
  connectorId?: string
  iconPath?: string | null
  tableName?: string
}

const DEFAULT_JS_SCRIPT = 'function process(record, ctx) {\n  return record;\n}'
const WIZARD_ADDABLE_TRANSFORM_TYPES: TransformType[] = ['filter', 'map', 'unwind', 'js', 'union']

export type FilterCondition = WizardFilterCondition

export interface FilterTransformConfig {
  expr: string
  conditions?: FilterCondition[]
  isRawCel?: boolean
}

export interface MapFieldRule {
  id: string
  outputField: string
  ruleType: 'rename' | 'delete' | 'compute' | 'literal'
  value: string
  valueConfigured?: boolean
}

export interface MapTransformConfig {
  fields: MapFieldRule[]
  passthroughUnlisted?: boolean
  draftFields?: MapFieldRule[]
  operationOrder?: MapFieldRule['ruleType'][]
}

export interface UnwindTransformConfig {
  path: string
  element_key?: string
  include_array_index?: string
  preserve_null_and_empty_arrays?: boolean
  element_type?: string
  source_id_field?: string
}

export interface JsTransformConfig {
  script: string
}

export interface UnionTransformConfig {
  from: string[]
}

export interface TransformStep {
  id: string
  name: string
  type: TransformType
  enabled?: boolean
  isExpanded?: boolean
  config: {
    filter?: FilterTransformConfig
    map?: MapTransformConfig
    unwind?: UnwindTransformConfig
    js?: JsTransformConfig
    union?: UnionTransformConfig
  }
}

export function effectiveUnwindSourceIdField(
  steps: TransformStep[] = [],
  inherited = DEFAULT_UNWIND_SOURCE_ID_FIELD,
): string {
  return steps.reduce(
    (field, step) =>
      step.type === 'unwind' ? (step.config.unwind?.source_id_field ?? field) : field,
    inherited,
  )
}

export interface TableTransformsManagerProps {
  inheritedSourceIdField?: string
  identityPlans?: PipelineTargetIdentity[]
  tableName: string
  sourceName?: string
  columns: string[]
  transforms: TransformStep[]
  onChange: (transforms: TransformStep[]) => void
  hideHeader?: boolean
  availableUnionInputs?: UnionInputOption[]
}

const TRANSFORM_TYPE_META: Record<
  TransformType,
  {
    titleKey: string
    descriptionKey: string
    typeName: string
    icon: React.ComponentType<{ className?: string }>
    badgeColor: string
    borderColor: string
    activeBg: string
  }
> = {
  filter: {
    titleKey: 'pipelines.workspace.transform.filter.title',
    typeName: 'Filter',
    descriptionKey: 'pipelines.workspace.transform.wizard.filterDescription',
    icon: Filter,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-amber-300',
    activeBg: 'bg-amber-50/50',
  },
  map: {
    titleKey: 'pipelines.workspace.transform.map.title',
    typeName: 'Map',
    descriptionKey: 'pipelines.workspace.transform.wizard.mapDescription',
    icon: Layers,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    activeBg: 'bg-blue-50/50',
  },
  unwind: {
    titleKey: 'pipelines.workspace.transform.unwind.title',
    typeName: 'Unwind',
    descriptionKey: 'pipelines.workspace.transform.wizard.unwindDescription',
    icon: Workflow,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-300',
    activeBg: 'bg-purple-50/50',
  },
  js: {
    titleKey: 'pipelines.workspace.transform.js.title',
    typeName: 'JavaScript',
    descriptionKey: 'pipelines.workspace.transform.wizard.jsDescription',
    icon: FileCode2,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    activeBg: 'bg-emerald-50/50',
  },
  union: {
    titleKey: 'pipelines.workspace.transform.union.title',
    typeName: 'Union',
    descriptionKey: 'pipelines.workspace.transform.wizard.unionDescription',
    icon: Sparkles,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    borderColor: 'border-rose-300',
    activeBg: 'bg-rose-50/50',
  },
}

function TransformTypeMark({
  type,
  icon: Icon,
}: {
  type: TransformType
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md border-[0.5px]',
        TRANSFORM_TYPE_META[type].badgeColor,
      )}
      aria-hidden="true"
    >
      <Icon className="size-4" />
    </span>
  )
}

type ResolvedUnionInputOption = UnionInputOption & {
  sourceId: string
  sourceName: string
  connectorId: string
  tableName: string
}

function resolveUnionInputOption(option: UnionInputOption): ResolvedUnionInputOption {
  const referenceParts = option.reference.split('.')
  const labelSeparator = option.label.lastIndexOf(' · ')
  const sourceId = option.sourceId || referenceParts[0] || option.reference
  return {
    ...option,
    sourceId,
    sourceName:
      option.sourceName || (labelSeparator >= 0 ? option.label.slice(0, labelSeparator) : sourceId),
    connectorId: option.connectorId || sourceId,
    tableName:
      option.tableName ||
      (labelSeparator >= 0
        ? option.label.slice(labelSeparator + 3)
        : referenceParts.slice(1).join('.') || option.reference),
  }
}

export const TableTransformsManager: React.FC<TableTransformsManagerProps> = ({
  columns = [],
  transforms = [],
  onChange,
  hideHeader = false,
  availableUnionInputs = [],
  identityPlans,
  inheritedSourceIdField = DEFAULT_UNWIND_SOURCE_ID_FIELD,
}) => {
  const { t } = useTranslation()
  const [isAddingStep, setIsAddingStep] = React.useState(false)
  const [unionSearchByStep, setUnionSearchByStep] = React.useState<Record<string, string>>({})

  const handleCreateStep = (type: TransformType) => {
    const newStepId = crypto.randomUUID()
    const initialConfig: TransformStep['config'] =
      type === 'filter'
        ? { filter: { expr: '', conditions: [], isRawCel: false } }
        : type === 'map'
          ? { map: { passthroughUnlisted: true, fields: [] } }
          : type === 'unwind'
            ? { unwind: { path: '' } }
            : type === 'union'
              ? { union: { from: [] } }
              : { js: { script: DEFAULT_JS_SCRIPT } }

    const newStep: TransformStep = {
      id: newStepId,
      name: TRANSFORM_TYPE_META[type].typeName,
      type,
      enabled: true,
      isExpanded: true,
      config: initialConfig,
    }

    onChange([...transforms, newStep])
    setIsAddingStep(false)
  }

  const updateStep = (index: number, updater: (prev: TransformStep) => TransformStep) => {
    const next = [...transforms]
    next[index] = updater(next[index])
    onChange(next)
  }

  const removeStep = (index: number) => {
    const next = [...transforms]
    next.splice(index, 1)
    onChange(next)
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === transforms.length - 1)
    ) {
      return
    }
    const next = [...transforms]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const [moved] = next.splice(index, 1)
    next.splice(targetIdx, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Source header is hidden when the enclosing Transform card owns the heading. */}
      {!hideHeader && transforms.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
              <Workflow className="h-3.5 w-3.5 text-blue-600" />
              <span>{t('pipelines.workspace.transform.wizard.transformsHeading')}</span>
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-400">
              {t('pipelines.workspace.transform.wizard.stepsCount', { count: transforms.length })}
            </span>
          </div>
        </div>
      )}

      {transforms.length === 0 && !isAddingStep && (
        <Button
          type="button"
          variant="secondary"
          size="small"
          className="w-fit gap-1.5"
          onClick={() => setIsAddingStep(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('pipelines.workspace.transform.wizard.addTransform')}
        </Button>
      )}

      {/* Transform Steps Ordered List */}
      <div className="space-y-2.5">
        {transforms.map((step, idx) => {
          const meta = TRANSFORM_TYPE_META[step.type]
          const IconComp = meta.icon
          const isExpanded = step.isExpanded !== false
          const displayName = step.name === step.type ? meta.typeName : step.name

          return (
            <div
              key={step.id}
              data-transform-id={step.id}
              className={cn(
                'overflow-hidden rounded-xl border-[0.5px] bg-white shadow-2xs transition-all duration-150',
                isExpanded
                  ? 'border-[1px] border-[var(--pipeline-selection)] ring-2 ring-[var(--pipeline-selection-ring)]'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              {/* Step Header */}
              <div
                data-transform-header
                className="flex min-w-0 cursor-pointer items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-3.5 py-2.5 hover:bg-gray-50"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, input, a, [role="button"]'))
                    return
                  updateStep(idx, (previous) => ({ ...previous, isExpanded: !isExpanded }))
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <TransformTypeMark type={step.type} icon={IconComp} />
                  <span className="wizard-transform-name">
                    <span aria-hidden="true">{displayName || meta.typeName}</span>
                    <Input
                      aria-label={t('pipelines.workspace.transform.wizard.stepName')}
                      value={displayName}
                      onChange={(event) => {
                        const value = event.target.value
                        updateStep(idx, (previous) => ({ ...previous, name: value }))
                      }}
                      onBlur={() => {
                        if (!step.name.trim())
                          updateStep(idx, (previous) => ({ ...previous, name: meta.typeName }))
                      }}
                      placeholder={meta.typeName}
                      className="text-text-primary h-6 w-0 min-w-full cursor-text rounded-[4px] border-0 bg-transparent px-1 text-[12px] font-semibold shadow-none hover:bg-gray-100 focus:bg-white"
                    />
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {/* Move Up/Down */}
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                    <IconButton
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, 'up')}
                      variant="default"
                      size="md"
                      className="size-6 p-0"
                      title={t('pipelines.workspace.transform.wizard.moveStepUp')}
                      aria-label={t('pipelines.workspace.transform.wizard.moveStepUp')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      type="button"
                      disabled={idx === transforms.length - 1}
                      onClick={() => moveStep(idx, 'down')}
                      variant="default"
                      size="md"
                      className="size-6 border-l border-gray-200 p-0"
                      title={t('pipelines.workspace.transform.wizard.moveStepDown')}
                      aria-label={t('pipelines.workspace.transform.wizard.moveStepDown')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>

                  {/* Remove */}
                  <IconButton
                    type="button"
                    onClick={() => removeStep(idx)}
                    variant="default"
                    size="md"
                    tone="destructive"
                    className="size-6 p-0"
                    title={t('pipelines.workspace.transform.wizard.removeStep')}
                    aria-label={t('pipelines.workspace.transform.wizard.removeStep')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>

                  <IconButton
                    type="button"
                    onClick={() =>
                      updateStep(idx, (prev) => ({ ...prev, isExpanded: !isExpanded }))
                    }
                    variant="default"
                    size="md"
                    className="size-6 p-0"
                    aria-expanded={isExpanded}
                    title={t(
                      isExpanded
                        ? 'pipelines.workspace.transform.wizard.collapseStep'
                        : 'pipelines.workspace.transform.wizard.expandStep',
                    )}
                    aria-label={t(
                      isExpanded
                        ? 'pipelines.workspace.transform.wizard.collapseStep'
                        : 'pipelines.workspace.transform.wizard.expandStep',
                    )}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </IconButton>
                </div>
              </div>

              {/* Step Expanded Editor Body */}
              {isExpanded && (
                <div className="space-y-4 p-4">
                  {step.type === 'union' && (
                    <UnionInputsEditor
                      options={availableUnionInputs}
                      value={step.config.union?.from || []}
                      onChange={(from) =>
                        updateStep(idx, (previous) => ({
                          ...previous,
                          config: { ...previous.config, union: { from } },
                        }))
                      }
                      searchValue={unionSearchByStep[step.id] || ''}
                      onSearchChange={(search) =>
                        setUnionSearchByStep((previous) => ({ ...previous, [step.id]: search }))
                      }
                    />
                  )}

                  {/* 1. FILTER TYPE EDITOR */}
                  {step.type === 'filter' && (
                    <FilterEditor
                      config={step.config.filter || { expr: "op != 'd'" }}
                      columns={columns}
                      onChange={(newFilter) =>
                        updateStep(idx, (prev) => ({
                          ...prev,
                          config: { ...prev.config, filter: newFilter },
                        }))
                      }
                    />
                  )}

                  {/* 2. MAP TYPE EDITOR */}
                  {step.type === 'map' && (
                    <MapEditor
                      config={step.config.map || { fields: [], passthroughUnlisted: true }}
                      columns={columns}
                      onChange={(newMap) =>
                        updateStep(idx, (prev) => ({
                          ...prev,
                          config: { ...prev.config, map: newMap },
                        }))
                      }
                    />
                  )}

                  {/* 3. UNWIND TYPE EDITOR */}
                  {step.type === 'unwind' && (
                    <UnwindEditor
                      inheritedSourceIdField={effectiveUnwindSourceIdField(
                        transforms.slice(0, idx),
                        inheritedSourceIdField,
                      )}
                      identityPlans={identityPlans}
                      config={
                        step.config.unwind || {
                          path: columns[0] || 'items',
                          element_key: 'id',
                        }
                      }
                      columns={columns}
                      onChange={(newUnwind) =>
                        updateStep(idx, (prev) => ({
                          ...prev,
                          config: { ...prev.config, unwind: newUnwind },
                        }))
                      }
                    />
                  )}

                  {/* 4. JAVASCRIPT TYPE EDITOR */}
                  {step.type === 'js' && (
                    <JsEditor
                      config={
                        step.config.js || {
                          script: DEFAULT_JS_SCRIPT,
                        }
                      }
                      onChange={(newJs) =>
                        updateStep(idx, (prev) => ({
                          ...prev,
                          config: { ...prev.config, js: newJs },
                        }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {isAddingStep && (
        <div
          data-transform-picker
          className="wizard-transform-picker animate-in fade-in zoom-in-95 space-y-3 rounded-xl border-2 border-blue-400 bg-white p-3.5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="min-w-0">
              <h4 className="system-sm-semibold text-text-primary">
                {t('pipelines.workspace.transform.wizard.chooseTransformType')}
              </h4>
              <p className="system-xs-regular text-text-tertiary">
                {t('pipelines.workspace.transform.wizard.chooseTransformDescription')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="small"
              className="size-8 shrink-0 p-0"
              onClick={() => setIsAddingStep(false)}
              aria-label={t('pipelines.workspace.transform.wizard.closeTransformPicker')}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="wizard-transform-choices">
            {WIZARD_ADDABLE_TRANSFORM_TYPES.map((type) => {
              const meta = TRANSFORM_TYPE_META[type]
              const IconComp = meta.icon
              const unionUnavailable = type === 'union' && availableUnionInputs.length === 0
              return (
                <Button
                  key={type}
                  type="button"
                  disabled={unionUnavailable}
                  variant="tertiary"
                  size="medium"
                  onClick={() => handleCreateStep(type)}
                  className={cn(
                    'group border-components-panel-border bg-background-default flex h-auto min-h-32 min-w-0 flex-col items-stretch justify-between rounded-lg border p-3 text-left whitespace-normal transition-colors active:scale-[0.99]',
                    unionUnavailable
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-state-base-hover',
                  )}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <TransformTypeMark type={type} icon={IconComp} />
                      <span className="system-xs-medium text-text-tertiary">{meta.typeName}</span>
                    </div>
                    <div>
                      <div className="system-sm-semibold text-text-primary">{t(meta.titleKey)}</div>
                      <p className="system-xs-regular text-text-tertiary mt-1 break-words whitespace-normal">
                        {t(`pipelines.workspace.transform.wizard.pickerDescriptions.${type}`)}
                      </p>
                    </div>
                  </div>
                  <div className="system-xs-medium text-text-accent mt-auto flex items-center justify-between gap-2 pt-3 whitespace-nowrap">
                    <span>{t('pipelines.workspace.transform.wizard.configureStep')}</span>
                    <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
                  </div>
                </Button>
              )
            })}
          </div>
          {availableUnionInputs.length === 0 && (
            <p className="system-xs-regular text-text-tertiary" role="status">
              {t('pipelines.workspace.transform.wizard.unionNoAdditionalInputs')}
            </p>
          )}
        </div>
      )}
      {transforms.length > 0 && !isAddingStep && (
        <Button
          type="button"
          variant="secondary"
          size="small"
          className="w-fit gap-1.5"
          onClick={() => setIsAddingStep(true)}
        >
          <Plus className="h-3.5 w-3.5 text-blue-600" />
          {t('pipelines.workspace.transform.wizard.addNextStep')}
        </Button>
      )}
    </div>
  )
}

function UnionInputsEditor({
  options,
  value,
  onChange,
  searchValue,
  onSearchChange,
}: {
  options: readonly UnionInputOption[]
  value: string[]
  onChange: (next: string[]) => void
  searchValue: string
  onSearchChange: (search: string) => void
}) {
  const { t } = useTranslation()
  const resolvedOptions = React.useMemo(() => {
    const unique = new Map<string, ResolvedUnionInputOption>()
    for (const option of options) unique.set(option.reference, resolveUnionInputOption(option))
    for (const reference of value) {
      if (!unique.has(reference)) {
        unique.set(reference, resolveUnionInputOption({ reference, label: reference }))
      }
    }
    return [...unique.values()]
  }, [options, value])
  const selectedOptions = value
    .map((reference) => resolvedOptions.find((option) => option.reference === reference))
    .filter((option): option is ResolvedUnionInputOption => Boolean(option))
  const query = searchValue.trim().toLocaleLowerCase()
  const groupedOptions = new Map<string, ResolvedUnionInputOption[]>()
  for (const option of resolvedOptions) {
    if (
      query &&
      !`${option.sourceName} ${option.tableName} ${option.reference}`
        .toLocaleLowerCase()
        .includes(query)
    ) {
      continue
    }
    const group = groupedOptions.get(option.sourceId) || []
    group.push(option)
    groupedOptions.set(option.sourceId, group)
  }

  const toggleInput = (reference: string, checked: boolean) => {
    onChange(
      checked
        ? value.includes(reference)
          ? value
          : [...value, reference]
        : value.filter((item) => item !== reference),
    )
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-rose-200/70 bg-rose-50/30 p-3.5"
      aria-label={t('pipelines.workspace.transform.union.title')}
    >
      <p className="text-[11px] leading-relaxed text-rose-900">
        {t('pipelines.workspace.transform.wizard.unionDescription')}
      </p>
      <div className="space-y-3 rounded-lg border border-rose-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="system-sm-semibold text-text-primary">
            {t('pipelines.workspace.transform.wizard.unionAdditionalInputs')}
          </h3>
          <span className="system-xs-regular text-text-tertiary tabular-nums">
            {t('pipelines.workspace.transform.wizard.unionSelectedCount', { count: value.length })}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2" data-union-selected-list>
          <span className="system-xs-medium text-text-secondary">
            {t('pipelines.workspace.transform.wizard.unionSelectedInputs')}
          </span>
          {selectedOptions.map((option) => (
            <span
              key={option.reference}
              data-union-selected={option.reference}
              className="bg-state-base-hover text-text-secondary flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1"
            >
              <ConnectorIcon
                connectorId={option.connectorId}
                name={option.sourceName}
                iconPath={option.iconPath}
                size={16}
                className="size-4"
              />
              <span className="system-xs-regular min-w-0 truncate">
                {option.sourceName} · {option.tableName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="small"
                className="size-6 shrink-0 p-0"
                aria-label={t('pipelines.workspace.transform.wizard.removeUnionInput', {
                  source: option.sourceName,
                  table: option.tableName,
                })}
                onClick={() => toggleInput(option.reference, false)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </span>
          ))}
          {selectedOptions.length === 0 && (
            <span className="system-xs-regular text-text-tertiary">
              {t('pipelines.workspace.transform.wizard.unionNoSelection')}
            </span>
          )}
        </div>

        <label className="relative block">
          <Search
            className="text-text-quaternary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t('pipelines.workspace.transform.wizard.unionSearchLabel')}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('pipelines.workspace.transform.wizard.unionSearchPlaceholder')}
            className="w-full pl-9"
          />
        </label>

        {resolvedOptions.length === 0 ? (
          <p className="system-xs-regular text-text-tertiary" role="status">
            {t('pipelines.workspace.transform.wizard.unionNoAdditionalInputs')}
          </p>
        ) : groupedOptions.size === 0 ? (
          <p className="system-xs-regular text-text-tertiary" role="status">
            {t('pipelines.workspace.transform.wizard.unionNoSearchResults')}
          </p>
        ) : (
          <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {[...groupedOptions.entries()].map(([sourceId, group]) => {
              const first = group[0]
              if (!first) return null
              return (
                <div key={sourceId} className="space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <ConnectorIcon
                      connectorId={first.connectorId}
                      name={first.sourceName}
                      iconPath={first.iconPath}
                      size={16}
                      className="size-4"
                    />
                    <span className="system-xs-semibold text-text-secondary">
                      {first.sourceName}
                    </span>
                  </div>
                  {group.map((option) => (
                    <div
                      key={option.reference}
                      data-union-input={option.reference}
                      className="hover:bg-state-base-hover flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2"
                      onClick={() =>
                        toggleInput(option.reference, !value.includes(option.reference))
                      }
                    >
                      <Checkbox
                        aria-label={`${option.sourceName} · ${option.tableName}`}
                        checked={value.includes(option.reference)}
                        onCheckedChange={(checked) =>
                          toggleInput(option.reference, checked === true)
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span className="system-sm-regular text-text-primary min-w-0 truncate">
                        {option.tableName}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {resolvedOptions.length > 0 && value.length === 0 && (
          <p className="system-xs-regular text-text-destructive" role="alert">
            {t('pipelines.workspace.transform.wizard.unionInputRequired')}
          </p>
        )}
      </div>
    </section>
  )
}

/* =========================================================================
   1. Filter Editor Component
   ========================================================================= */
interface FilterEditorProps {
  config: FilterTransformConfig
  columns: string[]
  onChange: (config: FilterTransformConfig) => void
}

const FilterEditor: React.FC<FilterEditorProps> = ({ config, columns, onChange }) => {
  const { t } = useTranslation()
  const parsed = React.useMemo(() => parseWizardFilter(config.expr), [config.expr])
  const conditions: FilterCondition[] = config.conditions?.length
    ? config.conditions
    : parsed?.length
      ? parsed
      : [{ field: '', op: '==', value: '', literalKind: 'auto', valueConfigured: false }]
  const isRawCel = (config.isRawCel ?? false) || (!config.conditions?.length && parsed === null)
  const [modeError, setModeError] = React.useState(false)
  const updateConditions = (nextConditions: FilterCondition[]) => {
    onChange({
      ...config,
      conditions: nextConditions,
      expr: wizardFilterExpression(nextConditions),
    })
  }
  const toggleMode = () => {
    if (!isRawCel) {
      onChange({ ...config, isRawCel: true })
      return
    }
    if (parsed === null) {
      setModeError(true)
      return
    }
    setModeError(false)
    onChange({ ...config, conditions: parsed, isRawCel: false })
  }

  const addCondition = () => {
    const nextCol =
      columns.find((c) => !conditions.some((cond) => cond.field === c)) || columns[0] || ''
    updateConditions([
      ...conditions,
      { field: nextCol, op: '==', value: '', literalKind: 'auto', valueConfigured: false },
    ])
  }

  const removeCondition = (cIdx: number) => {
    const next = [...conditions]
    next.splice(cIdx, 1)
    updateConditions(next)
  }

  const updateSingleCondition = (cIdx: number, patch: Partial<FilterCondition>) => {
    const next = [...conditions]
    next[cIdx] = { ...next[cIdx], ...patch }
    updateConditions(next)
  }

  return (
    <div className="wizard-transform-filter bg-components-panel-bg space-y-3 rounded-xl border border-amber-200/70 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[12px] font-semibold text-amber-950">
            {t('pipelines.workspace.transform.wizard.filterConditions')}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="small"
          className="text-text-accent w-fit"
          onClick={toggleMode}
        >
          {t(
            isRawCel
              ? 'pipelines.workspace.transform.wizard.visualConditionBuilder'
              : 'pipelines.workspace.transform.wizard.rawCelEditor',
          )}
        </Button>
      </div>

      {modeError && (
        <p role="alert" className="text-text-destructive text-xs">
          {t('pipelines.workspace.transform.wizard.visualFilterUnavailable')}
        </p>
      )}
      {!isRawCel ? (
        <div className="space-y-2">
          <div
            className="wizard-condition-group"
            role="group"
            aria-label={t('pipelines.workspace.transform.wizard.conditionsCombinedWithAnd')}
          >
            <div
              className={cn(
                'wizard-condition-group__rail',
                conditions.length > 1 && 'wizard-condition-group__rail--multiple',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'wizard-condition-group__logic',
                  conditions.length > 1
                    ? 'border-amber-300 bg-amber-100 text-amber-800'
                    : 'wizard-condition-group__logic--single border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                {t('pipelines.workspace.transform.wizard.and')}
              </span>
            </div>
            <div className="wizard-condition-group__rows">
              {conditions.map((cond, cIdx) => {
                const schemaOptions: SearchablePickerOption[] = columns.map((column) => ({
                  value: column,
                  label: column,
                  detail: t('pipelines.workspace.transform.wizard.schemaFields'),
                }))
                const envelopeOptions: SearchablePickerOption[] = [
                  {
                    value: 'op',
                    label: t('pipelines.workspace.transform.wizard.operationType'),
                    detail: t('pipelines.workspace.transform.wizard.cdcEnvelopeFields'),
                  },
                  {
                    value: 'ts',
                    label: t('pipelines.workspace.transform.wizard.eventTimestamp'),
                    detail: t('pipelines.workspace.transform.wizard.cdcEnvelopeFields'),
                  },
                  {
                    value: 'src',
                    label: t('pipelines.workspace.transform.wizard.sourceMetadata'),
                    detail: t('pipelines.workspace.transform.wizard.cdcEnvelopeFields'),
                  },
                ].filter(
                  (option) =>
                    !schemaOptions.some((schemaOption) => schemaOption.value === option.value),
                )
                const fieldOptions = [...schemaOptions, ...envelopeOptions]
                if (cond.field && !fieldOptions.some((option) => option.value === cond.field)) {
                  fieldOptions.unshift({ value: cond.field, label: cond.field })
                }

                return (
                  <div key={cIdx} className="wizard-filter-condition">
                    <div className="wizard-filter-field min-w-0">
                      <SearchablePicker
                        ariaLabel={t('pipelines.workspace.transform.field')}
                        emptyLabel={t('pipelines.workspace.transform.wizard.noFieldMatches')}
                        className="min-w-0"
                        onValueChange={(field) => updateSingleCondition(cIdx, { field })}
                        openLabel={t('pipelines.workspace.transform.wizard.openFieldPicker')}
                        options={fieldOptions}
                        placeholder={t('pipelines.workspace.transform.field')}
                        value={cond.field}
                      />
                    </div>
                    {/* Operator */}
                    <div className="wizard-filter-operator min-w-0">
                      <TransformSelect
                        label={t('pipelines.workspace.transform.operator')}
                        value={cond.op}
                        options={[
                          {
                            value: '==',
                            label: `== (${t('pipelines.workspace.transform.wizard.equals')})`,
                          },
                          {
                            value: '!=',
                            label: `!= (${t('pipelines.workspace.transform.wizard.notEquals')})`,
                          },
                          {
                            value: '>',
                            label: `> (${t('pipelines.workspace.transform.wizard.greaterThan')})`,
                          },
                          {
                            value: '<',
                            label: `< (${t('pipelines.workspace.transform.wizard.lessThan')})`,
                          },
                          {
                            value: '>=',
                            label: `>= (${t('pipelines.workspace.transform.wizard.greaterOrEqual')})`,
                          },
                          {
                            value: '<=',
                            label: `<= (${t('pipelines.workspace.transform.wizard.lessOrEqual')})`,
                          },
                          {
                            value: 'contains',
                            label: t('pipelines.workspace.transform.wizard.contains'),
                          },
                          {
                            value: 'starts_with',
                            label: t('pipelines.workspace.transform.wizard.startsWith'),
                          },
                        ]}
                        onChange={(op) =>
                          updateSingleCondition(cIdx, { op: op as FilterCondition['op'] })
                        }
                      />
                    </div>
                    {/* Value Input */}
                    <div className="wizard-filter-value min-w-0">
                      <Input
                        aria-label={t(
                          'pipelines.workspace.transform.wizard.filterValuePlaceholder',
                        )}
                        value={cond.value}
                        onChange={(e) =>
                          updateSingleCondition(cIdx, {
                            value: e.target.value,
                            valueConfigured: true,
                            literalKind: 'auto',
                          })
                        }
                        placeholder={t(
                          'pipelines.workspace.transform.wizard.filterValuePlaceholder',
                        )}
                        className="min-w-0 font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      tone="destructive"
                      className="wizard-filter-remove size-6 p-0"
                      onClick={() => removeCondition(cIdx)}
                      title={t('pipelines.workspace.transform.removeCondition')}
                      aria-label={t('pipelines.workspace.transform.removeCondition')}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="wizard-condition-group__actions flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="w-fit gap-1.5"
              onClick={addCondition}
            >
              <Plus className="h-3 w-3" />
              <span>{t('pipelines.workspace.transform.wizard.addFilterCondition')}</span>
            </Button>

            <span className="min-w-0 font-mono text-[10px] break-words text-amber-700">
              {t('pipelines.workspace.transform.wizard.generatedCel')}:{' '}
              <code className="rounded-lg border border-amber-200 bg-white/80 px-1.5 py-0.5">
                {config.expr || t('pipelines.workspace.transform.wizard.filterDraftHint')}
              </code>
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-amber-900">
            {t('pipelines.workspace.transform.wizard.celExpression')}
          </label>
          <Textarea
            aria-label={t('pipelines.workspace.transform.wizard.celExpression')}
            value={config.expr}
            onValueChange={(expr) => {
              setModeError(false)
              onChange({ ...config, expr, conditions: undefined })
            }}
            rows={2}
            className="min-h-0 w-full rounded-lg border border-amber-300 bg-white p-2 font-mono text-[12px] text-gray-900"
            placeholder={t('pipelines.workspace.transform.wizard.celPlaceholder')}
          />
          <div className="flex items-center gap-1 text-[10px] text-amber-800">
            <Info className="h-3 w-3" />
            <span>
              {t('pipelines.workspace.transform.wizard.celEnvelopeHelp')} <code>op</code>,{' '}
              <code>ts</code>, <code>before</code>, <code>after</code>, <code>schema</code>.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   2. Map Editor Component
   ========================================================================= */
/* =========================================================================
   3. Unwind Editor Component
   ========================================================================= */
interface UnwindEditorProps {
  inheritedSourceIdField: string
  identityPlans?: PipelineTargetIdentity[]
  config: UnwindTransformConfig
  columns: string[]
  onChange: (config: UnwindTransformConfig) => void
}

const UnwindEditor: React.FC<UnwindEditorProps> = ({
  inheritedSourceIdField,
  config,
  columns,
  onChange,
  identityPlans,
}) => {
  const { t } = useTranslation()
  const collision = identityPlans?.some(
    (plan) =>
      plan.status === 'action-required' &&
      plan.reason === 'field-collision' &&
      plan.preservedField === (config.source_id_field ?? inheritedSourceIdField),
  )
  const sourceIdentityId = React.useId()
  const preserveEmptyId = React.useId()
  return (
    <div className="space-y-3 rounded-xl border border-purple-200/70 bg-purple-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-[12px] font-semibold text-purple-950">
            {t('pipelines.workspace.transform.wizard.unwindSettings')}
          </span>
        </div>
        <span className="rounded-lg border border-purple-200 bg-purple-100/70 px-2 py-0.5 text-[11px] text-purple-700">
          {t('pipelines.workspace.transform.wizard.singleLevel')}
        </span>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-purple-200 bg-white p-3 shadow-2xs md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.arrayField')}{' '}
            <span className="text-red-500">*</span>
          </label>
          {columns.length > 0 ? (
            <SearchablePicker
              ariaLabel={t('pipelines.workspace.transform.wizard.arrayField')}
              emptyLabel={t('pipelines.workspace.transform.wizard.noFieldMatches')}
              className="w-full"
              onValueChange={(path) => onChange({ ...config, path })}
              openLabel={t('pipelines.workspace.transform.wizard.openFieldPicker')}
              options={(() => {
                const options: SearchablePickerOption[] = columns.map((column) => ({
                  value: column,
                  label: column,
                }))
                if (config.path && !options.some((option) => option.value === config.path)) {
                  options.unshift({
                    value: config.path,
                    label: config.path,
                    detail: t('pipelines.workspace.transform.wizard.customField'),
                  })
                }
                return options
              })()}
              placeholder={t('pipelines.workspace.transform.wizard.arrayField')}
              value={config.path}
            />
          ) : (
            <Input
              aria-label={t('pipelines.workspace.transform.wizard.arrayField')}
              value={config.path}
              placeholder={t('pipelines.workspace.transform.wizard.arrayField')}
              onChange={(event) => onChange({ ...config, path: event.target.value })}
            />
          )}
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.topLevelArrayHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.elementKey')}
          </label>
          <Input
            aria-label={t('pipelines.workspace.transform.wizard.elementKey')}
            value={config.element_key || ''}
            onChange={(e) => onChange({ ...config, element_key: e.target.value })}
            placeholder={t('pipelines.workspace.transform.wizard.elementKeyPlaceholder')}
            className="w-full font-mono"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.elementKeyHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.arrayIndexField')}
          </label>
          <Input
            aria-label={t('pipelines.workspace.transform.wizard.arrayIndexField')}
            value={config.include_array_index || ''}
            onChange={(e) => onChange({ ...config, include_array_index: e.target.value })}
            placeholder={t('pipelines.workspace.transform.wizard.arrayIndexPlaceholder')}
            className="w-full font-mono"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.arrayIndexHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.elementType')}
          </label>
          <TransformSelect
            label={t('pipelines.workspace.transform.wizard.elementType')}
            value={config.element_type || 'json'}
            options={[
              {
                value: 'json',
                label: `json (${t('pipelines.workspace.transform.wizard.structuredObjectDefault')})`,
              },
              { value: 'string', label: 'string' },
              { value: 'int', label: 'int / integer' },
            ]}
            onChange={(element_type) => onChange({ ...config, element_type })}
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.elementTypeHelp')}
          </span>
        </div>
      </div>

      {/* Preserve Null Checkbox */}
      <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white p-2.5 text-[12px] text-gray-700">
        <Checkbox
          id={preserveEmptyId}
          aria-label={t('pipelines.workspace.transform.wizard.preserveEmptyArrays')}
          checked={config.preserve_null_and_empty_arrays ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...config, preserve_null_and_empty_arrays: checked === true })
          }
        />
        <label htmlFor={preserveEmptyId} className="min-w-0 cursor-pointer">
          <div className="font-semibold text-gray-900">
            {t('pipelines.workspace.transform.wizard.preserveEmptyArrays')}
          </div>
          <p className="text-[10px] text-gray-500">
            {t('pipelines.workspace.transform.wizard.preserveEmptyArraysHelp')}
          </p>
        </label>
      </div>

      <details className="border-border border-t pt-3">
        <summary className="text-foreground cursor-pointer text-sm font-medium">
          {t('pipelines.workspace.transform.wizard.identitySettings')}
        </summary>
        <div className="mt-3 space-y-2">
          <label htmlFor={sourceIdentityId} className="text-foreground text-sm font-medium">
            {t('pipelines.workspace.transform.wizard.sourceIdField')}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={sourceIdentityId}
              value={config.source_id_field ?? inheritedSourceIdField}
              onChange={(event) => onChange({ ...config, source_id_field: event.target.value })}
              onBlur={() => {
                if (config.source_id_field === '')
                  onChange({ ...config, source_id_field: undefined })
              }}
              aria-invalid={collision || undefined}
              aria-describedby={`${sourceIdentityId}-help`}
              className="min-w-0 font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({ ...config, source_id_field: DEFAULT_UNWIND_SOURCE_ID_FIELD })
              }
            >
              {t('pipelines.workspace.transform.wizard.restoreSourceIdDefault')}
            </Button>
          </div>
          {collision && (
            <p className="text-destructive text-xs" role="alert">
              {t('wizard.targetIdentity.reasons.field-collision', {
                preserved: config.source_id_field ?? inheritedSourceIdField,
              })}
            </p>
          )}
          <p id={`${sourceIdentityId}-help`} className="text-muted-foreground text-xs">
            {t('pipelines.workspace.transform.wizard.sourceIdFieldHelp')}
          </p>
        </div>
      </details>

      {/* Risk and Preconditions Callouts */}
      <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        <div className="flex items-center gap-1.5 font-semibold text-amber-950">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{t('pipelines.workspace.transform.wizard.unwindRequirements')}</span>
        </div>
        <ul className="list-disc space-y-0.5 pl-4 text-amber-800">
          <li>
            <strong>{t('pipelines.workspace.transform.wizard.writeMode')}: </strong>
            {t('pipelines.workspace.transform.wizard.writeModeHelp', {
              upsert: 'UPSERT',
              append: 'Append',
            })}
          </li>
          <li>
            <strong>{t('pipelines.workspace.transform.wizard.cdcImages')}: </strong>
            {t('pipelines.workspace.transform.wizard.cdcImagesHelp')}
          </li>
          <li>
            <strong>{t('pipelines.workspace.transform.wizard.keyCollision')}: </strong>
            {t('pipelines.workspace.transform.wizard.keyCollisionHelp', { field: 'element_key' })}
          </li>
        </ul>
      </div>
    </div>
  )
}

/* =========================================================================
   4. JavaScript Editor Component
   ========================================================================= */
interface JsEditorProps {
  config: JsTransformConfig
  onChange: (config: JsTransformConfig) => void
}

const JsEditor: React.FC<JsEditorProps> = ({ config, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileCode2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[12px] font-semibold text-emerald-950">
            {t('pipelines.workspace.transform.wizard.javascriptScript')}
          </span>
        </div>
        <span className="rounded-lg border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 font-mono text-[11px] text-emerald-800">
          GraalVM Runtime
        </span>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-400">process(record, ctx)</span>
          </div>
          <span className="text-[10px]">
            {t('pipelines.workspace.transform.wizard.multilineScript', {
              language: 'JavaScript ES6+',
            })}
          </span>
        </div>

        <Textarea
          aria-label={t('pipelines.workspace.transform.script')}
          value={config.script}
          onValueChange={(script) => onChange({ ...config, script })}
          rows={8}
          spellCheck={false}
          className="min-h-0 w-full resize-y rounded-none border-0 bg-transparent p-0 font-mono text-[12px] leading-relaxed text-emerald-300 shadow-none outline-none placeholder:text-slate-500 hover:border-0 hover:bg-transparent focus:border-0 focus:bg-transparent focus:ring-0"
          placeholder="function process(record, ctx) { return record; }"
        />
      </div>

      {/* Script Context Reference Drawer */}
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-[11px] md:grid-cols-2">
        <div>
          <strong className="mb-1 block text-gray-900">
            📥 {t('pipelines.workspace.transform.wizard.recordObject')}:
          </strong>
          <ul className="list-disc space-y-0.5 pl-4 font-mono text-[10px] text-gray-600">
            <li>
              <code>op</code>: {t('pipelines.workspace.transform.wizard.operationTypeDetail')} ('c',
              'u', 'd', 'r')
            </li>
            <li>
              <code>before</code>: {t('pipelines.workspace.transform.wizard.beforeImage')}
            </li>
            <li>
              <code>after</code>: {t('pipelines.workspace.transform.wizard.afterImage')}
            </li>
            <li>
              <code>ts</code>: {t('pipelines.workspace.transform.wizard.eventTimestampDetail')}
            </li>
            <li>
              <code>src</code>: {t('pipelines.workspace.transform.wizard.sourceMetadataDetail')}
            </li>
          </ul>
        </div>
        <div>
          <strong className="mb-1 block text-gray-900">
            📤 {t('pipelines.workspace.transform.wizard.contextMethods')}:
          </strong>
          <ul className="list-disc space-y-0.5 pl-4 font-mono text-[10px] text-gray-600">
            <li>
              <code>ctx.emit(rec)</code>: {t('pipelines.workspace.transform.wizard.emitRecord')}
            </li>
            <li>
              <code>ctx.log(msg)</code>: {t('pipelines.workspace.transform.wizard.writeDebugLog')}
            </li>
            <li>
              <code>return null</code>: {t('pipelines.workspace.transform.wizard.discardRecord')}
            </li>
            <li>
              <code>return record</code>:{' '}
              {t('pipelines.workspace.transform.wizard.emitRecordDirectly')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export const formatTransformToDsl = (step: TransformStep, defaultFrom: string) => {
  if (step.type === 'filter') {
    return {
      id: step.id,
      type: 'filter',
      from: [defaultFrom],
      expr: step.config.filter?.expr || "op != 'd'",
    }
  }
  if (step.type === 'map') {
    const fieldsObj: Record<string, unknown> = {}
    step.config.map?.fields?.forEach((f) => {
      if (f.ruleType === 'delete') {
        fieldsObj[f.outputField] = false
      } else {
        fieldsObj[f.outputField] = f.value
      }
    })
    return {
      id: step.id,
      type: 'map',
      from: [defaultFrom],
      fields: fieldsObj,
      _passthroughUnlisted: step.config.map?.passthroughUnlisted ?? true,
    }
  }
  if (step.type === 'unwind') {
    return {
      id: step.id,
      type: 'unwind',
      from: [defaultFrom],
      path: step.config.unwind?.path || 'items',
      element_key: step.config.unwind?.element_key || undefined,
      include_array_index: step.config.unwind?.include_array_index || undefined,
      preserve_null_and_empty_arrays: step.config.unwind?.preserve_null_and_empty_arrays ?? false,
      element_type: step.config.unwind?.element_type || 'json',
      source_id_field: step.config.unwind?.source_id_field || undefined,
    }
  }
  if (step.type === 'js') {
    return {
      id: step.id,
      type: 'js',
      from: [defaultFrom],
      script: step.config.js?.script || DEFAULT_JS_SCRIPT,
    }
  }
  if (step.type === 'union') {
    return {
      id: step.id,
      type: 'union',
      from: step.config.union?.from || [defaultFrom],
    }
  }
  return step
}
