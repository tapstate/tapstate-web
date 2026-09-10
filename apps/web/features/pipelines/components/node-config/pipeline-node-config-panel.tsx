import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import * as AntdFormily from '@potop/formily-antd-v6'
import { FormilySchema, useFormilyForm, type FormilyComponentMap } from '@tapstate-web/formily'
import { Select as AntdSelect } from 'antd'
import { Check, Regex, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'

import { FormilyAntdProvider } from '@/components/formily/formily-antd-provider'
import { Button } from '@/components/ui/button'
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

import { sourceTableSelections } from '../../model/pipeline-node-model'
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
    source?.tables === null
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

function PipelineSourceTablePicker({
  value,
  options,
  loading = false,
  sourceId,
  sources,
  onChange,
}: {
  value?: unknown
  options?: readonly PipelineSchemaOption[]
  loading?: boolean
  sourceId?: string
  sources?: readonly SourceView[]
  onChange?: (value: string[]) => void
}) {
  const { t } = useTranslation()
  const currentValue = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? [value]
      : []
  const [mode, setMode] = useState<'single' | 'multiple'>(
    currentValue.length > 1 ? 'multiple' : 'single',
  )
  const [selected, setSelected] = useState<string[]>(currentValue)
  const [pattern, setPattern] = useState('')
  const [patternError, setPatternError] = useState(false)
  const tableOptions = useMemo(
    () => sourceTablePickerOptions(sourceId, sources, options),
    [options, sourceId, sources],
  )

  useEffect(() => {
    setSelected(currentValue)
    if (currentValue.length > 1) setMode('multiple')
  }, [sourceId, value])

  const selectOptions = tableOptions.map((option) => ({
    label:
      option.tableKind === 'regex'
        ? `${t('pipelines.workspace.config.regexPrefix')}${option.label}`
        : option.label,
    value: optionValue(option),
  }))

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

      {mode === 'single' ? (
        <AntdSelect
          allowClear={false}
          className="w-full"
          loading={loading}
          options={selectOptions}
          showSearch
          optionFilterProp="label"
          value={currentValue[0] || undefined}
          onChange={(nextValue) => {
            onChange?.([nextValue])
          }}
        />
      ) : (
        <>
          <div
            className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--pipeline-border)] p-1"
            data-pipeline-source-table-picker-options
          >
            {tableOptions.map((option) => (
              <label
                key={`${option.tableKind}:${option.value}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--pipeline-text)] transition-colors hover:bg-[var(--pipeline-surface-subtle)]"
                data-pipeline-source-table-option={option.value}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(optionValue(option))}
                  onChange={() => toggle(option)}
                />
                {option.tableKind === 'regex' ? (
                  <Regex
                    className="size-3 shrink-0 text-[var(--pipeline-text-muted)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Check className="size-3 shrink-0 text-transparent" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {option.tableKind === 'regex' ? regexReference(option.value) : option.label}
                </span>
                {option.tableKind === 'regex' && (
                  <span className="text-[10px] tracking-wide text-[var(--pipeline-text-muted)] uppercase">
                    {t('pipelines.workspace.config.regexRule')}
                  </span>
                )}
              </label>
            ))}
            {tableOptions.length === 0 && (
              <p className="px-2 py-2 text-xs text-[var(--pipeline-text-muted)]">
                {t('pipelines.workspace.config.noSourceTableOptions')}
              </p>
            )}
          </div>
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
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 px-2 text-xs"
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
  }
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
  onConfigurationChange,
  onDescriptionChange,
  sourceOptions,
  tableOptions,
  loadTables,
  sources,
  upstreamSourceTables,
}: {
  selection: PipelineCanvasSelection
  onClose: () => void
  onConfigurationChange?: (change: PipelineNodeConfigurationChange) => void
  onDescriptionChange?: (description: string) => void
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
  sources?: readonly SourceView[]
  upstreamSourceTables?: readonly PipelineSourceTableSelection[]
}) {
  const { t } = useTranslation()
  const configuration = selection.configuration
  const [description, setDescription] = useState(selection.description)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDescription(selection.description)
  }, [selection.description, selection.id])

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
    <>
      <div className="pipeline-node-config__header">
        <div className="flex items-center px-4 pt-4 pb-1">
          <PipelineNodeIcon data={selection} />
          <div className="min-w-0 flex-1">
            <h2>{selection.label}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 max-sm:size-10"
            aria-label={t('pipelines.workspace.config.close')}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-2">
          <div className="group flex max-h-[3.75rem] overflow-y-auto rounded-[8px] bg-transparent px-2 py-[5px] leading-none focus-within:shadow-xs">
            <Textarea
              aria-label={t('pipelines.workspace.config.description')}
              className="max-h-[3.75rem] min-h-0! w-full resize-none! rounded-none! border-0! bg-transparent! p-0! text-xs! leading-[1.125rem]! text-[var(--pipeline-text)]! shadow-none! outline-none placeholder:text-[var(--pipeline-form-placeholder)]! focus-visible:ring-0!"
              placeholder={t('pipelines.workspace.config.descriptionPlaceholder')}
              ref={descriptionRef}
              rows={1}
              value={description}
              onChange={(event) => {
                const nextDescription = event.target.value
                setDescription(nextDescription)
                onDescriptionChange?.(nextDescription)
              }}
            />
          </div>
        </div>
      </div>
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
            onChange={(patch) => emit(transformPatchValues(patch))}
          />
        ) : null}
        {configuration?.kind === 'view' ? (
          <div className="pipeline-node-config__empty">
            {t('pipelines.workspace.config.viewReadOnly')}
          </div>
        ) : null}
        {!configuration ? (
          <div className="pipeline-node-config__empty">
            {t('pipelines.workspace.inspector.emptyBody')}
          </div>
        ) : null}
      </div>
    </>
  )
}
