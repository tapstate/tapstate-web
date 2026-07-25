import type { ConnectorConfigField } from '@/service/source-client'
import { describe, expect, it } from 'vitest'
import { buildSourceConfig, createInitialConfig, isFieldVisible } from './source-form'

const fields: ConnectorConfigField[] = [
  {
    name: 'host',
    type: 'string',
    label: 'Host',
    required: true,
    defaultValue: null,
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'port',
    type: 'number',
    label: 'Port',
    required: true,
    defaultValue: '5432',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'tags',
    type: 'array',
    label: 'Tags',
    required: false,
    defaultValue: '["primary"]',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'sslMode',
    type: 'string',
    label: 'SSL Mode',
    required: true,
    defaultValue: null,
    secret: false,
    options: [],
    visibleWhen: { controllingField: 'host', equalsAnyOf: ['db.local'] },
  },
]

describe('source form helpers', () => {
  it('creates typed initial values from connector fields', () => {
    expect(createInitialConfig(fields)).toEqual({
      host: undefined,
      port: 5432,
      tags: ['primary'],
      sslMode: undefined,
    })
  })

  it('honors visibility rules and validates visible required fields', () => {
    const state = { host: 'db.local', port: 'not-a-number', tags: '["a"]' }

    expect(isFieldVisible(fields[3], state)).toBe(true)
    expect(buildSourceConfig(fields, state)).toEqual({
      config: {
        host: 'db.local',
        tags: ['a'],
      },
      errors: {
        port: 'number',
        sslMode: 'required',
      },
    })
  })
})
