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
  AlertTriangle,
  Info,
  CheckCircle2,
  Code,
  ArrowRight,
  ShieldAlert,
  Database,
  X,
} from 'lucide-react'
import React from 'react'

import { cn } from '@/lib/utils'

export type TransformType = 'filter' | 'map' | 'unwind' | 'js' | 'union'

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

export interface TableTransformsManagerProps {
  tableName: string
  sourceName?: string
  columns: string[]
  availableUpstreamSources?: string[]
  transforms: TransformStep[]
  onChange: (transforms: TransformStep[]) => void
}

const TRANSFORM_TYPE_META: Record<
  TransformType,
  {
    title: string
    typeName: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    badgeColor: string
    borderColor: string
    activeBg: string
  }
> = {
  filter: {
    title: '筛选记录',
    typeName: 'Filter',
    description: '只让符合条件的行或事件继续向下游流动 (CEL 布尔表达式)',
    icon: Filter,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-amber-300',
    activeBg: 'bg-amber-50/50',
  },
  map: {
    title: '整理字段',
    typeName: 'Map',
    description: '重命名、删除、计算输出字段或注入固定常量 (默认未配置字段透传)',
    icon: Layers,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    activeBg: 'bg-blue-50/50',
  },
  unwind: {
    title: '展开数组',
    typeName: 'Unwind',
    description: '将记录中的数组展开为多行记录，建立子元素独立行身份',
    icon: Workflow,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-300',
    activeBg: 'bg-purple-50/50',
  },
  js: {
    title: '编写处理逻辑',
    typeName: 'JavaScript',
    description: '使用 process(record, ctx) 编写自定义事件过滤、转换与分发逻辑',
    icon: FileCode2,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    activeBg: 'bg-emerald-50/50',
  },
  union: {
    title: '合并数据流',
    typeName: 'Union',
    description: '把多个输入流汇聚成一路继续处理 (不自动对齐字段或去重)',
    icon: Sparkles,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    borderColor: 'border-rose-300',
    activeBg: 'bg-rose-50/50',
  },
}

export const TableTransformsManager: React.FC<TableTransformsManagerProps> = ({
  tableName,
  columns = [],
  availableUpstreamSources = [],
  transforms = [],
  onChange,
}) => {
  const [isAddingStep, setIsAddingStep] = React.useState(false)

  const handleCreateStep = (type: TransformType) => {
    const newStepId = crypto.randomUUID()
    const initialConfig: TransformStep['config'] =
      type === 'filter'
        ? { filter: { expr: '', conditions: [], isRawCel: false } }
        : type === 'map'
          ? { map: { passthroughUnlisted: true, fields: [] } }
          : type === 'unwind'
            ? { unwind: { path: '' } }
            : type === 'js'
              ? { js: { script: '' } }
              : { union: { from: [] } }

    const newStep: TransformStep = {
      id: newStepId,
      name: `${TRANSFORM_TYPE_META[type].title} (${TRANSFORM_TYPE_META[type].typeName})`,
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
      {/* Header & Step Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
            <Workflow className="h-3.5 w-3.5 text-blue-600" />
            <span>Transforms (预处理链条)</span>
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-400">
            {transforms.length} steps
          </span>
        </div>

        {!isAddingStep && (
          <button
            type="button"
            onClick={() => setIsAddingStep(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200/90 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 shadow-2xs transition-colors hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>添加 Transform</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {transforms.length === 0 && !isAddingStep && (
        <div className="wizard-reference-panel-radius border border-dashed border-gray-200 bg-gray-50/80 px-4 py-5 text-center">
          <Workflow className="mx-auto mb-1.5 h-7 w-7 text-gray-300" />
          <p className="mb-0.5 text-[12px] font-medium text-gray-600">尚未配置预处理转换步骤</p>
          <p className="mx-auto mb-3 max-w-md text-[11px] text-gray-400">
            在数据进入 Join 或装配前，进行过滤、字段重命名/计算、数组展开或自定义 JS 处理。
          </p>
          <button
            type="button"
            onClick={() => setIsAddingStep(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[12px] font-medium text-blue-700 shadow-2xs transition-colors hover:bg-blue-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>添加第一个 Transform</span>
          </button>
        </div>
      )}

      {/* Step Selector Card (When Adding) */}
      {isAddingStep && (
        <div className="animate-in fade-in zoom-in-95 wizard-reference-panel-radius space-y-3 border-2 border-blue-400 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h4 className="text-[13px] font-semibold text-gray-900">选择 Transform 目标类型</h4>
              <p className="text-[11px] text-gray-500">按你的数据处理目标选择，配置将就地完成</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingStep(false)
              }}
              className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {(Object.keys(TRANSFORM_TYPE_META) as TransformType[]).map((type) => {
              const meta = TRANSFORM_TYPE_META[type]
              const IconComp = meta.icon
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCreateStep(type)}
                  className={cn(
                    'group wizard-reference-panel-radius flex cursor-pointer flex-col justify-between border p-2.5 text-left transition-all duration-150 hover:shadow-xs',
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
                        {meta.title}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-gray-500">
                        {meta.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center pt-2 text-[10px] font-medium text-blue-600 transition-transform group-hover:translate-x-0.5">
                    <span>配置步骤</span>
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
                'wizard-reference-panel-radius overflow-hidden border bg-white shadow-2xs transition-all duration-150',
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
                className="flex cursor-pointer items-center justify-between border-b border-gray-100 bg-gray-50/70 px-3.5 py-2.5 select-none hover:bg-gray-50"
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
                    <span>{meta.title}</span>
                  </span>

                  <span className="truncate text-[12px] font-medium text-gray-800">
                    {step.name || step.id}
                  </span>

                  <span className="rounded-lg border border-gray-200/80 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                    id: {step.id}
                  </span>
                </div>

                <div
                  className="flex shrink-0 items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Status Indicator */}
                  <span className="flex items-center gap-1 rounded-lg border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>字段已核对</span>
                  </span>

                  {/* Move Up/Down */}
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, 'up')}
                      className="cursor-pointer p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="上移步骤"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === transforms.length - 1}
                      onClick={() => moveStep(idx, 'down')}
                      className="cursor-pointer border-l border-gray-200 p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="下移步骤"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="删除此步骤"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateStep(idx, (prev) => ({ ...prev, isExpanded: !prev.isExpanded }))
                    }
                    className="cursor-pointer rounded-lg p-1 text-gray-400 hover:text-gray-600"
                  >
                    {step.isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step Expanded Editor Body */}
              {step.isExpanded && (
                <div className="space-y-4 p-4">
                  {/* Step Name Renaming Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        步骤描述名称
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                          const val = e.target.value
                          updateStep(idx, (prev) => ({ ...prev, name: val }))
                        }}
                        placeholder="例如：过滤已取消订单 / 格式化收件人"
                        className="w-full rounded-lg border border-gray-300 bg-gray-50/80 px-2.5 py-1.5 text-[12px] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="w-48">
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        系统 DSL ID
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
                          script: `function process(record, ctx) {\n  return record;\n}`,
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

                  {/* 5. UNION TYPE EDITOR */}
                  {step.type === 'union' && (
                    <UnionEditor
                      config={step.config.union || { from: [tableName] }}
                      currentTable={tableName}
                      availableUpstreamSources={availableUpstreamSources}
                      onChange={(newUnion) =>
                        updateStep(idx, (prev) => ({
                          ...prev,
                          config: { ...prev.config, union: newUnion },
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
  const isRawCel = config.isRawCel ?? false
  const conditions = config.conditions || []

  const updateConditions = (nextConds: FilterCondition[]) => {
    // Generate CEL expression automatically
    const expr =
      nextConds.length === 0
        ? ''
        : nextConds
            .map((c) => {
              if (c.op === 'contains') return `${c.field}.contains(${c.value})`
              if (c.op === 'starts_with') return `${c.field}.startsWith(${c.value})`
              return `${c.field} ${c.op} ${c.value}`
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
    <div className="wizard-reference-panel-radius space-y-3 border border-amber-200/70 bg-amber-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[12px] font-semibold text-amber-950">
            筛选规则配置 (Filter Conditions)
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, isRawCel: !isRawCel })}
          className="cursor-pointer text-[11px] font-medium text-amber-800 underline hover:text-amber-950"
        >
          {isRawCel ? '切换到可视化条件构建器' : '直接编辑 CEL 原生表达式'}
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
                  AND
                </span>
              )}

              {/* Field Select */}
              <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[12px]">
                <select
                  value={cond.field}
                  onChange={(e) => updateSingleCondition(cIdx, { field: e.target.value })}
                  className="cursor-pointer bg-transparent font-medium text-gray-900 focus:outline-none"
                >
                  <optgroup label="发现的 Schema 字段">
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="CDC 事件 Envelope 字段">
                    <option value="op">op (操作类型 c/u/d/r)</option>
                    <option value="ts">ts (时间戳)</option>
                    <option value="src">src (数据源信息)</option>
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
                <option value="==">== (等于)</option>
                <option value="!=">!= (不等于)</option>
                <option value=">">&gt; (大于)</option>
                <option value="<">&lt; (小于)</option>
                <option value=">=">&gt;= (大于等于)</option>
                <option value="<=">&lt;= (小于等于)</option>
                <option value="contains">contains (包含)</option>
                <option value="starts_with">startsWith (前缀匹配)</option>
              </select>

              {/* Value Input */}
              <input
                type="text"
                value={cond.value}
                onChange={(e) => updateSingleCondition(cIdx, { value: e.target.value })}
                placeholder="'ACTIVE' 或 100"
                className="min-w-[120px] flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] text-gray-900 focus:border-amber-500 focus:outline-none"
              />

              {conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(cIdx)}
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
              <span>添加筛选条件 (AND)</span>
            </button>

            <span className="font-mono text-[10px] text-amber-700">
              生成的 CEL:{' '}
              <code className="rounded-lg border border-amber-200 bg-white/80 px-1.5 py-0.5">
                {config.expr}
              </code>
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-amber-900">
            CEL (Common Expression Language) 表达式
          </label>
          <textarea
            value={config.expr}
            onChange={(e) => onChange({ ...config, expr: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-amber-300 bg-white p-2 font-mono text-[12px] text-gray-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            placeholder="例如: op != 'd' && after.amount > 0"
          />
          <div className="flex items-center gap-1 text-[10px] text-amber-800">
            <Info className="h-3 w-3" />
            <span>
              表达式作用于事件 Envelope，可访问 <code>op</code>, <code>ts</code>,{' '}
              <code>before</code>, <code>after</code>, <code>schema</code>。
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
    <div className="wizard-reference-panel-radius space-y-3 border border-blue-200/70 bg-blue-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[12px] font-semibold text-blue-950">
            字段整理与映射规则 (Field Mapping Rules)
          </span>
        </div>
        <span className="rounded-lg border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-[11px] text-blue-700">
          按顺序依次应用
        </span>
      </div>

      {/* Crucial Passthrough Callout */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-medium">
            💡 <strong>默认透传行为说明：</strong>未在此列表中声明的输入字段将
            <strong>自动完整透传</strong>。
          </p>
          <p className="text-blue-700">
            你只需要为需要重命名（<code>$old</code>）、删除（<code>false</code>）、计算（
            <code>=expr</code>）或注入常量的字段添加规则。
          </p>
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
                输出字段名 (Target)
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
                处理规则 (Type)
              </label>
              <select
                value={rule.ruleType}
                onChange={(e) =>
                  updateFieldRule(fIdx, { ruleType: e.target.value as MapFieldRule['ruleType'] })
                }
                className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[12px] font-medium text-gray-800 focus:outline-none"
              >
                <option value="rename">重命名/取值 ($field)</option>
                <option value="compute">CEL 计算 (=expr)</option>
                <option value="delete">删除字段 (false)</option>
                <option value="literal">新增固定值 (literal)</option>
              </select>
            </div>

            {/* Value Expression */}
            <div className="min-w-[160px] flex-1">
              <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
                规则值 / 表达式 (DSL Value)
              </label>
              {rule.ruleType === 'delete' ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-red-700">
                  false (该字段将被丢弃不输出)
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
                        : '"west" 或 100'
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeFieldRule(fIdx)}
              className="mt-4 cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="删除此规则"
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
          <span>添加字段映射 (Add Field Rule)</span>
        </button>

        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
          <input
            type="checkbox"
            checked={passthrough}
            disabled
            title="The current server always passes through unlisted fields."
            className="rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>允许未声明字段自动透传 (默认开启)</span>
        </label>
      </div>
    </div>
  )
}

/* =========================================================================
   3. Unwind Editor Component
   ========================================================================= */
interface UnwindEditorProps {
  config: UnwindTransformConfig
  columns: string[]
  onChange: (config: UnwindTransformConfig) => void
}

const UnwindEditor: React.FC<UnwindEditorProps> = ({ config, columns, onChange }) => {
  return (
    <div className="wizard-reference-panel-radius space-y-3 border border-purple-200/70 bg-purple-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-[12px] font-semibold text-purple-950">
            数组展开配置 (Array Unwind)
          </span>
        </div>
        <span className="rounded-lg border border-purple-200 bg-purple-100/70 px-2 py-0.5 text-[11px] text-purple-700">
          单层展开
        </span>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-purple-200 bg-white p-3 shadow-2xs md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            要展开的数组字段 (path) <span className="text-red-500">*</span>
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
              <option value={config.path}>{config.path} (自定义字段)</option>
            )}
          </select>
          <span className="mt-0.5 block text-[10px] text-gray-400">
            只支持顶层数组字段展开，不支持嵌套点路径
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            元素内部主键标识 (element_key)
          </label>
          <input
            type="text"
            value={config.element_key || ''}
            onChange={(e) => onChange({ ...config, element_key: e.target.value })}
            placeholder="例如: sku, item_id, id"
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:border-purple-500 focus:outline-none"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            用于识别行身份并与父记录主键组合生成目标行键
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            生成数组序号列名 (include_array_index)
          </label>
          <input
            type="text"
            value={config.include_array_index || ''}
            onChange={(e) => onChange({ ...config, include_array_index: e.target.value })}
            placeholder="例如: item_no, idx (从 0 开始)"
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:border-purple-500 focus:outline-none"
          />
          <span className="mt-0.5 block text-[10px] text-gray-400">
            无 element_key 时可用序号区分元素
          </span>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-700">
            展开列类型声明 (element_type)
          </label>
          <select
            value={config.element_type || 'json'}
            onChange={(e) => onChange({ ...config, element_type: e.target.value })}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 font-mono text-[12px] text-gray-900 focus:outline-none"
          >
            <option value="json">json (默认结构化对象)</option>
            <option value="string">string</option>
            <option value="int">int / integer</option>
          </select>
          <span className="mt-0.5 block text-[10px] text-gray-400">
            仅声明输出列数据类型，不转换实际物理值
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
              保留空数组或缺失记录 (preserve_null_and_empty_arrays)
            </span>
            <p className="text-[10px] text-gray-500">
              勾选后，若数组为空或 null，仍会保留一条父记录，展开列置空。
            </p>
          </div>
        </label>
      </div>

      {/* Risk and Preconditions Callouts */}
      <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        <div className="flex items-center gap-1.5 font-semibold text-amber-950">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Unwind 运行前置条件与风险提示</span>
        </div>
        <ul className="list-disc space-y-0.5 pl-4 text-amber-800">
          <li>
            <strong>下游写入模式：</strong>必须使用 <code>UPSERT</code> 写入目标端，不支持{' '}
            <code>Append</code> 模式。
          </li>
          <li>
            <strong>CDC 完整镜像：</strong>MySQL 需完整 row image，MongoDB 需启用 collection
            pre-images。
          </li>
          <li>
            <strong>键冲突防范：</strong>请确保 <code>element_key</code>{' '}
            在父记录范围内唯一，防止目标端数据覆盖。
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
  return (
    <div className="wizard-reference-panel-radius space-y-3 border border-emerald-200/70 bg-emerald-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileCode2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[12px] font-semibold text-emerald-950">
            自定义处理脚本 (JavaScript process)
          </span>
        </div>
        <span className="rounded-lg border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 font-mono text-[11px] text-emerald-800">
          GraalVM Runtime
        </span>
      </div>

      <div className="wizard-reference-panel-radius space-y-2 border border-slate-700 bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-400">process(record, ctx)</span>
          </div>
          <span className="text-[10px]">支持多行 JavaScript ES6+</span>
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
          <strong className="mb-1 block text-gray-900">📥 record 事件对象:</strong>
          <ul className="list-disc space-y-0.5 pl-4 font-mono text-[10px] text-gray-600">
            <li>
              <code>op</code>: 操作类型 ('c', 'u', 'd', 'r')
            </li>
            <li>
              <code>before</code>: 变更前镜像数据
            </li>
            <li>
              <code>after</code>: 变更后镜像数据
            </li>
            <li>
              <code>ts</code>: 事件时间戳
            </li>
            <li>
              <code>src</code>: 上游数据源元数据
            </li>
          </ul>
        </div>
        <div>
          <strong className="mb-1 block text-gray-900">📤 ctx 上下文方法:</strong>
          <ul className="list-disc space-y-0.5 pl-4 font-mono text-[10px] text-gray-600">
            <li>
              <code>ctx.emit(rec)</code>: 分发一条记录 (可多次调用)
            </li>
            <li>
              <code>ctx.log(msg)</code>: 输出调试诊断日志
            </li>
            <li>
              <code>return null</code>: 丢弃当前记录
            </li>
            <li>
              <code>return record</code>: 直接发出该记录
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   5. Union Editor Component
   ========================================================================= */
interface UnionEditorProps {
  config: UnionTransformConfig
  currentTable: string
  availableUpstreamSources: string[]
  onChange: (config: UnionTransformConfig) => void
}

const UnionEditor: React.FC<UnionEditorProps> = ({
  config,
  currentTable,
  availableUpstreamSources,
  onChange,
}) => {
  const fromSources = config.from || [currentTable]

  const addSource = (source: string) => {
    if (!fromSources.includes(source)) {
      onChange({ ...config, from: [...fromSources, source] })
    }
  }

  const removeSource = (idx: number) => {
    const next = [...fromSources]
    next.splice(idx, 1)
    onChange({ ...config, from: next })
  }

  return (
    <div className="wizard-reference-panel-radius space-y-3 border border-rose-200/70 bg-rose-50/30 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-rose-600" />
          <span className="text-[12px] font-semibold text-rose-950">
            合并数据流来源 (Union Streams)
          </span>
        </div>
        <span className="rounded-lg border border-rose-200 bg-rose-100/70 px-2 py-0.5 text-[11px] text-rose-700">
          多路汇聚 (Fan-in)
        </span>
      </div>

      {/* Union Notice */}
      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <div className="space-y-1">
          <p className="font-semibold">⚠️ 语义与对齐说明：</p>
          <p className="text-rose-800">
            Union 仅负责把多个输入流的数据汇聚为一路向下游继续流动，
            <strong>不负责字段重命名、字段对齐或数据去重</strong>。 若各流 Schema 不一致，建议在
            Union 前使用 <strong>Map (整理字段)</strong> 统一字段格式。
          </p>
        </div>
      </div>

      {/* Sources List */}
      <div className="space-y-2 rounded-lg border border-rose-200 bg-white p-3 shadow-2xs">
        <label className="mb-1 block text-[11px] font-medium text-gray-700">
          当前汇聚的输入流列表 (from):
        </label>

        {fromSources.map((src, sIdx) => (
          <div
            key={sIdx}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-[12px] text-gray-800"
          >
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-rose-600" />
              <span>{src}</span>
              {src === currentTable && (
                <span className="rounded-lg border border-gray-200 bg-white px-1 text-[10px] text-gray-400">
                  当前表
                </span>
              )}
            </div>

            {fromSources.length > 1 && (
              <button
                type="button"
                onClick={() => removeSource(sIdx)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Add Upstream Source */}
        {availableUpstreamSources.filter((s) => !fromSources.includes(s)).length > 0 && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
            <span className="text-[11px] text-gray-500">添加上游流:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addSource(e.target.value)
                  e.target.value = ''
                }
              }}
              defaultValue=""
              className="cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-800 focus:outline-none"
            >
              <option value="" disabled>
                -- 选择其他可用流 --
              </option>
              {availableUpstreamSources
                .filter((s) => !fromSources.includes(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
        )}
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
    }
  }
  if (step.type === 'js') {
    return {
      id: step.id,
      type: 'js',
      from: [defaultFrom],
      script: step.config.js?.script || 'function process(record, ctx) { return record; }',
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
