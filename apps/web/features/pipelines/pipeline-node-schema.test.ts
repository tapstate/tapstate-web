import { describe, expect, it } from 'vitest'

import { createPipelineDataNodeSchema, pipelineDataNodeSchema } from './pipeline-node-schema'

describe('pipelineDataNodeSchema', () => {
  it('requires the source identity and table while keeping the connector read-only', () => {
    expect(pipelineDataNodeSchema.source.required).toEqual(['sourceId', 'table'])
    expect(pipelineDataNodeSchema.source.properties?.sourceId?.['x-component']).toBe('Input')
    expect(pipelineDataNodeSchema.source.properties?.connector?.['x-component']).toBe('Input')
    expect(pipelineDataNodeSchema.source.properties?.filter?.['x-component']).toBe('TextArea')
    expect(pipelineDataNodeSchema.source.properties?.filter?.['x-component-props']).toMatchObject({
      autoSize: { minRows: 3, maxRows: 8 },
    })
    expect(
      pipelineDataNodeSchema.source.properties?.connector?.['x-component-props'],
    ).toMatchObject({
      disabled: true,
    })
  })

  it('requires target identity and exposes write behavior as a typed select', () => {
    expect(pipelineDataNodeSchema.target.required).toEqual(['sourceId', 'table'])
    expect(pipelineDataNodeSchema.target.properties?.writeMode?.enum).toEqual([
      { label: 'Upsert', value: 'upsert' },
      { label: 'Append', value: 'append' },
    ])
    expect(pipelineDataNodeSchema.target.properties?.writeMode?.default).toBe('upsert')
  })

  it('keeps editable text fields stable when no catalog options are available', () => {
    const schema = createPipelineDataNodeSchema('source')

    expect(schema.properties?.sourceId?.['x-component']).toBe('Input')
    expect(schema.properties?.table?.['x-component']).toBe('Input')
    expect(schema.properties?.filter?.default).toBe('')
  })

  it('turns catalog-backed identity fields into selects without making connector editable', () => {
    const schema = createPipelineDataNodeSchema('target', {
      sourceOptions: [{ label: 'Warehouse', value: 'warehouse' }],
      tableOptions: [{ label: 'player', value: 'player' }],
    })

    expect(schema.properties?.sourceId?.['x-component']).toBe('Select')
    expect(schema.properties?.sourceId?.enum).toEqual([{ label: 'Warehouse', value: 'warehouse' }])
    expect(schema.properties?.table?.['x-component']).toBe('Select')
    expect(schema.properties?.table?.enum).toEqual([{ label: 'player', value: 'player' }])
    expect(schema.properties?.connector?.['x-component-props']).toMatchObject({
      disabled: true,
    })
  })
})
