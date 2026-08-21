import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import {
  connectorFormKey,
  connectorFieldsToFormilySchema,
  formilyValuesToSourceConfig,
} from './connector-formily-schema'

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
    name: 'ssl',
    type: 'boolean',
    label: 'TLS',
    required: false,
    defaultValue: 'true',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'schemas',
    type: 'array',
    label: 'Schemas',
    required: false,
    defaultValue: '["public"]',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'database',
    type: 'string',
    label: 'Database',
    required: true,
    defaultValue: null,
    secret: false,
    options: [],
    visibleWhen: { controllingField: 'host', equalsAnyOf: ['db.local'] },
  },
  {
    name: 'password',
    type: 'string',
    label: 'Password',
    required: false,
    defaultValue: null,
    secret: true,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'mode',
    type: 'string',
    label: 'Mode',
    required: false,
    defaultValue: null,
    secret: false,
    options: [
      { value: '', label: 'Default' },
      { value: 'strict', label: 'Strict' },
    ],
    visibleWhen: null,
  },
]

describe('connector Formily adapter', () => {
  it('maps connector catalog fields to a typed Formily schema', () => {
    const schema = connectorFieldsToFormilySchema(fields)

    expect(schema.type).toBe('object')
    expect(schema.required).toEqual(['host', 'port', 'database'])
    expect(schema.properties?.port).toMatchObject({
      type: 'number',
      title: 'Port',
      default: 5432,
      'x-component': 'NumberPicker',
    })
    expect(schema.properties?.ssl).toMatchObject({
      type: 'boolean',
      default: true,
      'x-component': 'Switch',
    })
    expect(schema.properties?.mode).toMatchObject({
      'x-component': 'Select',
      enum: [
        { label: 'Default', value: '' },
        { label: 'Strict', value: 'strict' },
      ],
    })
  })

  it('preserves visibility and secret semantics in schema metadata', () => {
    const schema = connectorFieldsToFormilySchema(fields)

    expect(schema.properties?.database?.['x-reactions']).toEqual({
      dependencies: ['host'],
      fulfill: {
        state: {
          visible: '{{$deps[0] === "db.local"}}',
        },
      },
    })
    expect(schema.properties?.password).toMatchObject({
      'x-component': 'Password',
      'x-value-change': 'replace',
    })
  })

  it('keeps every visibleWhen value in the Formily reaction', () => {
    const schema = connectorFieldsToFormilySchema([
      {
        ...fields[4],
        visibleWhen: { controllingField: 'host', equalsAnyOf: ['db.local', 'db.staging'] },
      },
    ])

    expect(schema.properties?.database?.['x-reactions']).toEqual({
      dependencies: ['host'],
      fulfill: {
        state: {
          visible: '{{$deps[0] === "db.local" || $deps[0] === "db.staging"}}',
        },
      },
    })
  })

  it('changes the Formily lifecycle key when a source is refreshed', () => {
    expect(connectorFormKey(fields, 'source-a:etag-1')).not.toBe(
      connectorFormKey(fields, 'source-a:etag-2'),
    )
    expect(connectorFormKey(fields, 'source-a:etag-1')).toBe(
      connectorFormKey(fields, 'source-a:etag-1'),
    )
  })

  it('normalizes Formily values into the typed source config payload', () => {
    expect(
      formilyValuesToSourceConfig(fields, {
        host: 'db.local',
        port: '5433',
        ssl: false,
        schemas: '["app", "audit"]',
        database: 'events',
        password: 'secret-value',
        mode: 'strict',
      }),
    ).toEqual({
      config: {
        host: 'db.local',
        port: 5433,
        ssl: false,
        schemas: ['app', 'audit'],
        database: 'events',
        password: 'secret-value',
        mode: 'strict',
      },
      errors: {},
    })
  })
})
