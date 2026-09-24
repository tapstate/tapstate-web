import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

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

  it('keeps configured required secrets write-only while accepting replacements', () => {
    const secretFields: ConnectorConfigField[] = [
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
        name: 'password',
        type: 'string',
        label: 'Password',
        required: true,
        defaultValue: null,
        secret: true,
        options: [],
        visibleWhen: null,
      },
    ]

    expect(buildSourceConfig(secretFields, { host: 'db.local' }, ['password'])).toEqual({
      config: { host: 'db.local' },
      errors: {},
    })
    expect(
      buildSourceConfig(secretFields, { host: 'db.local', password: 'replacement' }, []),
    ).toEqual({
      config: { host: 'db.local', password: 'replacement' },
      errors: {},
    })
  })

  it('submits only the selected Atlas connection method', () => {
    const atlasFields: ConnectorConfigField[] = [
      { ...fields[0], name: 'isUri', type: 'boolean', defaultValue: 'true' },
      {
        ...fields[0],
        name: 'uri',
        visibleWhen: { controllingField: 'isUri', equalsAnyOf: ['true'] },
      },
      {
        ...fields[0],
        name: 'host',
        visibleWhen: { controllingField: 'isUri', equalsAnyOf: ['false'] },
      },
      {
        ...fields[0],
        name: 'database',
        visibleWhen: { controllingField: 'isUri', equalsAnyOf: ['false'] },
      },
      {
        ...fields[0],
        name: 'password',
        required: false,
        secret: true,
        visibleWhen: { controllingField: 'isUri', equalsAnyOf: ['false'] },
      },
    ]
    const state = {
      isUri: false,
      uri: 'mongodb+srv://unused.invalid/app',
      host: 'mongo-a.example.net:27017,mongo-b.example.net:27017',
      database: 'app',
      password: 'test-only-secret',
    }

    expect(buildSourceConfig(atlasFields, state)).toEqual({
      config: {
        isUri: false,
        host: state.host,
        database: 'app',
        password: 'test-only-secret',
      },
      errors: {},
    })
    expect(buildSourceConfig(atlasFields, { ...state, isUri: true })).toEqual({
      config: { isUri: true, uri: state.uri },
      errors: {},
    })
  })
})
