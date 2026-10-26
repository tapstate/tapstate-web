import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import * as AntdFormily from '@potop/formily-antd-v6'
import { FormilySchema, useFormilyForm, type FormilyComponentMap } from '@tapstate-web/formily'
import { Button } from '@tapstate-web/ui/button'
import { Checkbox } from '@tapstate-web/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tapstate-web/ui/dropdown-menu'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@tapstate-web/ui/tabs'
import { Check, Plus, Regex, Search, Trash2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineDagNode, PipelineJsonObject } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'

import { FormilyAntdProvider } from '@/components/formily/formily-antd-provider'
import { Textarea } from '@/components/ui/textarea'

import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
  PipelineSourceTableSelection,
  PipelineTargetTableMapping,
} from '../../model/pipeline-node-model'
import type { PipelineCanvasSelection } from '../canvas/pipeline-canvas-types'
import type { PipelineSourceTableKind } from '../node-library/pipeline-node-library-types'
import type { PipelineTransformConfigurationPatch } from '../transform/types'

import {
  PIPELINE_ON_FULL_LOAD_POLICIES,
  isPipelineOnFullLoad,
  sourceTableSelections,
} from '../../model/pipeline-node-model'
import { PipelineNodeIcon } from '../canvas/pipeline-node-icon'
import { TransformEditor } from '../transform/transform-editor'
import {
  createPipelineDataNodeSchema,
  type PipelineFormilySchema,
  type PipelineSchemaOption,
  type PipelineTableLoader,
} from './pipeline-data-node-schema'
import { PipelineTableAutocomplete } from './pipeline-table-autocomplete'

type FormValues = Record<string, unknown>

const formilyComponents: FormilyComponentMap = {
  FormItem: AntdFormily.FormItem,
  Input: AntdFormily.Input,
  Select: AntdFormily.Select,
  PipelineSourceScope,
  PipelineSourceTablePicker: connect(
    PipelineSourceTablePicker,
    mapProps((props, field) => {
      const connectedField = field as
        | (Field & {
            dataSource?: readonly PipelineSchemaOption[]
          })
        | undefined
      return {
        ...props,
        options: connectedField?.dataSource ?? props.options,
        value: Array.isArray(connectedField?.value)
          ? connectedField.value
          : typeof connectedField?.value === 'string'
            ? [connectedField.value]
            : [],
        loading: connectedField?.loading ?? props.loading,
        onChange: (value: string | string[]) =>
          connectedField?.onInput(Array.isArray(value) ? value : [value]),
      }
    }),
  ),
  PipelineTargetTableMappings: connect(
    PipelineTargetTableMappings,
    mapProps((props, field) => {
      const connectedField = field as Field | undefined
      return {
        ...props,
        value: connectedField?.value,
        onChange: (value: PipelineTargetTableMapping[]) => connectedField?.onInput(value),
      }
    }),
  ),
  PipelineTableAutocomplete: connect(
    PipelineTableAutocomplete,
    mapProps((props, field) => {
      const connectedField = field as Field | undefined
      return {
        ...props,
        value: typeof connectedField?.value === 'string' ? connectedField.value : '',
        onChange: (value: string) => connectedField?.onInput(value),
      }
    }),
  ),
}

function localizedDataSchema(
  kind: 'source' | 'target',
  t: (key: string) => string,
  options: {
    sourceOptions?: readonly PipelineSchemaOption[]
    tableOptions?: readonly PipelineSchemaOption[]
    loadTables?: PipelineTableLoader
    sourceId?: string
    sources?: readonly SourceView[]
    upstreamSourceTables?: readonly PipelineSourceTableSelection[]
  } = {},
) {
  const labels: Record<string, string> =
    kind === 'source'
      ? {
          sourceId: t('pipelines.workspace.config.source'),
          table: t('pipelines.workspace.config.table'),
        }
      : {
          sourceId: t('pipelines.workspace.config.targetSource'),
          table: t('pipelines.workspace.config.targetTable'),
          writeMode: t('pipelines.workspace.config.writeMode'),
          onFullLoad: t('pipelines.workspace.config.onFullLoad'),
        }
  const schema = createPipelineDataNodeSchema(kind, {
    labels,
    sourceOptions: options.sourceOptions,
    tableOptions: options.tableOptions,
    loadTables: options.loadTables,
    sources: options.sources,
  })
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, property]) => [
      name,
      name === 'writeMode'
        ? {
            ...property,
            enum: [
              { label: t('pipelines.workspace.transform.upsert'), value: 'upsert' },
              { label: t('pipelines.workspace.transform.append'), value: 'append' },
            ],
          }
        : name === 'onFullLoad'
          ? {
              ...property,
              'x-component-props': {
                ...(property['x-component-props'] as Record<string, unknown> | undefined),
                placeholder: t('pipelines.workspace.config.onFullLoadPlaceholder'),
              },
              enum: PIPELINE_ON_FULL_LOAD_POLICIES.map((policy) => ({
                label: t(`pipelines.workspace.config.onFullLoadOptions.${policy}`),
                value: policy,
              })),
            }
          : property,
    ]),
  )
  const localizedProperties =
    kind === 'source'
      ? {
          sourceScope: {
            type: 'void',
            'x-component': 'PipelineSourceScope',
            'x-component-props': {
              sourceId: options.sourceId,
              sources: options.sources,
            },
          },
          ...properties,
          tables: {
            ...properties.tables,
            'x-component': 'PipelineSourceTablePicker',
            'x-component-props': {
              ...(properties.tables?.['x-component-props'] as Record<string, unknown> | undefined),
              sourceId: options.sourceId,
              sources: options.sources,
            },
          },
        }
      : options.upstreamSourceTables && options.upstreamSourceTables.length > 1
        ? {
            ...Object.fromEntries(Object.entries(properties).filter(([name]) => name !== 'table')),
            tableMappings: {
              type: 'array',
              title: t('pipelines.workspace.config.targetTable'),
              'x-component': 'PipelineTargetTableMappings',
              'x-component-props': {
                sourceTables: options.upstreamSourceTables,
                options: options.tableOptions,
              },
            },
          }
        : properties
  return {
    ...schema,
    required:
      kind === 'target' && options.upstreamSourceTables && options.upstreamSourceTables.length > 1
        ? ['sourceId', 'tableMappings']
        : schema.required,
    properties: localizedProperties,
  } satisfies PipelineFormilySchema
}

function PipelineSourceScope({
  sourceId,
  sources,
}: {
  sourceId?: string
  sources?: readonly SourceView[]
}) {
  const { t } = useTranslation()
  const source = sources?.find((candidate) => candidate.id === sourceId)
  const literalTables = (source?.tables ?? [])
    .map((table) => table.name)
    .filter((table): table is string => Boolean(table))
  const rules = (source?.tables ?? [])
    .map((table) => table.pattern)
    .filter((pattern): pattern is string => Boolean(pattern))

  return (
    <div
      className="mb-3 space-y-2 rounded-lg border border-[var(--pipeline-border)] bg-[var(--pipeline-surface-subtle)] px-3 py-2.5"
      data-pipeline-source-scope
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--pipeline-text-muted)] uppercase">
          {t('pipelines.workspace.config.sourceScope')}
        </span>
        <span className="rounded-full bg-[var(--pipeline-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--pipeline-text-subtle)]">
          {source
            ? source.tables === null
              ? t('pipelines.workspace.config.openSourceScope')
              : t('pipelines.workspace.config.configuredSourceScope', {
                  count: literalTables.length + rules.length,
                })
            : t('pipelines.workspace.config.sourceScopeUnavailable')}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--pipeline-text)]">
        <span
          className="size-1.5 shrink-0 rounded-full bg-[var(--pipeline-selection)]"
          aria-hidden="true"
        />
        <span className="truncate">
          {sourceId || t('pipelines.workspace.config.selectSourceFirst')}
        </span>
      </div>
      {source && source.tables !== null && (
        <div className="flex flex-wrap gap-1.5" data-pipeline-source-scope-entries>
          {literalTables.map((table) => (
            <span
              key={table}
              className="rounded-md bg-[var(--pipeline-surface)] px-2 py-1 text-[11px] text-[var(--pipeline-text-subtle)]"
            >
              {table}
            </span>
          ))}
          {rules.map((pattern) => (
            <span
              key={pattern}
              className="rounded-md border border-dashed border-[var(--pipeline-border)] px-2 py-1 text-[11px] text-[var(--pipeline-text-muted)]"
              data-pipeline-source-scope-rule={pattern}
            >
              {pattern}
            </span>
          ))}
          {literalTables.length === 0 && rules.length === 0 && (
            <span className="text-[11px] text-[var(--pipeline-text-muted)]">
              {t('pipelines.workspace.config.emptySourceScope')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface PipelineSourceTablePickerOption extends PipelineSchemaOption {
  tableKind: PipelineSourceTableKind
}

function regexReference(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('/') && trimmed.endsWith('/') ? trimmed : `/${trimmed}/`
}

function rawRegex(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('/') && trimmed.endsWith('/') ? trimmed.slice(1, -1) : trimmed
}

function sourceTablePickerOptions(
  sourceId: string | undefined,
  sources: readonly SourceView[] | undefined,
  options: readonly PipelineSchemaOption[] | undefined,
  allowPatterns: boolean,
) {
  const source = sources?.find((candidate) => candidate.id === sourceId)
  const catalogOptions = (options ?? [])
    .filter((option) => {
      if (!source || source.tables === null) return true
      const table = source.tables.find((candidate) => candidate.name === option.value)
      if (table?.name) return true

      return source.tables.some((candidate) => {
        if (!candidate.pattern) return false
        try {
          return new RegExp(rawRegex(candidate.pattern)).test(option.value)
        } catch {
          return false
        }
      })
    })
    .map((option) => ({
      ...option,
      tableKind: 'literal' as const,
    }))
  const regexOptions =
    !allowPatterns || source?.tables === null
      ? []
      : (source?.tables ?? []).flatMap((table) => {
          if (!table.pattern) return []
          return [
            {
              label: regexReference(table.pattern),
              value: table.pattern,
              tableKind: 'regex' as const,
            },
          ]
        })
  const merged = [...catalogOptions, ...regexOptions]
  return Array.from(
    new Map(merged.map((option) => [`${option.tableKind}:${option.value}`, option])).values(),
  )
}

export function PipelineSourceTablePicker({
  value,
  options,
  loading = false,
  sourceId,
  sources,
  onChange,
  selectionMode = 'toggle',
  allowPatterns = true,
}: {
  value?: unknown
  options?: readonly PipelineSchemaOption[]
  loading?: boolean
  sourceId?: string
  sources?: readonly SourceView[]
  onChange?: (value: string[]) => void
  selectionMode?: 'single' | 'multiple' | 'toggle'
  allowPatterns?: boolean
}) {
  const { t } = useTranslation()
  const currentValue = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? [value]
      : []
  const [mode, setMode] = useState<'single' | 'multiple'>(() =>
    selectionMode === 'toggle' ? (currentValue.length > 1 ? 'multiple' : 'single') : selectionMode,
  )
  const [selected, setSelected] = useState<string[]>(currentValue)
  const [tableQuery, setTableQuery] = useState('')
  const [pattern, setPattern] = useState('')
  const [patternError, setPatternError] = useState(false)
  const tableOptions = useMemo(
    () => sourceTablePickerOptions(sourceId, sources, options, allowPatterns),
    [allowPatterns, options, sourceId, sources],
  )

  useEffect(() => {
    setSelected(currentValue)
    setTableQuery('')
    if (selectionMode === 'toggle') {
      if (currentValue.length > 1) setMode('multiple')
    } else {
      setMode(selectionMode)
    }
  }, [selectionMode, sourceId, value])

  const normalizedTableQuery = tableQuery.trim().toLocaleLowerCase()
  const filteredTableOptions = normalizedTableQuery
    ? tableOptions.filter((option) =>
        option.label.toLocaleLowerCase().includes(normalizedTableQuery),
      )
    : tableOptions
  const showTableSearch = tableOptions.length > 6

  function optionValue(option: PipelineSourceTablePickerOption) {
    return option.tableKind === 'regex' ? regexReference(option.value) : option.value
  }

  function toggle(option: PipelineSourceTablePickerOption) {
    const valueToToggle = optionValue(option)
    const next = selected.includes(valueToToggle)
      ? selected.filter((valueItem) => valueItem !== valueToToggle)
      : [...selected, valueToToggle]
    setSelected(next)
    onChange?.(next)
  }

  function selectSingle(option: PipelineSourceTablePickerOption) {
    const next = [optionValue(option)]
    setSelected(next)
    onChange?.(next)
  }

  function addPattern() {
    const nextPattern = rawRegex(pattern)
    if (!nextPattern) {
      setPatternError(true)
      return
    }
    try {
      new RegExp(nextPattern)
    } catch {
      setPatternError(true)
      return
    }
    setPatternError(false)
    const nextValue = regexReference(nextPattern)
    const next = selected.includes(nextValue) ? selected : [...selected, nextValue]
    setSelected(next)
    onChange?.(next)
    setPattern('')
  }

  return (
    <div className="space-y-2" data-pipeline-source-table-picker>
      {selectionMode === 'toggle' && (
        <div
          className="inline-flex w-full gap-1 rounded-lg bg-[var(--pipeline-surface-subtle)] p-1"
          role="tablist"
          aria-label={t('pipelines.workspace.config.tableSelectionMode')}
        >
          {(['single', 'multiple'] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              role="tab"
              aria-selected={mode === nextMode}
              data-pipeline-source-table-picker-mode={nextMode}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection)] focus-visible:outline-none ${mode === nextMode ? 'bg-[var(--pipeline-surface)] text-[var(--pipeline-text)] shadow-xs' : 'text-[var(--pipeline-text-muted)] hover:text-[var(--pipeline-text)]'}`}
              onClick={() => setMode(nextMode)}
            >
              {t(`pipelines.workspace.config.${nextMode}Table`)}
            </button>
          ))}
        </div>
      )}

      {showTableSearch && (
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--pipeline-border)] bg-[var(--pipeline-surface)] px-3 text-[var(--pipeline-text-muted)]">
          <Search className="size-3.5 shrink-0" aria-hidden="true" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--pipeline-text)] outline-none placeholder:text-[var(--pipeline-form-placeholder)]"
            aria-label={t('pipelines.workspace.config.tableSearch')}
            placeholder={t('pipelines.workspace.config.tableSearch')}
            value={tableQuery}
            onChange={(event) => setTableQuery(event.target.value)}
          />
        </label>
      )}

      <div
        className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--pipeline-border)] p-1"
        data-pipeline-source-table-picker-options
        role={mode === 'single' ? 'radiogroup' : undefined}
        aria-label={mode === 'single' ? t('pipelines.workspace.config.table') : undefined}
      >
        {loading ? (
          <p className="flex min-h-9 items-center px-3 py-2 text-xs leading-4 font-normal text-[var(--pipeline-text-muted)]">
            {t('pipelines.workspace.config.loadingTables')}
          </p>
        ) : filteredTableOptions.length > 0 ? (
          filteredTableOptions.map((option) => {
            const optionValueForSelection = optionValue(option)
            const isSelected = selected.includes(optionValueForSelection)
            const optionLabel =
              option.tableKind === 'regex' ? regexReference(option.value) : option.label

            if (mode === 'single') {
              return (
                <button
                  key={`${option.tableKind}:${option.value}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pipeline-selection)] ${isSelected ? 'bg-[var(--pipeline-surface-subtle)] text-[var(--pipeline-text)]' : 'text-[var(--pipeline-text-muted)] hover:bg-[var(--pipeline-surface-subtle)] hover:text-[var(--pipeline-text)]'}`}
                  data-pipeline-source-table-option={option.value}
                  onClick={() => selectSingle(option)}
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[var(--pipeline-selection)] bg-[var(--pipeline-selection)] text-white' : 'border-[var(--pipeline-border)]'}`}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="size-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{optionLabel}</span>
                  {option.tableKind === 'regex' && (
                    <span className="text-[10px] tracking-wide text-[var(--pipeline-text-muted)] uppercase">
                      {t('pipelines.workspace.config.regexRule')}
                    </span>
                  )}
                </button>
              )
            }

            return (
              <div
                key={`${option.tableKind}:${option.value}`}
                className="text-text-secondary hover:bg-state-base-hover flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors"
                data-pipeline-source-table-option={option.value}
                onClick={() => toggle(option)}
              >
                <Checkbox
                  checked={isSelected}
                  aria-label={optionLabel}
                  onCheckedChange={() => toggle(option)}
                  onClick={(event) => event.stopPropagation()}
                />
                {option.tableKind === 'regex' ? (
                  <Regex
                    className="size-3 shrink-0 text-[var(--pipeline-text-muted)]"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{optionLabel}</span>
                {option.tableKind === 'regex' && (
                  <span className="text-[10px] tracking-wide text-[var(--pipeline-text-muted)] uppercase">
                    {t('pipelines.workspace.config.regexRule')}
                  </span>
                )}
              </div>
            )
          })
        ) : (
          <p className="flex min-h-9 items-center px-3 py-2 text-xs leading-4 text-[var(--pipeline-text-muted)]">
            {tableOptions.length === 0
              ? t('pipelines.workspace.config.noSourceTableOptions')
              : t('pipelines.workspace.config.noMatchingTables')}
          </p>
        )}
      </div>

      {mode === 'multiple' && (
        <>
          <p
            className="text-[11px] text-[var(--pipeline-text-muted)]"
            data-pipeline-source-table-picker-selection
          >
            {t('pipelines.workspace.config.selectedTables', { count: selected.length })}
          </p>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Regex
                className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-[var(--pipeline-text-muted)]"
                aria-hidden="true"
              />
              <input
                className="h-8 w-full rounded-md border border-[var(--pipeline-border)] bg-[var(--pipeline-surface)] pr-2 pl-8 text-xs text-[var(--pipeline-text)] outline-none placeholder:text-[var(--pipeline-form-placeholder)] focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection)]"
                data-pipeline-source-table-picker-pattern
                aria-invalid={patternError}
                placeholder={t('pipelines.workspace.config.regexPlaceholder')}
                value={pattern}
                onChange={(event) => {
                  setPattern(event.target.value)
                  setPatternError(false)
                }}
              />
            </div>
            <Button
              type="button"
              size="medium"
              variant="ghost"
              className="shrink-0"
              data-pipeline-source-table-picker-add-pattern
              disabled={!pattern.trim()}
              onClick={addPattern}
            >
              {t('pipelines.workspace.config.addRegexRule')}
            </Button>
          </div>
          {patternError && (
            <p className="text-[11px] text-red-600">
              {t('pipelines.workspace.config.invalidRegex')}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function displaySourceTable(selection: PipelineSourceTableSelection) {
  return selection.tableKind === 'regex' ? regexReference(selection.table) : selection.table
}

function PipelineTargetTableMappings({
  value,
  sourceTables = [],
  options = [],
  onChange,
}: {
  value?: unknown
  sourceTables?: readonly PipelineSourceTableSelection[]
  options?: readonly PipelineSchemaOption[]
  onChange?: (value: PipelineTargetTableMapping[]) => void
}) {
  const { t } = useTranslation()
  const currentMappings = Array.isArray(value)
    ? value.filter(
        (mapping): mapping is PipelineTargetTableMapping =>
          typeof mapping === 'object' &&
          mapping !== null &&
          typeof mapping.sourceTable === 'string' &&
          typeof mapping.targetTable === 'string',
      )
    : []
  const mappings =
    currentMappings.length > 0
      ? currentMappings
      : sourceTables.map((sourceTable) => ({
          sourceTable: displaySourceTable(sourceTable),
          targetTable: sourceTable.table,
        }))

  return (
    <div className="space-y-1.5" data-pipeline-target-table-mappings>
      {mappings.map((mapping, index) => (
        <div
          key={`${mapping.sourceTable}:${index}`}
          className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-1.5"
          data-pipeline-target-table-mapping={mapping.sourceTable}
        >
          <span
            className="truncate rounded-md bg-[var(--pipeline-surface-subtle)] px-2 py-2 text-xs text-[var(--pipeline-text-subtle)]"
            title={mapping.sourceTable}
          >
            {mapping.sourceTable}
          </span>
          <span
            className="text-center text-xs text-[var(--pipeline-text-muted)]"
            aria-hidden="true"
          >
            →
          </span>
          <PipelineTableAutocomplete
            aria-label={t('pipelines.workspace.config.targetTableFor', {
              table: mapping.sourceTable,
            })}
            options={options}
            value={mapping.targetTable}
            onChange={(targetTable) => {
              const next = mappings.map((current, currentIndex) =>
                currentIndex === index ? { ...current, targetTable } : current,
              )
              onChange?.(next)
            }}
          />
        </div>
      ))}
      {mappings.length === 0 && (
        <p className="text-xs text-[var(--pipeline-text-muted)]">
          {t('pipelines.workspace.config.noUpstreamTables')}
        </p>
      )}
    </div>
  )
}

function dataNodeValues(
  configuration: Extract<PipelineNodeConfiguration, { kind: 'source' | 'target' }>,
  upstreamSourceTables: readonly PipelineSourceTableSelection[] = [],
): FormValues {
  if (configuration.kind === 'source') {
    return {
      sourceId: configuration.sourceId,
      tables: sourceTableSelections(configuration).map((selection) =>
        selection.tableKind === 'regex' ? regexReference(selection.table) : selection.table,
      ),
    }
  }

  return {
    sourceId: configuration.sourceId,
    table: configuration.table,
    ...(upstreamSourceTables.length > 1
      ? {
          tableMappings:
            configuration.tableMappings ??
            upstreamSourceTables.map((sourceTable, index) => ({
              sourceTable: displaySourceTable(sourceTable),
              targetTable: index === 0 ? configuration.table : sourceTable.table,
            })),
        }
      : {}),
    writeMode: configuration.kind === 'target' ? configuration.writeMode : undefined,
    onFullLoad: configuration.onFullLoad,
  }
}

function writeModeLabel(value: string | undefined, t: (key: string) => string) {
  if (value === undefined) return t('pipelines.workspace.config.writeModeDefault')
  if (value === 'upsert' || value === 'append') return t(`pipelines.workspace.transform.${value}`)
  return value
}

function onFullLoadLabel(value: string | undefined, t: (key: string) => string) {
  if (value === undefined) return t('pipelines.workspace.config.onFullLoadPlaceholder')
  return isPipelineOnFullLoad(value)
    ? t(`pipelines.workspace.config.onFullLoadOptions.${value}`)
    : value
}

/** A view's write settings, shown as the Pipeline declares them; views are not edited here. */
function ViewWriteSettings({
  configuration,
}: {
  configuration: Extract<PipelineNodeConfiguration, { kind: 'view' }>
}) {
  const { t } = useTranslation()
  const settings = [
    {
      name: 'writeMode',
      label: t('pipelines.workspace.config.writeMode'),
      value: writeModeLabel(configuration.writeMode, t),
    },
    {
      name: 'onFullLoad',
      label: t('pipelines.workspace.config.onFullLoad'),
      value: onFullLoadLabel(configuration.onFullLoad, t),
    },
  ]
  return (
    <dl className="grid gap-3 px-4 pt-4" data-pipeline-view-write-settings>
      {settings.map((setting) => (
        <div key={setting.name} className="grid gap-1">
          <dt className="text-xs font-medium text-[var(--pipeline-text-muted)]">{setting.label}</dt>
          <dd
            className="text-[13px] text-[var(--pipeline-text)]"
            data-pipeline-view-setting={setting.name}
          >
            {setting.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function DataNodeForm({
  configuration,
  sourceOptions,
  tableOptions,
  loadTables,
  sources,
  upstreamSourceTables,
  onChange,
}: {
  configuration: Extract<PipelineNodeConfiguration, { kind: 'source' | 'target' }>
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
  sources?: readonly SourceView[]
  upstreamSourceTables?: readonly PipelineSourceTableSelection[]
  onChange?: (values: FormValues) => void
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState<FormValues>(() =>
    dataNodeValues(configuration, upstreamSourceTables),
  )
  const synchronizing = useRef(false)
  const formKey = `${configuration.nodeId}:${configuration.kind}:${upstreamSourceTables?.map((table) => `${table.tableKind ?? 'literal'}:${table.table}`).join('|') ?? ''}`
  const form = useFormilyForm<FormValues>({
    resetKey: formKey,
    initialValues: values,
    onValuesChange: (nextValues) => {
      if (synchronizing.current) return
      setValues(nextValues)

      onChange?.(nextValues)
    },
  })
  const schema = useMemo(
    () =>
      localizedDataSchema(configuration.kind, t, {
        sourceId: configuration.sourceId,
        sources,
        sourceOptions,
        tableOptions,
        loadTables,
        upstreamSourceTables,
      }),
    [
      configuration.kind,
      configuration.sourceId,
      loadTables,
      sourceOptions,
      sources,
      tableOptions,
      upstreamSourceTables,
      t,
    ],
  )

  useEffect(() => {
    const nextValues = dataNodeValues(configuration, upstreamSourceTables)
    setValues(nextValues)

    // Formily owns the rendered field values. Keep the form in sync when the
    // selected node changes or an external projection update replaces the
    // configuration, without recreating the form and losing field metadata.
    if (JSON.stringify(form.values) !== JSON.stringify(nextValues)) {
      synchronizing.current = true
      form.setValues(nextValues)
      queueMicrotask(() => {
        synchronizing.current = false
      })
    }
  }, [configuration, form, upstreamSourceTables])

  return (
    <FormilyAntdProvider>
      <div className="pipeline-node-config__form px-4 pt-4">
        <AntdFormily.FormLayout layout="vertical">
          <FormilySchema form={form} schema={schema} components={formilyComponents} />
        </AntdFormily.FormLayout>
      </div>
      <span className="sr-only">{JSON.stringify(values)}</span>
    </FormilyAntdProvider>
  )
}

function transformPatchValues(patch: PipelineTransformConfigurationPatch): PipelineJsonObject {
  return {
    ...patch.body,
    ...(patch.from === undefined ? {} : { from: patch.from }),
    ...(patch.options === undefined ? {} : { options: patch.options }),
  }
}

export function PipelineNodeConfigPanel({
  selection,
  onClose,
  isReadOnly = false,
  onConfigurationChange,
  onDescriptionChange,
  onTitleChange,
  onDelete,
  nextNodes = [],
  onSelectNextNode,
  canAddNextStep = false,
  onRequestNextStep,
  sourceOptions,
  tableOptions,
  loadTables,
  sources,
  upstreamSourceTables,
  fieldTypes,
  upstreamInputs,
}: {
  selection: PipelineCanvasSelection
  onClose: () => void
  isReadOnly?: boolean
  onConfigurationChange?: (change: PipelineNodeConfigurationChange) => void
  onDescriptionChange?: (description: string) => void
  onTitleChange?: (title: string) => void
  onDelete?: () => void
  nextNodes?: readonly PipelineDagNode[]
  onSelectNextNode?: (nodeId: string) => void
  canAddNextStep?: boolean
  onRequestNextStep?: (screenPosition: { x: number; y: number }) => void
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
  sources?: readonly SourceView[]
  upstreamSourceTables?: readonly PipelineSourceTableSelection[]
  fieldTypes?: Readonly<Record<string, string>>
  upstreamInputs?: readonly string[]
}) {
  const { t } = useTranslation()
  const configuration = selection.configuration
  const [description, setDescription] = useState(selection.description)
  const [title, setTitle] = useState(selection.label)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDescription(selection.description)
  }, [selection.description, selection.id])

  useEffect(() => {
    setTitle(selection.label)
  }, [selection.label, selection.id])

  useLayoutEffect(() => {
    const textarea = descriptionRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 60)}px`
  }, [description])

  const emit = (values: PipelineJsonObject) => {
    if (!configuration) return
    onConfigurationChange?.({ nodeId: configuration.nodeId, kind: configuration.kind, values })
  }

  return (
    <Tabs value="settings" className="flex min-h-0 flex-1 flex-col">
      <div className="pipeline-node-config__header">
        <div className="flex items-center px-4 pt-4 pb-1">
          <PipelineNodeIcon data={selection} />
          <div className="mr-2 min-w-0 flex-1">
            <label className="sr-only" htmlFor="pipeline-node-config-title">
              {t('pipelines.workspace.config.nodeTitle')}
            </label>
            <input
              id="pipeline-node-config-title"
              value={title}
              disabled={isReadOnly}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
              onBlur={() => {
                if (title.trim()) onTitleChange?.(title.trim())
                else setTitle(selection.label)
              }}
              className="system-xl-semibold text-text-primary focus-visible:ring-components-input-border-hover h-7 w-full min-w-0 appearance-none rounded-md border border-transparent bg-transparent px-1 outline-hidden focus:shadow-xs focus-visible:ring-1"
            />
          </div>
          <div className="flex shrink-0 items-center text-[var(--color-text-tertiary)]">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={
                  <IconButton
                    type="button"
                    size="md"
                    className="data-popup-open:bg-state-base-hover"
                    aria-label={t('pipelines.workspace.config.moreActions')}
                  >
                    <span className="i-ri-more-fill size-4" aria-hidden="true" />
                  </IconButton>
                }
              />
              <DropdownMenuContent placement="bottom-end" sideOffset={4}>
                <DropdownMenuItem disabled={isReadOnly} onClick={onDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t('pipelines.workspace.config.deleteNode')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span
              className="mx-3 h-3.5 w-px bg-[var(--color-divider-regular)]"
              aria-hidden="true"
            />
            <IconButton
              type="button"
              size="md"
              className="max-sm:size-10"
              aria-label={t('pipelines.workspace.config.close')}
              onClick={onClose}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        </div>
        <div className="p-2">
          <div className="group bg-components-panel-bg flex max-h-15 overflow-y-auto rounded-lg px-2 py-1.25 leading-0 focus-within:shadow-xs">
            <Textarea
              id="pipeline-node-config-description"
              aria-label={t('pipelines.workspace.config.description')}
              className="text-text-primary! placeholder:text-text-quaternary! max-h-15 min-h-0! w-full resize-none! rounded-none! border-0! bg-transparent! p-0! text-xs! leading-4.5! shadow-none! outline-none focus-visible:ring-0!"
              placeholder={t('pipelines.workspace.config.descriptionPlaceholder')}
              ref={descriptionRef}
              rows={1}
              value={description}
              disabled={isReadOnly}
              onValueChange={(nextDescription) => {
                setDescription(nextDescription)
                onDescriptionChange?.(nextDescription)
              }}
            />
          </div>
        </div>
        <div className="flex items-center px-4">
          <TabsList>
            <TabsTab value="settings">{t('nav.settings').toLocaleUpperCase()}</TabsTab>
          </TabsList>
        </div>
      </div>
      <TabsPanel value="settings" className="flex min-h-0 flex-1 flex-col">
        <fieldset disabled={isReadOnly} className="contents">
          <div className="pipeline-node-config__scroll">
            {configuration?.kind === 'source' || configuration?.kind === 'target' ? (
              <DataNodeForm
                configuration={configuration}
                sourceOptions={sourceOptions}
                tableOptions={tableOptions}
                loadTables={loadTables}
                sources={sources}
                upstreamSourceTables={upstreamSourceTables}
                onChange={emit}
              />
            ) : null}
            {configuration?.kind === 'transform' ? (
              <TransformEditor
                config={configuration}
                fieldTypes={fieldTypes}
                upstreamInputs={upstreamInputs}
                onChange={(patch) => emit(transformPatchValues(patch))}
              />
            ) : null}
            {configuration?.kind === 'view' ? (
              <>
                <ViewWriteSettings configuration={configuration} />
                <div className="pipeline-node-config__empty">
                  {t('pipelines.workspace.config.viewReadOnly')}
                </div>
              </>
            ) : null}
            {!configuration ? (
              <div className="pipeline-node-config__empty">
                {t('pipelines.workspace.inspector.emptyBody')}
              </div>
            ) : null}
            {(canAddNextStep || nextNodes.length > 0) && (
              <section
                className="border-divider-regular border-t-[0.5px] p-4"
                aria-label={t('pipelines.workspace.config.nextStep')}
              >
                <h3 className="system-sm-semibold-uppercase text-text-secondary mb-1 flex items-center">
                  {t('pipelines.workspace.config.nextStep')}
                </h3>
                <p className="text-text-tertiary mb-2 text-xs">
                  {t('pipelines.workspace.config.addNextStep')}
                </p>
                <div className="flex py-1">
                  <div className="border-divider-regular bg-background-default flex size-9 shrink-0 items-center justify-center rounded-lg border-[0.5px] shadow-xs">
                    <PipelineNodeIcon data={selection} />
                  </div>
                  <svg className="h-9 w-6 shrink-0" aria-hidden="true">
                    <path
                      d="M0 18h24"
                      fill="none"
                      strokeWidth="1"
                      className="stroke-divider-solid"
                    />
                    <rect x="23" y="16" width="1" height="4" className="fill-divider-solid-alt" />
                  </svg>
                  <div className="bg-background-section-burn min-w-0 flex-1 space-y-0.5 rounded-[10px] p-0.5">
                    {nextNodes.map((node) => (
                      <div
                        key={node.id}
                        className="pipeline-node-config__next-step-item group border-divider-regular bg-background-default hover:bg-background-default-hover text-text-secondary flex h-9 items-center gap-1.5 rounded-lg border-[0.5px] px-2 text-xs shadow-xs"
                      >
                        <PipelineNodeIcon
                          data={{ nodeType: node.type, detail: node.detail, connector: null }}
                        />
                        <span className="system-xs-medium text-text-secondary min-w-0 flex-1 truncate">
                          {node.label}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          className="shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                          onClick={() => onSelectNextNode?.(node.id)}
                        >
                          {t('pipelines.workspace.config.jumpToNode')}
                        </Button>
                      </div>
                    ))}
                    {canAddNextStep && (
                      <button
                        type="button"
                        className="border-divider-regular bg-components-dropzone-bg hover:bg-components-dropzone-bg-alt text-text-placeholder flex h-9 w-full items-center gap-2 rounded-lg border border-dashed px-2 text-left text-xs font-medium uppercase"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          onRequestNextStep?.({ x: rect.left, y: rect.top })
                        }}
                      >
                        <span className="bg-background-default-dimmed flex size-5 items-center justify-center rounded-[5px]">
                          <Plus className="size-3" aria-hidden="true" />
                        </span>
                        {t('pipelines.workspace.config.selectNextStep')}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </fieldset>
      </TabsPanel>
    </Tabs>
  )
}
