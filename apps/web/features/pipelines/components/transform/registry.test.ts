import { describe, expect, it } from 'vitest'

import {
  getPipelineTransformDefinition,
  listPipelineTransformDefinitions,
  registerPipelineTransform,
} from './registry'

describe('pipeline transform registry', () => {
  it('keeps built-in processors discoverable with their own schemas', () => {
    expect(getPipelineTransformDefinition('filter')?.schema.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'expr', kind: 'expression' })]),
    )
    expect(listPipelineTransformDefinitions().map((item) => item.schema.type)).toEqual(
      expect.arrayContaining(['filter', 'map', 'join', 'union', 'nest', 'js']),
    )
  })

  it('allows an extension processor to register and unregister without editing the switch', () => {
    const unregister = registerPipelineTransform({
      schema: {
        type: 'redact',
        titleKey: 'pipelines.workspace.transform.redact.title',
        descriptionKey: 'pipelines.workspace.transform.redact.description',
        fields: [{ key: 'fields', kind: 'mapping' }],
      },
      editor: () => null,
    })

    expect(getPipelineTransformDefinition('redact')?.schema.type).toBe('redact')
    unregister()
    expect(getPipelineTransformDefinition('redact')).toBeUndefined()
  })
})
