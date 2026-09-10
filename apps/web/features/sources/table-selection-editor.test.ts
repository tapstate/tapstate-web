import { describe, expect, it } from 'vitest'

import { createTableSelection, updateTableSelectionType } from './table-selection-editor'

describe('table selection editor payload helpers', () => {
  it('omits options from new literal and regex selectors', () => {
    expect(createTableSelection('literal')).toMatchObject({
      type: 'literal',
      options: null,
    })
    expect(createTableSelection('regex')).toMatchObject({
      type: 'regex',
      options: null,
    })
  })

  it('drops spec options when changing to literal or regex', () => {
    const spec = {
      type: 'spec',
      name: 'orders',
      pattern: null,
      filter: 'tenant = 1',
      pk: ['id'],
      options: { includeViews: true },
    }

    expect(updateTableSelectionType(spec, 'literal')).toMatchObject({
      type: 'literal',
      options: null,
    })
    expect(updateTableSelectionType(spec, 'regex')).toMatchObject({
      type: 'regex',
      options: null,
    })
  })
})
