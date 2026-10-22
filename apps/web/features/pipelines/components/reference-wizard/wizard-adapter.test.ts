import { describe, expect, it } from 'vitest'

import type { WizardViewState } from './ReferenceWizardBuilder'

import {
  readTransforms,
  readWizard,
  summarizeWizard,
  writeWizard,
  wizardUpsertKeylessInput,
} from './wizard-adapter'

describe('Wizard post-assembly transforms', () => {
  it('retains the configured source identity field and element type when reloading unwind', () => {
    const restored = readTransforms([
      {
        id: 'tags',
        type: 'unwind',
        fields: {
          path: 'TAGS',
          include_array_index: 'TAG_NO',
          source_id_field: 'original_id',
          element_type: 'string',
        },
      },
    ])
    expect(restored[0].config.unwind).toMatchObject({
      path: 'TAGS',
      source_id_field: 'original_id',
      element_type: 'string',
    })
  })

  it('identifies only discovered keyless inputs when the destination upserts', () => {
    const catalog = [
      {
        id: 'mysql',
        name: 'MySQL',
        badge: 'mysql',
        tables: [
          {
            name: 'orders',
            primaryKey: 'id',
            keys: ['id'],
            discovered: true,
            rowCount: '—',
            columns: [],
          },
          {
            name: 'events',
            primaryKey: '',
            keys: [],
            discovered: true,
            rowCount: '—',
            columns: [],
          },
          {
            name: 'unknown',
            primaryKey: '',
            keys: [],
            discovered: false,
            rowCount: '—',
            columns: [],
          },
        ],
      },
    ]
    const wizard = {
      root: { sourceId: 'mysql', table: 'orders' },
      related: [{ sourceId: 'mysql', table: 'events' }],
      output: { config: { writeMode: 'upsert' } },
    }
    expect(wizardUpsertKeylessInput(wizard, catalog)).toEqual({
      sourceId: 'mysql',
      table: 'events',
    })
    expect(
      wizardUpsertKeylessInput({ ...wizard, output: { config: { writeMode: 'append' } } }, catalog),
    ).toBeNull()
    expect(
      wizardUpsertKeylessInput(
        { ...wizard, related: [], root: { sourceId: 'mysql', table: 'unknown' } },
        catalog,
      ),
    ).toBeNull()
  })

  it('summarizes root, related-table, and post-assembly transforms for the action dock', () => {
    expect(
      summarizeWizard({
        root: { table: 'customers', preTransforms: [{ type: 'filter' }] },
        related: [
          { table: 'orders', preTransforms: [{ type: 'map' }, { type: 'unwind' }] },
          { table: 'profiles', preTransforms: [] },
        ],
        transforms: [{ type: 'js' }],
      }),
    ).toEqual({ rootTable: 'customers', relatedCount: 2, transformCount: 4 })
  })

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
        {
          id: 'expand-tags',
          name: 'Tags',
          type: 'unwind',
          config: {
            unwind: {
              path: 'tags',
              include_array_index: 'tag_no',
              source_id_field: 'original_id',
              element_type: 'string',
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
      {
        id: 'expand-tags',
        type: 'unwind',
        fields: {
          path: 'tags',
          include_array_index: 'tag_no',
          source_id_field: 'original_id',
          element_type: 'string',
        },
      },
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
      { id: 'expand-tags', type: 'unwind' },
    ])
    expect(restored.transforms[2].config.unwind?.source_id_field).toBe('original_id')
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
