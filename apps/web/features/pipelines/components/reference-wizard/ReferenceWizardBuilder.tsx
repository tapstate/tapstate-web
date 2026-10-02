import {
  Database,
  Table2,
  Plus,
  Trash2,
  FolderTree,
  Braces,
  X,
  FileCode,
  Zap,
  Check,
  RefreshCw,
  Layers,
  Workflow,
} from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { ConnectorIcon } from '@/components/connector-icon'

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

import { TableTransformsManager, type TransformStep } from './TableTransformsManager'
import { reparentRelation } from './wizard-tree'

export interface WizardBuilderProps {
  catalog: DataSourceMeta[]
  initial: WizardViewState
  onChange: (state: WizardViewState) => void
  destinationName: string
  deploymentProfile: DeploymentProfile
  footer: React.ReactNode
  actions?: React.ReactNode
  /** Notices kept above the editor, outside its read-only fieldset so they can be dismissed. */
  notices?: React.ReactNode
  compiledSpec: string
  sourceError?: string
  readOnly?: boolean
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

export const ReferenceWizardBuilder: React.FC<WizardBuilderProps> = ({
  catalog: AVAILABLE_DATA_SOURCES,
  initial,
  onChange,
  destinationName,
  deploymentProfile,
  footer,
  actions,
  notices,
  compiledSpec,
  sourceError,
  readOnly = false,
}) => {
  const { t } = useTranslation()
  const [activeContext, setActiveContext] = React.useState('root')
  const [previewMode, setPreviewMode] = React.useState<'json' | 'table'>('json')
  const [showPlanModal, setShowPlanModal] = React.useState(false)
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
  const [relations, setRelations] = React.useState<RelationNode[]>(initial.relations)
  const [pipelineTransforms, setPipelineTransforms] = React.useState(initial.transforms)
  const targetDataSource = AVAILABLE_DATA_SOURCES.find((source) => source.id === targetSourceId)
  const availableWriteModes = targetDataSource?.writeModes?.length
    ? targetDataSource.writeModes
    : ['upsert']
  const selectedWriteMode = availableWriteModes.includes(targetWriteMode)
    ? targetWriteMode
    : availableWriteModes[0]
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
  React.useEffect(() => {
    const fingerprint = JSON.stringify(viewState)
    if (lastView.current !== fingerprint) {
      lastView.current = fingerprint
      onChangeRef.current(viewState)
    }
  }, [viewState])

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
        after = {
          ...after,
          primaryKey: meta?.keys || [],
          conditions: getConditions(before).map((c) => ({
            ...c,
            childKey: meta?.columns.includes(c.childKey) ? c.childKey : '',
          })),
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
      const currentParentKey = conds[index].parentKey
      const newParentKey = cols.includes(currentParentKey) ? currentParentKey : cols[0] || 'id'
      const nextConditions = conds.map((c) => ({
        ...c,
        parentTable: value,
        parentKey: cols.includes(c.parentKey) ? c.parentKey : newParentKey,
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

  const handleNewRelTableSelect = (tableName: string) => {
    setNewRelTable(tableName)
    const tbl = getTablesForSource(newRelSource).find((t) => t.name === tableName)
    if (tbl) {
      setNewRelKey(tbl.primaryKey || tbl.columns[0] || '')
      setNewRelParentKey(tbl.defaultParentKey || rootConfig?.primaryKey || 'id')
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
      primaryKey: getTablesForSource(newRelSource).find((t) => t.name === newRelTable)?.keys || [],
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

  const handleNewChildTableSelect = (tableName: string) => {
    setNewChildTable(tableName)
    const tbl = getTablesForSource(newChildSource).find((t) => t.name === tableName)
    if (tbl) {
      setNewChildKey(tbl.primaryKey || tbl.columns[0] || '')
      setNewChildParentKey('id')
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
      primaryKey:
        getTablesForSource(newChildSource).find((t) => t.name === newChildTable)?.keys || [],
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

  // Preview Label & Data
  const activeContextLabel = React.useMemo(() => {
    if (activeContext === 'root') return 'Root Anchor'
    if (activeContext === 'doc_process') return 'Post Operations'
    if (activeContext === 'destination') return t('wizard.destinationContext')
    for (const rel of relations) {
      if (rel.id === activeContext) return rel.targetField
      if (rel.children) {
        const child = rel.children.find((c) => c.id === activeContext)
        if (child) return `${rel.targetField}.${child.targetField}`
      }
    }
    return 'Document Context'
  }, [activeContext, relations])

  const compiledPlanJson = compiledSpec
  const shapeFor = (columns: string[], children: RelationNode[]): Record<string, unknown> => {
    const shape: Record<string, unknown> = Object.fromEntries(columns.map((c) => [c, null]))
    for (const r of children) {
      const child = shapeFor(getColumnsForTable(r.source, r.table), r.children || [])
      if (r.type === 'flatten') Object.assign(shape, child)
      else if (r.targetField) shape[r.targetField] = r.type === 'sub_array' ? [child] : child
    }
    return shape
  }
  const previewDoc = rootConfig
    ? shapeFor(getColumnsForTable(rootConfig.source, rootConfig.table), relations)
    : {}
  for (const step of pipelineTransforms) {
    if (step.type !== 'map') continue
    for (const field of step.config.map?.fields || []) {
      if (field.ruleType === 'delete') delete previewDoc[field.outputField]
      else if (field.outputField) previewDoc[field.outputField] = null
    }
  }

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
        onClick={(event) => {
          event.stopPropagation()
          setActiveContext(rel.id)
        }}
        className={cn(
          'wizard-reference-relation-radius cursor-pointer border transition-all duration-150',
          nested ? 'bg-gray-50/80 p-3.5 shadow-2xs hover:bg-white' : 'bg-white p-4 shadow-xs',
          activeContext === rel.id
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
                    updateRelation(rel.id, (r) => ({ ...r, type: 'sub_doc' }))
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
                    updateRelation(rel.id, (r) => ({ ...r, type: 'sub_array' }))
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
                    updateRelation(rel.id, (r) => ({ ...r, type: 'flatten' }))
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
                <Select
                  value={rel.source || undefined}
                  onValueChange={(newSrc) => {
                    if (newSrc === null) return
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
                >
                  <SelectTrigger
                    aria-label="Source Connection"
                    className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                  >
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent className="wizard-reference-select-content rounded-lg">
                    {AVAILABLE_DATA_SOURCES.map((ds) => (
                      <SelectItem
                        key={ds.id}
                        value={ds.name}
                        className="rounded-md px-1.5 py-1 text-[12px]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <ConnectorIcon
                            connectorId={ds.connector || ds.badge}
                            name={ds.connectorName || ds.badge}
                            iconPath={ds.iconPath}
                            size={18}
                          />
                          <span className="truncate">{ds.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">Table</label>
                <Select
                  value={rel.table || undefined}
                  onValueChange={(newTbl) => {
                    if (newTbl === null) return
                    const tblMeta = getTablesForSource(rel.source).find((t) => t.name === newTbl)
                    updateRelation(rel.id, (r) => ({
                      ...r,
                      table: newTbl,
                      key: tblMeta?.defaultKey || 'id',
                      parentKey: tblMeta?.defaultParentKey || 'id',
                      targetField: tblMeta?.name.split('.').pop() || 'items',
                    }))
                  }}
                >
                  <SelectTrigger
                    aria-label="Table"
                    className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                  >
                    <SelectValue placeholder="Select a source table" />
                  </SelectTrigger>
                  <SelectContent className="wizard-reference-select-content rounded-lg">
                    {getTablesForSource(rel.source).map((t) => (
                      <SelectItem
                        key={t.name}
                        value={t.name}
                        className="rounded-md px-1.5 py-1 font-mono text-[12px]"
                      >
                        <span className="flex items-center gap-2">
                          <Table2 className="size-4 text-gray-500" />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    onClick={() => updateRelation(rel.id, (r) => ({ ...r, type: 'sub_doc' }))}
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
                    onClick={() => updateRelation(rel.id, (r) => ({ ...r, type: 'sub_array' }))}
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
                    onClick={() => updateRelation(rel.id, (r) => ({ ...r, type: 'flatten' }))}
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

              {/* Child Key Box */}
              <div className="flex items-center rounded-lg border border-gray-200/90 bg-gray-50 px-2.5 py-1 font-mono text-gray-800 transition-colors hover:bg-gray-100/70">
                <span className="mr-1 text-[11px] font-semibold text-gray-500">
                  {rel.table.split('.').pop()}.
                </span>
                <select
                  value={cond.childKey}
                  onChange={(e) => handleConditionChange(rel, cIdx, 'childKey', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer bg-transparent text-[12px] font-medium text-gray-900 focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {getColumnsForTable(rel.source, rel.table).map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-[13px] font-bold text-gray-400">=</span>

              {/* Parent Table & Key Box (Metabase Style) */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-200/90 bg-gray-50 px-2.5 py-1 font-mono text-gray-800 transition-colors hover:bg-gray-100/70">
                <select
                  value={cond.parentTable || rel.parentTable}
                  onChange={(e) => handleConditionChange(rel, cIdx, 'parentTable', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="mr-0.5 max-w-[150px] cursor-pointer truncate border-r border-gray-200 bg-transparent pr-1.5 text-[12px] font-semibold text-blue-700 focus:outline-none"
                  title="Select table to join with"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  <optgroup label="Pipeline Tables">
                    {getAvailableJoinTables(rel.id).pipelineTables.map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {tbl.split('.').pop()} {tbl === rootConfig?.table ? '(Root)' : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="All Sources">
                    {getAvailableJoinTables(rel.id).otherTables.map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {tbl}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <select
                  value={cond.parentKey}
                  onChange={(e) => handleConditionChange(rel, cIdx, 'parentKey', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer bg-transparent text-[12px] font-medium text-gray-900 focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {getColumnsForTable(undefined, cond.parentTable || rel.parentTable).map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

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
              tableName={rel.table}
              sourceName={rel.source}
              columns={getColumnsForTable(rel.source, rel.table)}
              availableUpstreamSources={getAvailableJoinTables(rel.id).pipelineTables}
              transforms={rel.transforms || []}
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
                        <Select
                          value={newChildSource || undefined}
                          onValueChange={(value) => {
                            if (value === null) return
                            setNewChildSource(value)
                            const tables = getTablesForSource(value)
                            setNewChildTable(tables[0]?.name || '')
                          }}
                        >
                          <SelectTrigger
                            aria-label="Source"
                            className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                          >
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent className="wizard-reference-select-content rounded-lg">
                            {AVAILABLE_DATA_SOURCES.map((ds) => (
                              <SelectItem
                                key={ds.id}
                                value={ds.name}
                                className="rounded-md px-1.5 py-1 text-[12px]"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <ConnectorIcon
                                    connectorId={ds.connector || ds.badge}
                                    name={ds.connectorName || ds.badge}
                                    iconPath={ds.iconPath}
                                    size={18}
                                  />
                                  <span className="truncate">{ds.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-600">
                          Child Table
                        </label>
                        <Select
                          value={newChildTable || undefined}
                          onValueChange={(value) => {
                            if (value !== null) handleNewChildTableSelect(value)
                          }}
                        >
                          <SelectTrigger
                            aria-label="Child Table"
                            className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                          >
                            <SelectValue placeholder="Select a source table" />
                          </SelectTrigger>
                          <SelectContent className="wizard-reference-select-content rounded-lg">
                            {getTablesForSource(newChildSource).map((t) => (
                              <SelectItem
                                key={t.name}
                                value={t.name}
                                className="rounded-md px-1.5 py-1 font-mono text-[12px]"
                              >
                                <span className="flex items-center gap-2">
                                  <Table2 className="size-4 text-gray-500" />
                                  {t.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 3. Join Condition */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">
                        Join Condition
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-[12px]">
                        <span className="font-mono font-medium text-gray-600">
                          {newChildTable.split('.').pop()}.
                        </span>
                        <input
                          value={newChildKey}
                          onChange={(e) => setNewChildKey(e.target.value)}
                          className="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px]"
                        />
                        <span className="font-bold text-gray-400">=</span>
                        <span className="font-mono font-medium text-gray-600">
                          {rel.table.split('.').pop()}.
                        </span>
                        <input
                          value={newChildParentKey}
                          onChange={(e) => setNewChildParentKey(e.target.value)}
                          className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1 font-mono text-[12px]"
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
    <div className="wizard-reference flex h-full w-full flex-col overflow-hidden font-sans text-gray-900 select-none">
      {/* Top Workbench Header */}
      {/* Main Workspace Split */}
      <div className="wizard-reference-workspace flex min-h-0 flex-1 overflow-hidden">
        {/* Left / Center Canvas */}
        <div className="wizard-reference-editor-column">
          {notices ? <div className="wizard-reference-notices">{notices}</div> : null}
          <fieldset
            disabled={readOnly}
            className="contents"
            aria-label={readOnly ? t('pipelines.workspace.readOnly.editorStatus') : undefined}
            data-testid="wizard-editor-controls"
            data-read-only={readOnly ? 'true' : 'false'}
          >
            <main className="wizard-reference-canvas flex min-w-0 flex-1 flex-col overflow-y-auto">
              <div className="w-full min-w-0 pb-24">
                {/* ================================================================= */}
                {/* STEP 1: ROOT TABLE (主表锚点 - 卡片原生就地配置，前后形态统一) */}
                {/* ================================================================= */}
                <section
                  id="step-root-table"
                  onClick={() => setActiveContext('root')}
                  className={cn(
                    'wizard-reference-root-card cursor-pointer border bg-white p-4 shadow-xs transition-all duration-150',
                    activeContext === 'root'
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
                            Root Table
                          </span>
                          {isRootConfigured && !isRootEditing && rootConfig ? (
                            <h2 className="font-mono text-[13px] font-semibold text-gray-900">
                              {rootConfig.table}
                            </h2>
                          ) : (
                            <span className="text-[13px] font-semibold text-gray-900">
                              {isRootConfigured ? 'Edit Root Table' : 'Select Root Table'}
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
                            title="Configure transforms and pre-processing for root table"
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">
                            Data Source
                          </label>
                          <Select
                            value={scratchSelectedSource || undefined}
                            onValueChange={(value) => {
                              if (value === null) return
                              setScratchSelectedSource(value)
                              const src = AVAILABLE_DATA_SOURCES.find((s) => s.name === value)
                              setScratchSelectedTable(src?.tables[0]?.name || '')
                            }}
                          >
                            <SelectTrigger
                              aria-label="Data Source"
                              className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                            >
                              {AVAILABLE_DATA_SOURCES.find(
                                (ds) => ds.name === scratchSelectedSource,
                              ) && (
                                <ConnectorIcon
                                  connectorId={
                                    AVAILABLE_DATA_SOURCES.find(
                                      (ds) => ds.name === scratchSelectedSource,
                                    )?.connector || scratchSelectedSource
                                  }
                                  name={
                                    AVAILABLE_DATA_SOURCES.find(
                                      (ds) => ds.name === scratchSelectedSource,
                                    )?.connectorName || scratchSelectedSource
                                  }
                                  iconPath={
                                    AVAILABLE_DATA_SOURCES.find(
                                      (ds) => ds.name === scratchSelectedSource,
                                    )?.iconPath
                                  }
                                  size={24}
                                />
                              )}
                              <SelectValue placeholder="Select a source" />
                            </SelectTrigger>
                            <SelectContent className="wizard-reference-select-content rounded-lg">
                              {AVAILABLE_DATA_SOURCES.map((ds) => (
                                <SelectItem
                                  key={ds.id}
                                  value={ds.name}
                                  className="rounded-md px-1.5 py-1 text-[12px]"
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <ConnectorIcon
                                      connectorId={ds.connector || ds.badge}
                                      name={ds.connectorName || ds.badge}
                                      iconPath={ds.iconPath}
                                      size={20}
                                    />
                                    <span className="truncate">{ds.name}</span>
                                    <span className="ml-auto shrink-0 text-[11px] text-gray-500">
                                      {ds.connectorName || ds.badge}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">
                            Table
                          </label>
                          <Select
                            value={scratchSelectedTable || undefined}
                            onValueChange={(value) => {
                              if (value !== null) setScratchSelectedTable(value)
                            }}
                          >
                            <SelectTrigger
                              aria-label="Table"
                              className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                            >
                              <SelectValue placeholder="Select a source table" />
                            </SelectTrigger>
                            <SelectContent className="wizard-reference-select-content rounded-lg">
                              {scratchAvailableTables.map((tbl) => (
                                <SelectItem
                                  key={tbl.name}
                                  value={tbl.name}
                                  className="rounded-md px-1.5 py-1 font-mono text-[12px]"
                                >
                                  <span className="flex items-center gap-2">
                                    <Table2 className="size-4 text-gray-500" />
                                    {tbl.name}
                                    {tbl.primaryKey ? ` (PK: ${tbl.primaryKey})` : ''}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            {isRootConfigured ? 'Save Changes' : 'Confirm Root Table'}
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

                  {/* Root Table Transforms Manager (Expanded) */}
                  {rootConfig && !isRootEditing && rootConfig.isTransformsOpen && (
                    <div
                      className="mt-3 border-t border-gray-100 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableTransformsManager
                        tableName={rootConfig.table}
                        sourceName={rootConfig.source}
                        columns={rootConfig.columns}
                        availableUpstreamSources={AVAILABLE_DATA_SOURCES.flatMap((s) =>
                          s.tables.map((t) => t.name),
                        )}
                        transforms={rootConfig.transforms || []}
                        onChange={(nextTransforms) =>
                          setRootConfig((prev) =>
                            prev ? { ...prev, transforms: nextTransforms } : null,
                          )
                        }
                      />
                    </div>
                  )}
                </section>

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
                      <div>
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
                          <div className="mt-1 text-[11px] text-amber-600">
                            Please confirm the Root Table above first.
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
                              <Select
                                value={newRelSource || undefined}
                                onValueChange={(value) => {
                                  if (value === null) return
                                  setNewRelSource(value)
                                  const tables = getTablesForSource(value)
                                  if (tables.length > 0) handleNewRelTableSelect(tables[0].name)
                                  else setNewRelTable('')
                                }}
                              >
                                <SelectTrigger
                                  aria-label="Child Data Source"
                                  className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                                >
                                  <SelectValue placeholder="Select a source" />
                                </SelectTrigger>
                                <SelectContent className="wizard-reference-select-content rounded-lg">
                                  {AVAILABLE_DATA_SOURCES.map((ds) => (
                                    <SelectItem
                                      key={ds.id}
                                      value={ds.name}
                                      className="rounded-md px-1.5 py-1 text-[12px]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <ConnectorIcon
                                          connectorId={ds.connector || ds.badge}
                                          name={ds.connectorName || ds.badge}
                                          iconPath={ds.iconPath}
                                          size={18}
                                        />
                                        <span className="truncate">{ds.name}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                                Child Table
                              </label>
                              <Select
                                value={newRelTable || undefined}
                                onValueChange={(value) => {
                                  if (value !== null) handleNewRelTableSelect(value)
                                }}
                              >
                                <SelectTrigger
                                  aria-label="Child Table"
                                  className="wizard-reference-select-trigger h-auto min-h-0 w-full rounded-lg border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-gray-800 shadow-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/15"
                                >
                                  <SelectValue placeholder="Select a source table" />
                                </SelectTrigger>
                                <SelectContent className="wizard-reference-select-content rounded-lg">
                                  {getTablesForSource(newRelSource).map((t) => (
                                    <SelectItem
                                      key={t.name}
                                      value={t.name}
                                      className="rounded-md px-1.5 py-1 font-mono text-[12px]"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Table2 className="size-4 text-gray-500" />
                                        {t.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 3. Join Condition */}
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-600">
                              Join Condition
                            </label>
                            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px]">
                              <span className="font-mono text-gray-600">
                                {newRelTable.split('.').pop()}.
                              </span>
                              <input
                                value={newRelKey}
                                onChange={(e) => setNewRelKey(e.target.value)}
                                className="w-28 rounded-lg border border-gray-300 bg-white px-1.5 py-1 font-mono text-gray-900"
                                placeholder="foreign_key"
                              />
                              <span className="font-bold text-gray-400">=</span>
                              <span className="font-mono text-gray-600">
                                {rootConfig?.table || 'root'}.
                              </span>
                              <input
                                value={newRelParentKey}
                                onChange={(e) => setNewRelParentKey(e.target.value)}
                                className="w-20 rounded-lg border border-gray-300 bg-white px-1.5 py-1 font-mono text-gray-900"
                                placeholder="primary_key"
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
                  onClick={() => setActiveContext('doc_process')}
                  className={cn(
                    'cursor-pointer rounded-xl border bg-white p-4 shadow-xs transition-all duration-150',
                    activeContext === 'doc_process'
                      ? 'border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
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
                  </div>
                  <div className="mt-3.5" onClick={(event) => event.stopPropagation()}>
                    <TableTransformsManager
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
                      availableUpstreamSources={[
                        rootConfig?.table || 'root',
                        ...flattenRelations(relations).map((relation) => relation.table),
                      ]}
                      transforms={pipelineTransforms}
                      onChange={setPipelineTransforms}
                      hideHeader={true}
                    />
                  </div>
                </section>

                {/* ============================================================= */}
                {/* CONNECTOR: Transform stage to the configured destination */}
                {/* ============================================================= */}
                <div className="ml-8 flex h-6 justify-start">
                  <div className="h-full border-l border-dashed border-gray-300" />
                </div>

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
                            <Select
                              value={targetSourceId}
                              onValueChange={(value) => {
                                if (value === null) return
                                setTargetSourceId(value)
                                const next = AVAILABLE_DATA_SOURCES.find(
                                  (source) => source.id === value,
                                )
                                if (
                                  next?.writeModes?.length &&
                                  !next.writeModes.includes(targetWriteMode)
                                ) {
                                  setTargetWriteMode(next.writeModes[0])
                                }
                              }}
                            >
                              <SelectTrigger
                                aria-labelledby="wizard-destination-source-label"
                                className="w-full text-[13px] font-normal"
                              >
                                <SelectValue
                                  placeholder={t('wizard.destinationSourcePlaceholder')}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_DATA_SOURCES.filter((source) => {
                                  if (source.sink !== true) return false
                                  return (
                                    deploymentProfile !== 'cloud' ||
                                    source.connector === 'mongodb-atlas'
                                  )
                                }).map((source) => (
                                  <SelectItem key={source.id} value={source.id}>
                                    <span className="flex items-center gap-2">
                                      <ConnectorIcon
                                        connectorId={source.connector || ''}
                                        name={source.connectorName || source.badge}
                                        iconPath={source.iconPath}
                                        size={18}
                                      />
                                      <span>{source.name}</span>
                                      <span className="text-muted-foreground">
                                        {source.connectorName}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
              </div>
            </main>
          </fieldset>
          {actions}
        </div>

        {/* Right Side: Real-time Live Result Preview (Original w-[440px]) */}
        <aside className="wizard-reference-preview flex flex-col rounded-xl bg-white">
          {/* Preview Header */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[12px] font-semibold text-gray-900">Result Preview</span>
              <span className="font-mono text-[11px] text-gray-400">({activeContextLabel})</span>
            </div>

            {/* Format Switcher */}
            <div className="flex items-center rounded-lg bg-gray-200/80 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setPreviewMode('json')}
                className={cn(
                  'cursor-pointer rounded-lg px-2 py-0.5 transition-all',
                  previewMode === 'json'
                    ? 'bg-white font-semibold text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                JSON Doc
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('table')}
                className={cn(
                  'cursor-pointer rounded-lg px-2 py-0.5 transition-all',
                  previewMode === 'table'
                    ? 'bg-white font-semibold text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                Table View
              </button>
            </div>
          </div>

          {/* Sample Indicator */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-1.5 text-[11px] text-gray-500">
            <span>Document structure · not sample data</span>
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Schema
            </span>
          </div>

          {/* Preview Document Rendering */}
          <div className="flex-1 overflow-y-auto bg-white p-4 font-mono text-[12px]">
            {!rootConfig ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
                <Database className="mb-2 h-8 w-8 text-gray-300" />
                <div className="text-[13px] font-medium text-gray-600">No Root Table Selected</div>
                <div className="mt-1 max-w-xs text-[11px] text-gray-400">
                  Select your root table in Step 1 to generate and inspect the assembled MongoDB
                  document.
                </div>
              </div>
            ) : previewMode === 'json' ? (
              <pre className="text-[12px] leading-relaxed break-words whitespace-pre-wrap text-blue-600">
                {JSON.stringify(previewDoc, null, 2)}
              </pre>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2">Field</th>
                    <th>Structure</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(previewDoc).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-2 text-blue-600">{key}</td>
                      <td>
                        {Array.isArray(value)
                          ? 'Array'
                          : value === null
                            ? 'Source field'
                            : 'Document'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-500">
            <span>Target Model: MongoDB BSON Document</span>
            <button
              type="button"
              onClick={() => setShowPlanModal(true)}
              className="cursor-pointer text-blue-600 hover:underline"
            >
              View JSON Spec
            </button>
          </div>
        </aside>
      </div>

      {/* COMPILED PLAN MODAL (Pure JSON) */}
      {showPlanModal && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-in fade-in flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  Compiled Document Assembly Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-[11px] leading-relaxed text-gray-100">
              <pre>{compiledPlanJson}</pre>
            </div>
            <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
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
