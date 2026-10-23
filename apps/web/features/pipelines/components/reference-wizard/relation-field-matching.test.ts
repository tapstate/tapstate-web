import { describe, expect, it } from 'vitest'

import { matchRelationFields } from './relation-field-matching'

describe('relation field matching', () => {
  it('matches a table-named foreign key to the parent primary key', () => {
    expect(
      matchRelationFields(
        {
          name: 'public.orders',
          columns: ['order_id', 'customer_id'],
          primaryKey: 'order_id',
        },
        {
          name: 'public.customers',
          columns: ['id', 'name'],
          primaryKey: 'id',
        },
      ),
    ).toEqual({ childField: 'customer_id', parentField: 'id' })
  })

  it('does not guess from generic ids or shared non-key fields', () => {
    expect(
      matchRelationFields(
        {
          name: 'orders',
          columns: ['id', 'tenant_id'],
          primaryKey: 'id',
        },
        {
          name: 'customers',
          columns: ['id', 'tenant_id'],
          primaryKey: 'id',
        },
      ),
    ).toBeNull()
  })

  it('prefers an exact shared key over a table-name guess', () => {
    expect(
      matchRelationFields(
        {
          name: 'archive_children',
          columns: ['id', 'archive_customer_id', 'customer_id'],
          primaryKey: 'id',
          keys: ['id'],
        },
        {
          name: 'crm_customers',
          columns: ['archive_customer_id', 'archive_name'],
          primaryKey: 'archive_customer_id',
          keys: ['archive_customer_id'],
        },
      ),
    ).toEqual({ childField: 'archive_customer_id', parentField: 'archive_customer_id' })
  })
})
