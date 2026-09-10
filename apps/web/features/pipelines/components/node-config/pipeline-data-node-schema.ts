import type { Field } from '@formily/core'
import type { ISchema } from '@formily/json-schema'

import type { SourceView } from '@/service/source-client'

export type PipelineFormilySchema = ISchema & {
  properties?: Record<string, PipelineFormilySchema>
  enum?: Array<{ label: string; value: string }>
}

export type PipelineDataNodeKind = 'source' | 'target'

/** Fields that can be edited on a data node. Connector identity is projection metadata, not input. */
export type PipelineDataNodeField = 'sourceId' | 'table' | 'writeMode'

export interface PipelineSchemaOption {
  label: string
  value: string
}

/** Resolves the table catalog after a source has been selected in the form. */
export type PipelineTableLoader = (sourceId: string) => Promise<readonly PipelineSchemaOption[]>

export interface PipelineDataNodeSchemaOptions {
  labels?: Partial<Record<PipelineDataNodeField, string>>
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
  sources?: readonly SourceView[]
}

const verticalItem = {
  'x-decorator': 'FormItem',
  'x-decorator-props': { layout: 'vertical', colon: false },
} satisfies Partial<PipelineFormilySchema>

const defaultLabels: Record<PipelineDataNodeKind, Record<PipelineDataNodeField, string>> = {
  source: {
    sourceId: 'Source',
    table: 'Table',
    writeMode: 'Write mode',
  },
  target: {
    sourceId: 'Target source',
    table: 'Target table',
    writeMode: 'Write mode',
  },
}

function inputOrSelect(title: string, options?: readonly PipelineSchemaOption[]) {
  const hasOptions = Boolean(options?.length)
  const field: PipelineFormilySchema = {
    type: 'string',
    title,
    'x-component': hasOptions ? 'Select' : 'Input',
    'x-component-props': hasOptions ? { allowClear: true } : {},
    ...verticalItem,
  }
  if (hasOptions) field.enum = [...options!]
  return field
}

/** Source tables use a catalog-backed Select. An empty catalog stays selectable once loaded. */
const tableRequestTokens = new WeakMap<Field, number>()

function sourceTableSelect(
  title: string,
  options?: readonly PipelineSchemaOption[],
  loadTables?: PipelineTableLoader,
  sources?: readonly SourceView[],
) {
  const field: PipelineFormilySchema = {
    type: 'array',
    title,
    'x-component': 'Select',
    'x-component-props': { allowClear: false, showSearch: true, mode: 'multiple' },
    enum: [...(options ?? [])],
    ...verticalItem,
  }

  if (loadTables) {
    /**
     * Formily executes function reactions inside an autorun. Reading
     * `sourceId` here makes the async catalog refresh whenever the source
     * changes, while the request token prevents an older response from
     * overwriting a newer selection.
     */
    field['x-reactions'] = (tableField: Field) => {
      const sourceId = tableField.form.values.sourceId
      const requestToken = (tableRequestTokens.get(tableField) ?? 0) + 1
      tableRequestTokens.set(tableField, requestToken)

      if (typeof sourceId !== 'string' || sourceId.length === 0) {
        tableField.setDataSource([])
        tableField.setLoading(false)
        return
      }

      tableField.setDataSource([])
      tableField.setLoading(true)
      void loadTables(sourceId)
        .then((nextOptions) => {
          if (
            tableField.destroyed ||
            tableRequestTokens.get(tableField) !== requestToken ||
            tableField.form.values.sourceId !== sourceId
          ) {
            return
          }

          const normalizedOptions = [...nextOptions]
          const source = sources?.find((candidate) => candidate.id === sourceId)
          const scopedOptions = normalizedOptions.filter((option) =>
            sourceAllowsTable(source, option.value),
          )
          tableField.setDataSource(scopedOptions)
          const currentTables: unknown[] = Array.isArray(tableField.form.values.tables)
            ? tableField.form.values.tables
            : []
          const nextTables = currentTables.filter(
            (table) =>
              typeof table !== 'string' ||
              isRegexReference(table) ||
              scopedOptions.some((option) => option.value === table),
          )
          if (nextTables.length !== currentTables.length) {
            tableField.form.setValuesIn('tables', nextTables)
          }
        })
        .catch(() => {
          if (
            tableField.destroyed ||
            tableRequestTokens.get(tableField) !== requestToken ||
            tableField.form.values.sourceId !== sourceId
          ) {
            return
          }
          tableField.setDataSource([])
        })
        .finally(() => {
          if (!tableField.destroyed && tableRequestTokens.get(tableField) === requestToken) {
            tableField.setLoading(false)
          }
        })
    }
  }

  return field
}

function sourceAllowsTable(source: SourceView | undefined, table: string) {
  if (!source || source.tables === null) return true
  return source.tables.some((configuredTable) => {
    if (configuredTable.name === table) return true
    if (!configuredTable.pattern) return false
    try {
      return new RegExp(configuredTable.pattern).test(table)
    } catch {
      return false
    }
  })
}

function isRegexReference(value: string) {
  return value.length > 1 && value.startsWith('/') && value.endsWith('/')
}

function targetTableAutocomplete(title: string, options?: readonly PipelineSchemaOption[]) {
  return {
    type: 'string',
    title,
    'x-component': 'PipelineTableAutocomplete',
    'x-component-props': {
      allowClear: true,
      options: [...(options ?? [])],
    },
    ...verticalItem,
  } satisfies PipelineFormilySchema
}

export function createPipelineDataNodeSchema(
  kind: PipelineDataNodeKind,
  options: PipelineDataNodeSchemaOptions = {},
): PipelineFormilySchema {
  const labels = { ...defaultLabels[kind], ...options.labels }
  const identityFields = {
    sourceId: inputOrSelect(labels.sourceId, options.sourceOptions),
    ...(kind === 'source'
      ? {
          tables: sourceTableSelect(
            labels.table,
            options.tableOptions,
            options.loadTables,
            options.sources,
          ),
        }
      : { table: targetTableAutocomplete(labels.table, options.tableOptions) }),
  }

  if (kind === 'source') {
    return {
      type: 'object',
      required: ['sourceId', 'tables'],
      properties: {
        ...identityFields,
      },
    }
  }

  return {
    type: 'object',
    required: ['sourceId', 'table'],
    properties: {
      ...identityFields,
      writeMode: {
        type: 'string',
        title: labels.writeMode,
        default: 'upsert',
        'x-component': 'Select',
        enum: [
          { label: 'Upsert', value: 'upsert' },
          { label: 'Append', value: 'append' },
        ],
        ...verticalItem,
      },
    },
  }
}

export const pipelineDataNodeSchema = {
  source: createPipelineDataNodeSchema('source'),
  target: createPipelineDataNodeSchema('target'),
} satisfies Record<PipelineDataNodeKind, PipelineFormilySchema>
