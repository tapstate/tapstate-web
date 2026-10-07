import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import type {
  DataSourceMeta,
  TableMeta,
} from '../components/reference-wizard/ReferenceWizardBuilder'
import type { DeploymentProfile } from './deployment-profile'

export interface Customer360Preset {
  sourceId: string
  root: TableMeta
  orders: TableMeta
  items: TableMeta
  rootOrderJoin: Array<{ parentField: string; childField: string }>
  orderItemsJoin: Array<{ parentField: string; childField: string }>
  amountField: string | null
}

const CUSTOMER_KEYS = ['c_w_id', 'c_d_id', 'c_id']
const CUSTOMER_ORDER_KEYS = ['o_w_id', 'o_d_id', 'o_c_id']
const ORDER_KEYS = ['o_w_id', 'o_d_id', 'o_id']
const LINE_KEYS = ['ol_w_id', 'ol_d_id', 'ol_o_id']

/** Finds a connected MySQL/Postgres sample schema that can form a customer/order document. */
export function findCustomer360Preset(catalog: DataSourceMeta[]): Customer360Preset | null {
  const candidates = catalog
    .filter((source) => !source.sink && /mysql|postgres|postgresql/i.test(source.connector || ''))
    .sort((left, right) => connectorPriority(left.connector) - connectorPriority(right.connector))

  for (const source of candidates) {
    const root = source.tables.find((table) => isCustomerTable(table.name))
    const orders = source.tables.find((table) => isOrderTable(table.name))
    const items = source.tables.find((table) => isOrderLineTable(table.name))
    if (!root || !orders || !items) continue
    const rootKeys = tableKeys(root)

    const rootOrderJoin = findJoin(root, orders, CUSTOMER_KEYS, CUSTOMER_ORDER_KEYS, 'customer')
    const orderItemsJoin = findJoin(orders, items, ORDER_KEYS, LINE_KEYS, 'order')
    if (!rootOrderJoin || !orderItemsJoin || rootKeys.length === 0) continue

    return {
      sourceId: source.id,
      root,
      orders,
      items,
      rootOrderJoin,
      orderItemsJoin,
      amountField:
        items.columns.find((column) =>
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
  const orderId = 'customer-360-orders'
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
        id: orderId,
        parentId: 'root',
        sourceId: preset.sourceId,
        table: preset.orders.name,
        relation: {
          shape: 'array',
          path: 'orders',
          key: tableKeys(preset.orders),
          arrayKey: tableKeys(preset.orders),
          on: preset.rootOrderJoin.map(({ parentField, childField }) => ({
            parentField,
            childField,
          })),
        },
        preTransforms: [],
      },
      {
        id: 'customer-360-items',
        parentId: orderId,
        sourceId: preset.sourceId,
        table: preset.items.name,
        relation: {
          shape: 'array',
          path: 'items',
          key: tableKeys(preset.items),
          arrayKey: tableKeys(preset.items),
          on: preset.orderItemsJoin.map(({ parentField, childField }) => ({
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
        table: 'customer_360_views',
        inputTable: preset.root.name,
        writeMode: writeMode || 'upsert',
      },
    },
  }
}

export function createCustomerLifetimeValueTransform(
  preset: Customer360Preset,
): PipelineJsonObject | null {
  if (!preset.amountField) return null
  return {
    id: 'customer-360-lifetime-value',
    type: 'map',
    fields: {
      lifetime_value: `=orders.map(o, o.items.map(i, i.${preset.amountField}).sum()).sum()`,
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
