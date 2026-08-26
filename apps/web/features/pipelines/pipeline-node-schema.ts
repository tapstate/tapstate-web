import type { ISchema } from '@formily/json-schema'

export type PipelineFormilySchema = ISchema & {
  properties?: Record<string, PipelineFormilySchema>
  enum?: Array<{ label: string; value: string }>
}

export type PipelineDataNodeKind = 'source' | 'target'

export type PipelineDataNodeField = 'sourceId' | 'table' | 'connector' | 'filter' | 'writeMode'

export interface PipelineSchemaOption {
  label: string
  value: string
}

export interface PipelineDataNodeSchemaOptions {
  labels?: Partial<Record<PipelineDataNodeField, string>>
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
}

const verticalItem = {
  'x-decorator': 'FormItem',
  'x-decorator-props': { layout: 'vertical', colon: false },
} satisfies Partial<PipelineFormilySchema>

const defaultLabels: Record<PipelineDataNodeKind, Record<string, string>> = {
  source: {
    sourceId: 'Source',
    table: 'Table',
    connector: 'Connector',
    filter: 'Table filter',
  },
  target: {
    sourceId: 'Target source',
    table: 'Target table',
    connector: 'Connector',
    writeMode: 'Write mode',
  },
}

function textField(title: string, options?: readonly PipelineSchemaOption[]) {
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

function readonlyField(title: string) {
  return {
    type: 'string',
    title,
    'x-component': 'Input',
    'x-component-props': { disabled: true },
    ...verticalItem,
  } satisfies PipelineFormilySchema
}

export function createPipelineDataNodeSchema(
  kind: PipelineDataNodeKind,
  options: PipelineDataNodeSchemaOptions = {},
): PipelineFormilySchema {
  const labels = { ...defaultLabels[kind], ...options.labels } as Partial<
    Record<PipelineDataNodeField, string>
  >
  const labelFor = (field: PipelineDataNodeField, fallback: string) => labels[field] ?? fallback
  const identityFields = {
    sourceId: textField(labelFor('sourceId', 'Source'), options.sourceOptions),
    table: textField(labelFor('table', 'Table'), options.tableOptions),
    connector: readonlyField(labelFor('connector', 'Connector')),
  }

  if (kind === 'source') {
    return {
      type: 'object',
      required: ['sourceId', 'table'],
      properties: {
        ...identityFields,
        filter: {
          type: 'string',
          title: labelFor('filter', 'Table filter'),
          default: '',
          'x-component': 'TextArea',
          'x-component-props': { autoSize: { minRows: 3, maxRows: 8 } },
          ...verticalItem,
        },
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
        title: labelFor('writeMode', 'Write mode'),
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
