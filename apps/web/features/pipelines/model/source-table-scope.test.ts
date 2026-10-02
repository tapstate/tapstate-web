import { describe, expect, it } from 'vitest'

import { sourceScopedTableNames } from './source-table-scope'

describe('sourceScopedTableNames', () => {
  it('uses discovered schema tables matching configured patterns', () => {
    expect(
      sourceScopedTableNames(
        {
          tables: [
            {
              type: 'pattern',
              name: null,
              pattern: '^public\\.',
              filter: null,
              pk: null,
              options: null,
            },
          ],
        },
        ['public.customers', 'public.orders', 'private.audit'],
      ),
    ).toEqual(['public.customers', 'public.orders'])
  })

  it('keeps exact configured names and respects an empty scope', () => {
    expect(
      sourceScopedTableNames(
        {
          tables: [
            {
              type: 'table',
              name: 'customers',
              pattern: null,
              filter: null,
              pk: null,
              options: null,
            },
          ],
        },
        ['orders', 'customers'],
      ),
    ).toEqual(['customers'])
    expect(sourceScopedTableNames({ tables: [] }, ['customers'])).toEqual([])
  })

  it('includes all discovered tables for an unrestricted source', () => {
    expect(sourceScopedTableNames({ tables: null }, ['orders', 'customers'])).toEqual([
      'orders',
      'customers',
    ])
  })

  it('treats an omitted tables field as an unrestricted scope', () => {
    expect(sourceScopedTableNames({}, ['orders', 'customers'])).toEqual(['orders', 'customers'])
  })
})
