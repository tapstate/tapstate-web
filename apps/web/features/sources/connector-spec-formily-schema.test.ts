import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
} from './connector-spec-formily-schema'

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
    name: 'password',
    type: 'string',
    label: 'Password',
    required: false,
    defaultValue: null,
    secret: true,
    options: [],
    visibleWhen: null,
  },
]

const specText = JSON.stringify({
  configOptions: {
    connection: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          title: '${host}',
          default: 'localhost',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
        password: {
          type: 'string',
          title: '${password}',
          'x-decorator': 'FormItem',
          'x-component': 'Password',
        },
        advanced: {
          type: 'void',
          properties: {
            port: {
              type: 'number',
              default: 3306,
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
            },
          },
        },
      },
    },
  },
})

describe('connector spec Formily schema', () => {
  it('parses configOptions.connection and preserves the declared form structure', () => {
    const schema = connectorSpecConnectionSchema(specText, fields)

    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        host: { title: '${host}', 'x-component': 'TextInput' },
        password: { 'x-component': 'SecretInput' },
        advanced: { properties: { port: { 'x-component': 'NumberInput' } } },
      },
    })
  })

  it('uses defaults declared in the raw spec and rejects malformed source text', () => {
    expect(connectorSpecInitialValues(specText)).toEqual({ host: 'localhost', port: 3306 })
    expect(() => connectorSpecConnectionSchema('{', fields)).toThrow('invalid JSON')
    expect(() =>
      connectorSpecConnectionSchema(JSON.stringify({ configOptions: {} }), fields),
    ).toThrow('configOptions.connection')
  })
})
