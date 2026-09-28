import { describe, expect, it } from 'vitest'

import type { WizardViewState } from './ReferenceWizardBuilder'

import { readWizard, writeWizard } from './wizard-adapter'

describe('Wizard post-assembly transforms', () => {
  it('round-trips ordered transforms through the Wizard document', () => {
    const state: WizardViewState = {
      root: {
        source: 'mysql',
        table: 'customers',
        primaryKey: 'id',
        keys: ['id'],
        rowCount: '—',
        columns: ['id', 'name'],
      },
      relations: [],
      transforms: [
        {
          id: 'filter-active',
          name: 'Active customers',
          type: 'filter',
          config: { filter: { expr: "status == 'active'" } },
        },
        {
          id: 'map-label',
          name: 'Add label',
          type: 'map',
          config: {
            map: {
              fields: [
                { id: 'label', outputField: 'label', ruleType: 'literal', value: '"customer"' },
              ],
            },
          },
        },
      ],
      destinationTable: 'customer_views',
      destinationSourceId: 'atlas',
      destinationWriteMode: 'upsert',
    }

    const document = writeWizard(state, null, 'atlas')
    expect(document.transforms).toEqual([
      { id: 'filter-active', type: 'filter', fields: { expr: "status == 'active'" } },
      { id: 'map-label', type: 'map', fields: { label: 'customer' } },
    ])
    const restored = readWizard(document, [
      {
        id: 'mysql',
        name: 'MySQL',
        badge: 'mysql',
        tables: [{ name: 'customers', primaryKey: 'id', rowCount: '—', columns: ['id', 'name'] }],
      },
    ])
    expect(restored.transforms.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: 'filter-active', type: 'filter' },
      { id: 'map-label', type: 'map' },
    ])
    expect(restored.transforms[1].config.map?.fields[0]).toMatchObject({
      outputField: 'label',
      ruleType: 'literal',
      value: '"customer"',
    })
  })

  it('keeps the existing Atlas representation for a cloud deployment', () => {
    const state: WizardViewState = {
      root: null,
      relations: [],
      transforms: [],
      destinationTable: 'customer_views',
      destinationSourceId: 'atlas',
      destinationWriteMode: 'append',
    }
    expect(writeWizard(state, null, 'atlas', 'cloud').output).toEqual({
      kind: 'atlas',
      config: {
        sourceId: 'atlas',
        table: 'customer_views',
        inputTable: '',
        writeMode: 'append',
      },
    })
  })
})
