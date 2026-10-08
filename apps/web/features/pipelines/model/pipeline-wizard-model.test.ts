import { describe, expect, it } from 'vitest'

import {
  canCompileWizardRelations,
  wizardRelationAddShapes,
  wizardRelationTransformReady,
  wizardRelationTransformsPreserveRequiredFields,
  type WizardRelation,
  type WizardRootTable,
} from './pipeline-wizard-model'

const root: WizardRootTable = { id: 'root', sourceId: 'mysql', table: 'customers', key: ['id'] }

function relation(overrides: Partial<WizardRelation> = {}): WizardRelation {
  return {
    id: 'orders',
    sourceId: 'mysql',
    table: 'orders',
    parentId: 'root',
    shape: 'array',
    path: 'orders',
    key: ['id'],
    arrayKey: ['id'],
    conditions: [{ id: 'condition-1', childField: 'customer_id', parentField: 'id' }],
    transforms: [],
    ...overrides,
  }
}

describe('pipeline Wizard relation model', () => {
  it('offers every supported Nest shape when adding a relation', () => {
    expect(wizardRelationAddShapes).toEqual(['object', 'array', 'flat'])
  })

  it('accepts a nested relation tree with flat, object, and array shapes', () => {
    const child = relation({
      id: 'items',
      table: 'order_items',
      parentId: 'orders',
      shape: 'object',
      path: 'latest_item',
      conditions: [{ id: 'condition-2', childField: 'order_id', parentField: 'id' }],
    })
    const flat = relation({
      id: 'profile',
      table: 'profiles',
      shape: 'flat',
      path: '',
      conditions: [{ id: 'condition-2', childField: 'customer_id', parentField: 'id' }],
    })

    expect(canCompileWizardRelations({ root, relations: [relation(), child, flat] })).toBe(true)
  })

  it('allows a relation to attach to any earlier table, not only the preceding item', () => {
    const orders = relation({ id: 'orders', table: 'orders', path: 'orders' })
    const payments = relation({
      id: 'payments',
      table: 'payments',
      path: 'payments',
      conditions: [{ id: 'condition-2', childField: 'customer_id', parentField: 'id' }],
    })
    const lineItems = relation({
      id: 'items',
      table: 'order_items',
      parentId: 'orders',
      path: 'items',
      conditions: [{ id: 'condition-3', childField: 'order_id', parentField: 'id' }],
    })
    expect(canCompileWizardRelations({ root, relations: [orders, payments, lineItems] })).toBe(true)
  })

  it('requires a path for object and array relations, but not for flat', () => {
    expect(
      canCompileWizardRelations({ root, relations: [relation({ shape: 'flat', path: '' })] }),
    ).toBe(true)
    expect(
      canCompileWizardRelations({ root, relations: [relation({ shape: 'flat', path: 'orders' })] }),
    ).toBe(false)
    expect(
      canCompileWizardRelations({ root, relations: [relation({ shape: 'object', path: '' })] }),
    ).toBe(false)
  })

  it('requires a completed filter or map before publish', () => {
    expect(
      wizardRelationTransformReady({ id: 'filter', type: 'filter', body: { expr: 'active' } }),
    ).toBe(true)
    expect(
      wizardRelationTransformReady({ id: 'filter', type: 'filter', body: { expr: '  ' } }),
    ).toBe(false)
    expect(wizardRelationTransformReady({ id: 'map', type: 'map', body: { fields: {} } })).toBe(
      false,
    )
    expect(
      wizardRelationTransformReady({
        id: 'map',
        type: 'map',
        body: { fields: { label: '$name' } },
      }),
    ).toBe(true)
  })

  it('keeps row identity and association fields intact across relation maps', () => {
    const related = relation({
      transforms: [
        {
          id: 'orders_map',
          type: 'map',
          body: { fields: { id: '$id', customer_id: '$customer_id', label: 'active' } },
        },
      ],
    })
    expect(canCompileWizardRelations({ root, relations: [related] })).toBe(true)
    expect(
      canCompileWizardRelations({
        root,
        relations: [
          relation({
            transforms: [
              {
                id: 'orders_map',
                type: 'map',
                body: { fields: { id: false } },
              },
            ],
          }),
        ],
      }),
    ).toBe(false)
    expect(
      canCompileWizardRelations({
        root,
        relations: [
          relation({
            transforms: [
              {
                id: 'orders_map',
                type: 'map',
                body: { fields: { record_id: '$id' } },
              },
            ],
          }),
        ],
      }),
    ).toBe(false)
  })

  it('retains array item identity and child association fields before Nest', () => {
    const related = relation({
      arrayKey: ['line_no'],
      transforms: [
        {
          id: 'orders_map',
          type: 'map',
          body: { fields: { id: '$id', customer_id: '$customer_id' } },
        },
      ],
    })

    expect(wizardRelationTransformsPreserveRequiredFields([related], related.id)).toBe(true)
  })

  it('rejects incomplete, cyclic, or ambiguous association definitions', () => {
    expect(canCompileWizardRelations({ root, relations: [relation({ conditions: [] })] })).toBe(
      false,
    )
    expect(canCompileWizardRelations({ root: { ...root, key: [] }, relations: [relation()] })).toBe(
      false,
    )
    expect(canCompileWizardRelations({ root, relations: [relation({ id: 'root' })] })).toBe(false)
    expect(
      canCompileWizardRelations({
        root,
        relations: [
          relation({ id: 'one', parentId: 'two' }),
          relation({ id: 'two', parentId: 'one' }),
        ],
      }),
    ).toBe(false)
    expect(
      canCompileWizardRelations({
        root,
        relations: [
          relation({
            conditions: [
              { id: 'condition-1', childField: 'customer_id', parentField: 'id' },
              { id: 'condition-2', childField: 'customer_id', parentField: 'tenant_id' },
            ],
          }),
        ],
      }),
    ).toBe(false)
  })
})
