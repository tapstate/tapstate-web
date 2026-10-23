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
  X,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineTargetIdentity } from '@/service/pipelines/pipeline-client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { celFilterField } from '../filter-cel'

export const DEFAULT_UNWIND_SOURCE_ID_FIELD = '_unwind_source_id'

export type TransformType = 'filter' | 'map' | 'unwind' | 'js' | 'union'

const DEFAULT_JS_SCRIPT = 'function process(record, ctx) {\n  return record;\n}'
const WIZARD_ADDABLE_TRANSFORM_TYPES: Exclude<TransformType, 'union'>[] = [
  'filter',
  'map',
  'unwind',
  'js',
]

export interface FilterCondition {
  field: string
  op: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in' | 'starts_with'
  value: string
}

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
}

export interface MapTransformConfig {
  fields: MapFieldRule[]
  passthroughUnlisted?: boolean
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

export const TableTransformsManager: React.FC<TableTransformsManagerProps> = ({
  columns = [],
  transforms = [],
  onChange,
  hideHeader = false,
  identityPlans,
  inheritedSourceIdField = DEFAULT_UNWIND_SOURCE_ID_FIELD,
}) => {
  const { t } = useTranslation()
  const [isAddingStep, setIsAddingStep] = React.useState(false)

  const handleCreateStep = (type: Exclude<TransformType, 'union'>) => {
    const newStepId = crypto.randomUUID()
    const initialConfig: TransformStep['config'] =
      type === 'filter'
        ? { filter: { expr: '', conditions: [], isRawCel: false } }
        : type === 'map'
          ? { map: { passthroughUnlisted: true, fields: [] } }
          : type === 'unwind'
            ? { unwind: { path: '' } }
            : { js: { script: DEFAULT_JS_SCRIPT } }

    const newStep: TransformStep = {
      id: newStepId,
      name: `${t(TRANSFORM_TYPE_META[type].titleKey)} (${TRANSFORM_TYPE_META[type].typeName})`,
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

          {!isAddingStep && (
            <button
              type="button"
              onClick={() => setIsAddingStep(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200/90 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 shadow-2xs transition-colors hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('pipelines.workspace.transform.wizard.addTransform')}</span>
            </button>
          )}
        </div>
      )}

      {transforms.length === 0 && !isAddingStep && (
        <button
          type="button"
          onClick={() => setIsAddingStep(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('pipelines.workspace.transform.wizard.addTransform')}
        </button>
      )}

      {/* Step Selector Card (When Adding) */}
      {isAddingStep && (
        <div className="animate-in fade-in zoom-in-95 space-y-3 rounded-xl border-2 border-blue-400 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h4 className="text-[13px] font-semibold text-gray-900">
                {t('pipelines.workspace.transform.wizard.chooseTransformType')}
              </h4>
              <p className="text-[11px] text-gray-500">
                {t('pipelines.workspace.transform.wizard.chooseTransformDescription')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingStep(false)
              }}
              aria-label={t('pipelines.workspace.transform.wizard.closeTransformPicker')}
              title={t('pipelines.workspace.transform.wizard.closeTransformPicker')}
              className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {WIZARD_ADDABLE_TRANSFORM_TYPES.map((type) => {
              const meta = TRANSFORM_TYPE_META[type]
              const IconComp = meta.icon
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCreateStep(type)}
                  className={cn(
                    'group flex cursor-pointer flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150 hover:shadow-xs',
                    'border-gray-200 bg-gray-50/70 hover:border-blue-300 hover:bg-white',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={cn('rounded-lg border p-1.5 text-[11px]', meta.badgeColor)}>
                        <IconComp className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-mono text-[10px] font-medium text-gray-400 group-hover:text-blue-600">
                        {meta.typeName}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-gray-900 group-hover:text-blue-700">
                        {t(meta.titleKey)}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-gray-500">
                        {t(meta.descriptionKey)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center pt-2 text-[10px] font-medium text-blue-600 transition-transform group-hover:translate-x-0.5">
                    <span>{t('pipelines.workspace.transform.wizard.configureStep')}</span>
                    <ArrowRight className="ml-0.5 h-3 w-3" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Transform Steps Ordered List */}
      <div className="space-y-2.5">
        {transforms.map((step, idx) => {
          const meta = TRANSFORM_TYPE_META[step.type]
          const IconComp = meta.icon

          return (
            <div
              key={step.id}
              className={cn(
                'overflow-hidden rounded-xl border bg-white shadow-2xs transition-all duration-150',
                step.isExpanded
                  ? 'border-gray-300 ring-1 ring-black/5'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              {/* Step Header */}
              <div
                onClick={() =>
                  updateStep(idx, (prev) => ({ ...prev, isExpanded: !prev.isExpanded }))
                }
                className="flex cursor-pointer items-center justify-between border-b border-gray-100 bg-gray-50/70 px-3.5 py-2.5 hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-lg bg-gray-200/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-gray-400">
                    #{idx + 1}
                  </span>

                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium',
                      meta.badgeColor,
                    )}
                  >
                    <IconComp className="h-3 w-3" />
                    <span>{t(meta.titleKey)}</span>
                  </span>

                  <span className="font-mono text-[10px] text-gray-400">{meta.typeName}</span>
                </div>

                <div
                  className="flex shrink-0 items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Move Up/Down */}
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, 'up')}
                      className="cursor-pointer p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title={t('pipelines.workspace.transform.wizard.moveStepUp')}
                      aria-label={t('pipelines.workspace.transform.wizard.moveStepUp')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === transforms.length - 1}
                      onClick={() => moveStep(idx, 'down')}
                      className="cursor-pointer border-l border-gray-200 p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title={t('pipelines.workspace.transform.wizard.moveStepDown')}
                      aria-label={t('pipelines.workspace.transform.wizard.moveStepDown')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title={t('pipelines.workspace.transform.wizard.removeStep')}
                    aria-label={t('pipelines.workspace.transform.wizard.removeStep')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateStep(idx, (prev) => ({ ...prev, isExpanded: !prev.isExpanded }))
                    }
                    className="cursor-pointer rounded-lg p-1 text-gray-400 hover:text-gray-600"
                    title={t(
                      step.isExpanded
                        ? 'pipelines.workspace.transform.wizard.collapseStep'
                        : 'pipelines.workspace.transform.wizard.expandStep',
                    )}
                    aria-label={t(
                      step.isExpanded
                        ? 'pipelines.workspace.transform.wizard.collapseStep'
                        : 'pipelines.workspace.transform.wizard.expandStep',
                    )}
                  >
                    {step.isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {step.type === 'union' && (
                <p
                  role="alert"
                  className="border-b border-rose-200 bg-rose-50 px-3.5 py-2 text-[12px] text-rose-800"
                >
                  {t('pipelines.workspace.transform.wizard.unionWizardUnavailable')}
                </p>
              )}

              {/* Step Expanded Editor Body */}
              {step.isExpanded && (
                <div className="space-y-4 p-4">
                  {/* Step Name Renaming Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        {t('pipelines.workspace.transform.wizard.stepName')}
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                          const val = e.target.value
                          updateStep(idx, (prev) => ({ ...prev, name: val }))
                        }}
                        placeholder={t('pipelines.workspace.transform.wizard.stepNamePlaceholder')}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50/80 px-2.5 py-1.5 text-[12px] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="w-48">
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        {t('pipelines.workspace.transform.wizard.dslId')}
                      </label>
                      <input
                        type="text"
                        value={step.id}
                        onChange={(e) => {
                          const val = e.target.value
                          updateStep(idx, (prev) => ({ ...prev, id: val }))
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-1.5 font-mono text-[11px] text-gray-700 focus:outline-none"
                      />
                    </div>
                  </div>

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

                  {step.type === 'union' && step.config.union?.from?.length ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-xs text-rose-900">
                      {step.config.union.from.join(' → ')}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {transforms.length > 0 && !isAddingStep && (
        <button
          type="button"
          onClick={() => setIsAddingStep(true)}
          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-2xs transition-all hover:border-gray-400 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:scale-110" />
          {t('pipelines.workspace.transform.wizard.addNextStep')}
        </button>
      )}
    </div>
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
  const isRawCel = config.isRawCel ?? false
  const conditions = config.conditions || []

  const updateConditions = (nextConds: FilterCondition[]) => {
    // Generate CEL expression automatically
    const expr =
      nextConds.length === 0
        ? ''
        : nextConds
            .map((c) => {
              const literal = JSON.stringify(c.value)
              const field = celFilterField(c.field)
              if (c.op === 'contains') return `${field}.contains(${literal})`
              if (c.op === 'starts_with') return `${field}.startsWith(${literal})`
              return `${field} ${c.op} ${literal}`
            })
            .join(' && ')

    onChange({
      ...config,
      conditions: nextConds,
      expr,
    })
  }

  const addCondition = () => {
    const nextCol =
      columns.find((c) => !conditions.some((cond) => cond.field === c)) || columns[0] || ''
    updateConditions([...conditions, { field: nextCol, op: '==', value: '' }])
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
    <div className="space-y-3 rounded-xl border border-amber-200/70 bg-amber-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[12px] font-semibold text-amber-950">
            {t('pipelines.workspace.transform.wizard.filterConditions')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, isRawCel: !isRawCel })}
          className="cursor-pointer text-[11px] font-medium text-amber-800 underline hover:text-amber-950"
        >
          {t(
            isRawCel
              ? 'pipelines.workspace.transform.wizard.visualConditionBuilder'
              : 'pipelines.workspace.transform.wizard.rawCelEditor',
          )}
        </button>
      </div>

      {!isRawCel ? (
        <div className="space-y-2">
          {conditions.map((cond, cIdx) => (
            <div
              key={cIdx}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-white p-2 shadow-2xs"
            >
              {cIdx > 0 && (
                <span className="rounded-lg border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  {t('pipelines.workspace.transform.wizard.and')}
                </span>
              )}

              {/* Field Select */}
              <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[12px]">
                <select
                  value={cond.field}
                  onChange={(e) => updateSingleCondition(cIdx, { field: e.target.value })}
                  className="cursor-pointer bg-transparent font-medium text-gray-900 focus:outline-none"
                >
                  <optgroup label={t('pipelines.workspace.transform.wizard.schemaFields')}>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('pipelines.workspace.transform.wizard.cdcEnvelopeFields')}>
                    <option value="op">
                      {t('pipelines.workspace.transform.wizard.operationType')}
                    </option>
                    <option value="ts">
                      {t('pipelines.workspace.transform.wizard.eventTimestamp')}
                    </option>
                    <option value="src">
                      {t('pipelines.workspace.transform.wizard.sourceMetadata')}
                    </option>
                  </optgroup>
                </select>
              </div>

              {/* Operator */}
              <select
                value={cond.op}
                onChange={(e) =>
                  updateSingleCondition(cIdx, { op: e.target.value as FilterCondition['op'] })
                }
                className="cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[12px] text-gray-800 focus:outline-none"
              >
                <option value="==">== ({t('pipelines.workspace.transform.wizard.equals')})</option>
                <option value="!=">
                  != ({t('pipelines.workspace.transform.wizard.notEquals')})
                </option>
                <option value=">">
                  &gt; ({t('pipelines.workspace.transform.wizard.greaterThan')})
                </option>
                <option value="<">
                  &lt; ({t('pipelines.workspace.transform.wizard.lessThan')})
                </option>
                <option value=">=">
                  &gt;= ({t('pipelines.workspace.transform.wizard.greaterOrEqual')})
                </option>
                <option value="<=">
                  &lt;= ({t('pipelines.workspace.transform.wizard.lessOrEqual')})
                </option>
                <option value="contains">
                  contains ({t('pipelines.workspace.transform.wizard.contains')})
                </option>
                <option value="starts_with">
                  startsWith ({t('pipelines.workspace.transform.wizard.startsWith')})
                </option>
              </select>

              {/* Value Input */}
              <input
                type="text"
                value={cond.value}
                onChange={(e) => updateSingleCondition(cIdx, { value: e.target.value })}
                placeholder={t('pipelines.workspace.transform.wizard.filterValuePlaceholder')}
                className="min-w-[120px] flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] text-gray-900 focus:border-amber-500 focus:outline-none"
              />

              {conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(cIdx)}
                  title={t('pipelines.workspace.transform.removeCondition')}
                  aria-label={t('pipelines.workspace.transform.removeCondition')}
                  className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={addCondition}
              className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 hover:underline"
            >
              <Plus className="h-3 w-3" />
              <span>{t('pipelines.workspace.transform.wizard.addFilterCondition')}</span>
            </button>

            <span className="font-mono text-[10px] text-amber-700">
              {t('pipelines.workspace.transform.wizard.generatedCel')}:{' '}
              <code className="rounded-lg border border-amber-200 bg-white/80 px-1.5 py-0.5">
                {config.expr}
              </code>
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-amber-900">
            {t('pipelines.workspace.transform.wizard.celExpression')}
          </label>
          <textarea
            value={config.expr}
            onChange={(e) => onChange({ ...config, expr: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-amber-300 bg-white p-2 font-mono text-[12px] text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
interface MapEditorProps {
  config: MapTransformConfig
  columns: string[]
  onChange: (config: MapTransformConfig) => void
}

const MapEditor: React.FC<MapEditorProps> = ({ config, columns, onChange }) => {
  const { t } = useTranslation()
  const fields = config.fields || []
  const passthrough = config.passthroughUnlisted ?? true

  const updateFields = (nextFields: MapFieldRule[]) => {
    onChange({ ...config, fields: nextFields })
  }

  const addFieldRule = () => {
    const defaultCol = columns[0] || 'field_name'
    updateFields([
      ...fields,
      {
        id: `map_${Date.now()}`,
        outputField: `new_${defaultCol}`,
        ruleType: 'rename',
        value: `$${defaultCol}`,
      },
    ])
  }

  const removeFieldRule = (idx: number) => {
    const next = [...fields]
    next.splice(idx, 1)
    updateFields(next)
  }

  const updateFieldRule = (idx: number, patch: Partial<MapFieldRule>) => {
    const next = [...fields]
    const updated = { ...next[idx], ...patch }

    // If changing ruleType, update value prefix appropriately
    if (patch.ruleType && patch.ruleType !== next[idx].ruleType) {
      if (patch.ruleType === 'rename') updated.value = `$${columns[0] || 'id'}`
      else if (patch.ruleType === 'delete') updated.value = 'false'
      else if (patch.ruleType === 'compute') updated.value = `=after.${columns[0] || 'id'}`
      else if (patch.ruleType === 'literal') updated.value = "'default_value'"
    }

    next[idx] = updated
    updateFields(next)
  }

  return (
    <div className="space-y-3 rounded-xl border border-blue-200/70 bg-blue-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[12px] font-semibold text-blue-950">
            {t('pipelines.workspace.transform.wizard.mapRules')}
          </span>
        </div>
        <span className="rounded-lg border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-[11px] text-blue-700">
          {t('pipelines.workspace.transform.wizard.applyInOrder')}
        </span>
      </div>

      {/* Crucial Passthrough Callout */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-medium">
            💡 {t('pipelines.workspace.transform.wizard.passthroughSummary')}
          </p>
          <p className="text-blue-700">{t('pipelines.workspace.transform.wizard.mapRuleHelp')}</p>
        </div>
      </div>

      {/* Field Mapping Rows */}
      <div className="space-y-2">
        {fields.map((rule, fIdx) => (
          <div
            key={rule.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-white p-2.5 shadow-2xs"
          >
            {/* Output Field Name */}
            <div className="w-36">
              <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                {t('pipelines.workspace.transform.wizard.outputField')}
              </label>
              <input
                type="text"
                value={rule.outputField}
                onChange={(e) => updateFieldRule(fIdx, { outputField: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[12px] text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Rule Type */}
            <div className="w-36">
              <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                {t('pipelines.workspace.transform.wizard.ruleType')}
              </label>
              <select
                value={rule.ruleType}
                onChange={(e) =>
                  updateFieldRule(fIdx, { ruleType: e.target.value as MapFieldRule['ruleType'] })
                }
                className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[12px] font-medium text-gray-800 focus:outline-none"
              >
                <option value="rename">
                  {t('pipelines.workspace.transform.wizard.renameRule')}
                </option>
                <option value="compute">
                  {t('pipelines.workspace.transform.wizard.computeRule')}
                </option>
                <option value="delete">
                  {t('pipelines.workspace.transform.wizard.deleteRule')}
                </option>
                <option value="literal">
                  {t('pipelines.workspace.transform.wizard.literalRule')}
                </option>
              </select>
            </div>

            {/* Value Expression */}
            <div className="min-w-[160px] flex-1">
              <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                {t('pipelines.workspace.transform.wizard.ruleValue')}
              </label>
              {rule.ruleType === 'delete' ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-red-700">
                  false ({t('pipelines.workspace.transform.wizard.fieldWillBeDropped')})
                </div>
              ) : (
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateFieldRule(fIdx, { value: e.target.value })}
                  placeholder={
                    rule.ruleType === 'rename'
                      ? '$old_field_name'
                      : rule.ruleType === 'compute'
                        ? '=after.first_name + " " + after.last_name'
                        : t('pipelines.workspace.transform.wizard.literalValuePlaceholder')
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeFieldRule(fIdx)}
              title={t('pipelines.workspace.transform.wizard.removeRule')}
              aria-label={t('pipelines.workspace.transform.wizard.removeRule')}
              className="mt-4 cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addFieldRule}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 hover:underline"
        >
          <Plus className="h-3 w-3" />
          <span>{t('pipelines.workspace.transform.wizard.addFieldRule')}</span>
        </button>

        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
          <input
            type="checkbox"
            checked={passthrough}
            disabled
            title={t('pipelines.workspace.transform.wizard.passthroughDisabledHelp')}
            className="rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>{t('pipelines.workspace.transform.wizard.passthroughUnlisted')}</span>
        </label>
      </div>
    </div>
  )
}

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
          <select
            value={config.path}
            onChange={(e) => onChange({ ...config, path: e.target.value })}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:outline-none"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
            {!columns.includes(config.path) && config.path && (
              <option value={config.path}>
                {config.path} ({t('pipelines.workspace.transform.wizard.customField')})
              </option>
            )}
          </select>
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.topLevelArrayHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.elementKey')}
          </label>
          <input
            type="text"
            value={config.element_key || ''}
            onChange={(e) => onChange({ ...config, element_key: e.target.value })}
            placeholder={t('pipelines.workspace.transform.wizard.elementKeyPlaceholder')}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:border-purple-500 focus:outline-none"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.elementKeyHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.arrayIndexField')}
          </label>
          <input
            type="text"
            value={config.include_array_index || ''}
            onChange={(e) => onChange({ ...config, include_array_index: e.target.value })}
            placeholder={t('pipelines.workspace.transform.wizard.arrayIndexPlaceholder')}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:border-purple-500 focus:outline-none"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.arrayIndexHelp')}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            {t('pipelines.workspace.transform.wizard.elementType')}
          </label>
          <select
            value={config.element_type || 'json'}
            onChange={(e) => onChange({ ...config, element_type: e.target.value })}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:outline-none"
          >
            <option value="json">
              json ({t('pipelines.workspace.transform.wizard.structuredObjectDefault')})
            </option>
            <option value="string">string</option>
            <option value="int">int / integer</option>
          </select>
          <span className="mt-0.5 block text-[10px] text-gray-400">
            {t('pipelines.workspace.transform.wizard.elementTypeHelp')}
          </span>
        </div>
      </div>

      {/* Preserve Null Checkbox */}
      <div className="rounded-lg border border-purple-200 bg-white p-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-gray-700">
          <input
            type="checkbox"
            checked={config.preserve_null_and_empty_arrays ?? false}
            onChange={(e) =>
              onChange({ ...config, preserve_null_and_empty_arrays: e.target.checked })
            }
            className="rounded-lg border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <div>
            <span className="font-semibold text-gray-900">
              {t('pipelines.workspace.transform.wizard.preserveEmptyArrays')}
            </span>
            <p className="text-[10px] text-gray-500">
              {t('pipelines.workspace.transform.wizard.preserveEmptyArraysHelp')}
            </p>
          </div>
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

        <textarea
          value={config.script}
          onChange={(e) => onChange({ ...config, script: e.target.value })}
          rows={8}
          spellCheck={false}
          className="w-full resize-y bg-transparent font-mono text-[12px] leading-relaxed text-emerald-300 focus:outline-none"
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
