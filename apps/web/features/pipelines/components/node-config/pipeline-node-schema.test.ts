import type { Field } from '@formily/core'

import { describe, expect, it, vi } from 'vitest'

import { createPipelineDataNodeSchema, pipelineDataNodeSchema } from './pipeline-data-node-schema'

describe('pipelineDataNodeSchema', () => {
  it('requires source identity and table without leaking connector metadata', () => {
    expect(pipelineDataNodeSchema.source.required).toEqual(['sourceId', 'table'])
    expect(pipelineDataNodeSchema.source.properties?.sourceId?.['x-component']).toBe('Input')
    expect(pipelineDataNodeSchema.source.properties?.connector).toBeUndefined()
    expect(pipelineDataNodeSchema.source.properties?.table?.['x-component']).toBe('Select')
    expect(pipelineDataNodeSchema.source.properties?.filter?.['x-component']).toBe('TextArea')
    expect(pipelineDataNodeSchema.source.properties?.filter?.['x-component-props']).toMatchObject({
      autoSize: { minRows: 3, maxRows: 8 },
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

  it('keeps source editing available while table remains a catalog selector', () => {
    const schema = createPipelineDataNodeSchema('source')

    expect(schema.properties?.sourceId?.['x-component']).toBe('Input')
    expect(schema.properties?.table?.['x-component']).toBe('Select')
    expect(schema.properties?.table?.enum).toEqual([])
    expect(schema.properties?.filter?.default).toBe('')
  })

  it('turns catalog-backed identity fields into selects', () => {
    const schema = createPipelineDataNodeSchema('target', {
      sourceOptions: [{ label: 'Warehouse', value: 'warehouse' }],
      tableOptions: [{ label: 'player', value: 'player' }],
    })

    expect(schema.properties?.sourceId?.['x-component']).toBe('Select')
    expect(schema.properties?.sourceId?.enum).toEqual([{ label: 'Warehouse', value: 'warehouse' }])
    expect(schema.properties?.table?.['x-component']).toBe('Select')
    expect(schema.properties?.table?.enum).toEqual([{ label: 'player', value: 'player' }])
  })

  it('refreshes the table catalog through an async x-reaction', async () => {
    const loadTables = vi.fn(async (sourceId: string) => [
      { label: `${sourceId} users`, value: `${sourceId}.users` },
    ])
    const schema = createPipelineDataNodeSchema('source', { loadTables })
    const reaction = schema.properties?.table?.['x-reactions']
    const setDataSource = vi.fn()
    const setLoading = vi.fn()
    const setValuesIn = vi.fn()
    const field = {
      destroyed: false,
      form: {
        values: { sourceId: 'warehouse', table: 'warehouse.old' },
        setValuesIn,
      },
      setDataSource,
      setLoading,
    } as unknown as Field

    expect(typeof reaction).toBe('function')
    if (typeof reaction !== 'function') return
    reaction(field, {})
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loadTables).toHaveBeenCalledWith('warehouse')
    expect(setDataSource).toHaveBeenLastCalledWith([
      { label: 'warehouse users', value: 'warehouse.users' },
    ])
    expect(setValuesIn).toHaveBeenCalledWith('table', undefined)
    expect(setLoading).toHaveBeenLastCalledWith(false)
  })
})
