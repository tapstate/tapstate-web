import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import type {
  DataSourceMeta,
  TableMeta,
} from '../components/reference-wizard/ReferenceWizardBuilder'
import type { DeploymentProfile } from './deployment-profile'

export interface Customer360Preset {
  sourceId: string
  root: TableMeta
  customer: TableMeta
  lines: TableMeta
  orderCustomerJoin: Array<{ parentField: string; childField: string }>
  orderLineJoin: Array<{ parentField: string; childField: string }>
  amountField: string | null
}

const CUSTOMER_KEYS = ['c_w_id', 'c_d_id', 'c_id']
const CUSTOMER_ORDER_KEYS = ['o_w_id', 'o_d_id', 'o_c_id']
const ORDER_KEYS = ['o_w_id', 'o_d_id', 'o_id']
const LINE_KEYS = ['ol_w_id', 'ol_d_id', 'ol_o_id']

/** The guide marker lives in output.config, which the server preserves as an open map. */
export function isGuidedCustomer360Pipeline(
  pipelineId: string,
  wizard: PipelineJsonObject | null | undefined,
): boolean {
  if (!wizard) return false
  const output = wizard.output as { config?: { onboardingGuide?: string } } | undefined
  if (
    output?.config?.onboardingGuide === 'order-360-sample' ||
    output?.config?.onboardingGuide === 'customer-360-sample'
  )
    return true
  // Recognize drafts created before the marker existed only when their fixed sample structure matches.
  const root = wizard.root as { id?: string } | undefined
  const related = Array.isArray(wizard.related) ? wizard.related : []
  return (
    /^(?:customer|order)_360_[0-9a-f]{8}$/i.test(pipelineId) &&
    root?.id === 'root' &&
    related.some((entry) =>
      Boolean(
        entry &&
        typeof entry === 'object' &&
        (entry.id === 'customer-360-orders' || entry.id === 'order-360-customer'),
      ),
    ) &&
    related.some((entry) =>
      Boolean(
        entry &&
        typeof entry === 'object' &&
        (entry.id === 'customer-360-items' || entry.id === 'order-360-lines'),
      ),
    )
  )
}

/** Finds one sample schema that can form an order-root document. */
export function findCustomer360Preset(catalog: DataSourceMeta[]): Customer360Preset | null {
  const candidates = catalog
    .filter((source) => /mysql|postgres|postgresql/i.test(source.connector || ''))
    .sort((left, right) => connectorPriority(left.connector) - connectorPriority(right.connector))

  for (const source of candidates) {
    const customer = source.tables.find((table) => isCustomerTable(table.name))
    const root =
      source.tables.find((table) => basename(table.name).endsWith('bmsql_oorder')) ??
      source.tables.find((table) => isOrderTable(table.name))
    const lines =
      source.tables.find((table) => basename(table.name).endsWith('bmsql_order_line')) ??
      source.tables.find((table) => isOrderLineTable(table.name))
    if (!root || !customer || !lines) continue
    const rootKeys = tableKeys(root)

    const orderCustomerJoin = findJoin(
      root,
      customer,
      CUSTOMER_ORDER_KEYS,
      CUSTOMER_KEYS,
      'customer',
    )
    const orderLineJoin = findJoin(root, lines, ORDER_KEYS, LINE_KEYS, 'order')
    if (!orderCustomerJoin || !orderLineJoin || rootKeys.length === 0) continue

    return {
      sourceId: source.id,
      root,
      customer,
      lines,
      orderCustomerJoin,
      orderLineJoin,
      amountField:
        lines.columns.find((column) =>
          /^(ol_)?amount$|^total_amount$|^line_total$|^subtotal$/i.test(column),
        ) ?? null,
    }
  }
  return null
}

/** Builds the builder's real draft document from discovered schema metadata. */
export function createCustomer360Wizard(
  preset: Customer360Preset,
  destinationSourceId: string,
  writeMode: string,
  deploymentProfile: DeploymentProfile,
): PipelineJsonObject {
  return {
    root: {
      id: 'root',
      sourceId: preset.sourceId,
      table: preset.root.name,
      key: tableKeys(preset.root),
      preTransforms: [],
    },
    related: [
      {
        id: 'order-360-customer',
        parentId: 'root',
        sourceId: preset.sourceId,
        table: preset.customer.name,
        relation: {
          shape: 'object',
          path: 'customer',
          key: tableKeys(preset.customer),
          on: preset.orderCustomerJoin.map(({ parentField, childField }) => ({
            parentField,
            childField,
          })),
        },
        preTransforms: [],
      },
      {
        id: 'order-360-lines',
        parentId: 'root',
        sourceId: preset.sourceId,
        table: preset.lines.name,
        relation: {
          shape: 'array',
          path: 'lines',
          key: tableKeys(preset.lines),
          arrayKey: tableKeys(preset.lines),
          on: preset.orderLineJoin.map(({ parentField, childField }) => ({
            parentField,
            childField,
          })),
        },
        preTransforms: [],
      },
    ],
    transforms: [],
    output: {
      kind: deploymentProfile === 'cloud' ? 'atlas' : 'source',
      config: {
        sourceId: destinationSourceId,
        table: 'order_360_views',
        inputTable: preset.root.name,
        writeMode: writeMode || 'upsert',
        onboardingGuide: 'order-360-sample',
      },
    },
  }
}

export function createCustomerLifetimeValueTransform(
  preset: Customer360Preset,
): PipelineJsonObject | null {
  if (!preset.amountField) return null
  return {
    id: 'order-360-total',
    type: 'map',
    fields: {
      order_total: `=lines.map(i, i.${preset.amountField}).sum()`,
    },
  }
}

function findJoin(
  parent: TableMeta,
  child: TableMeta,
  expectedParentKeys: string[],
  expectedChildKeys: string[],
  relation: 'customer' | 'order',
) {
  const parentColumns = new Map(parent.columns.map((field) => [normalizeField(field), field]))
  const childColumns = new Map(child.columns.map((field) => [normalizeField(field), field]))
  const expectedPairs = expectedParentKeys.map((parentField, index) => ({
    parentField,
    childField: expectedChildKeys[index],
  }))

  const discoveredPairs = expectedPairs.map(({ parentField, childField }) => {
    const discoveredParentField = parentColumns.get(normalizeField(parentField))
    const discoveredChildField = childColumns.get(normalizeField(childField))
    return discoveredParentField && discoveredChildField
      ? { parentField: discoveredParentField, childField: discoveredChildField }
      : null
  })
  if (discoveredPairs.length > 0 && discoveredPairs.every(Boolean))
    return discoveredPairs as Array<{ parentField: string; childField: string }>

  const parentKeys = tableKeys(parent)
  const inferred = parentKeys.map((parentField) => {
    const normalizedParentField = normalizeField(parentField)
    const candidates =
      relation === 'customer'
        ? [
            normalizedParentField === 'id' ? 'customer_id' : '',
            normalizedParentField === 'c_id'
              ? 'o_c_id'
              : normalizedParentField.startsWith('c_')
                ? `o_${normalizedParentField.slice(2)}`
                : '',
            normalizedParentField,
          ]
        : [
            normalizedParentField === 'id' ? 'order_id' : '',
            normalizedParentField.startsWith('o_') ? `ol_${normalizedParentField.slice(2)}` : '',
            normalizedParentField,
          ]
    const childField = candidates
      .map((candidate) => (candidate ? childColumns.get(normalizeField(candidate)) : undefined))
      .find((candidate): candidate is string => Boolean(candidate))
    const discoveredParentField = parentColumns.get(normalizedParentField)
    return childField && discoveredParentField
      ? { parentField: discoveredParentField, childField }
      : null
  })

  return inferred.length > 0 && inferred.every(Boolean)
    ? (inferred as Array<{ parentField: string; childField: string }>)
    : null
}

function isCustomerTable(name: string) {
  const table = basename(name)
  return /(?:^|_)customers?$/.test(table) || table.endsWith('bmsql_customer')
}

function isOrderTable(name: string) {
  const table = basename(name)
  return /(?:^|_)orders?$/.test(table) || table.endsWith('bmsql_oorder')
}

function isOrderLineTable(name: string) {
  const table = basename(name)
  return (
    /(?:^|_)(?:order[_-]?(?:items?|lines?)|items?)$/.test(table) ||
    table.endsWith('bmsql_order_line')
  )
}

function basename(name: string) {
  return name.split(/[./]/).at(-1)?.toLowerCase() ?? name.toLowerCase()
}

function normalizeField(field: string) {
  return field.toLowerCase()
}

function tableKeys(table: TableMeta) {
  return table.keys?.length ? table.keys : table.primaryKey ? [table.primaryKey] : []
}

function connectorPriority(connector = '') {
  return /mysql/i.test(connector) ? 0 : 1
}
