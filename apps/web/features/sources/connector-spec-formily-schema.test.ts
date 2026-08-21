import { describe, expect, it } from 'vitest'

import {
  connectorSpecConnectionSchema,
  connectorSpecInitialValues,
} from './connector-spec-formily-schema'

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

const localizedSpecText = JSON.stringify({
  messages: {
    zh_CN: {
      host: '主机地址',
      hostTooltip: '填写数据库主机',
      hostDescription: '请输入可访问的数据库地址',
      connectionPrefix: '连接到',
      connectionSuffix: '数据库',
    },
    zh_TW: {
      host: '主機位址',
      hostTooltip: '填寫資料庫主機',
      hostDescription: '請輸入可存取的資料庫位址',
      connectionPrefix: '連線至',
      connectionSuffix: '資料庫',
    },
    en_US: {
      host: 'Host address',
      hostTooltip: 'Enter the database host',
      hostDescription: 'Enter a reachable database address',
      connectionPrefix: 'Connect to',
      connectionSuffix: 'database',
    },
  },
  configOptions: {
    connection: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          title: '${host}',
          tooltip: '${hostTooltip}',
          description: '${hostDescription}',
          'x-component-props': {
            placeholder: '${connectionPrefix} ${host}',
            help: ['${hostDescription}', '${missing}'],
          },
          enum: [{ label: '${host}', value: 'host' }],
          'x-component': 'Input',
        },
        database: {
          type: 'string',
          title: '${connectionPrefix} ${host} ${connectionSuffix}',
          'x-component': 'Input',
        },
        unresolved: {
          type: 'string',
          title: '${missing}',
          'x-component': 'Password',
        },
        advanced: {
          type: 'void',
          properties: {
            port: {
              type: 'number',
              title: '${port}',
              'x-component': 'NumberPicker',
            },
          },
        },
      },
    },
  },
})

describe('connector spec Formily schema', () => {
  it('parses configOptions.connection and preserves the declared form structure', () => {
    const schema = connectorSpecConnectionSchema(specText, 'en')

    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        host: { title: '${host}', 'x-component': 'Input' },
        password: { 'x-component': 'Password' },
        advanced: { properties: { port: { 'x-component': 'InputNumber' } } },
      },
    })
  })

  it('resolves templates in every string schema value for the current locale', () => {
    const schema = connectorSpecConnectionSchema(localizedSpecText, 'zh-CN')

    expect(schema).toMatchObject({
      properties: {
        host: {
          title: '主机地址',
          tooltip: '填写数据库主机',
          description: '请输入可访问的数据库地址',
          'x-component-props': {
            placeholder: '连接到 主机地址',
            help: ['请输入可访问的数据库地址', '${missing}'],
          },
          enum: [{ label: '主机地址', value: 'host' }],
        },
        database: { title: '连接到 主机地址 数据库' },
        unresolved: { title: '${missing}', 'x-component': 'Password' },
        advanced: { properties: { port: { title: '${port}', 'x-component': 'NumberPicker' } } },
      },
    })
  })

  it.each([
    ['en', 'Host address'],
    ['zh-TW', '主機位址'],
  ])('uses %s messages when resolving a schema', (locale, expectedTitle) => {
    const schema = connectorSpecConnectionSchema(localizedSpecText, locale)

    expect(schema).toMatchObject({ properties: { host: { title: expectedTitle } } })
  })

  it('uses defaults declared in the raw spec and rejects malformed source text', () => {
    expect(connectorSpecInitialValues(specText)).toEqual({ host: 'localhost', port: 3306 })
    expect(() => connectorSpecConnectionSchema('{', 'en')).toThrow('invalid JSON')
    expect(() =>
      connectorSpecConnectionSchema(JSON.stringify({ configOptions: {} }), 'en'),
    ).toThrow('configOptions.connection')
  })
})
