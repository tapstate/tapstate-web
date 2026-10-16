import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import {
  connectorSpecConnectionSchema,
  connectorSpecConfigFields,
  connectorSpecInitialValues,
  normalizeConnectorConfigFields,
  normalizeConnectorConfigValues,
} from './connector-spec-formily-schema'
import { buildSourceConfig } from './source-form'

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

  it('omits MongoDB URI presentation fields and their defaults', () => {
    const mongoSpec = JSON.stringify({
      configOptions: {
        connection: {
          type: 'object',
          required: ['uri', 'isUrlTips1', 'uriTips'],
          properties: {
            uri: { type: 'string', 'x-component': 'Input' },
            isUrlTips1: { type: 'boolean', default: true, 'x-component': 'Switch' },
            isUrlTips2: { type: 'boolean', default: true, 'x-component': 'Switch' },
            uriTips: { type: 'string', default: 'tip', 'x-component': 'Input' },
          },
        },
      },
    })

    const mongoSchema = connectorSpecConnectionSchema(mongoSpec, 'en', 'mongodb')

    expect(mongoSchema).toMatchObject({
      required: ['uri'],
      properties: { uri: { type: 'string' } },
    })
    expect(mongoSchema.properties).not.toHaveProperty('isUrlTips1')
    expect(mongoSchema.properties).not.toHaveProperty('isUrlTips2')
    expect(mongoSchema.properties).not.toHaveProperty('uriTips')
    expect(connectorSpecConnectionSchema(mongoSpec, 'en', 'mysql')).toMatchObject({
      properties: { isUrlTips1: { type: 'boolean' }, isUrlTips2: { type: 'boolean' } },
    })
    expect(connectorSpecInitialValues(mongoSpec, 'mongodb')).toEqual({})
  })

  it('uses defaults declared in the raw spec and rejects malformed source text', () => {
    expect(connectorSpecInitialValues(specText)).toEqual({ host: 'localhost', port: 3306 })
    expect(() => connectorSpecConnectionSchema('{', 'en')).toThrow('invalid JSON')
    expect(() =>
      connectorSpecConnectionSchema(JSON.stringify({ configOptions: {} }), 'en'),
    ).toThrow('configOptions.connection')
  })

  it('injects TLS and SSH sections only when the raw PDK tags declare them', () => {
    const taggedSpec = JSON.stringify({
      properties: { tags: ['ssl', 'ssh'] },
      configOptions: {
        connection: { type: 'object', properties: { host: { type: 'string' } } },
      },
    })
    const fields = connectorSpecConfigFields(taggedSpec, [], 'en')

    expect(fields.map((field) => field.name)).toEqual([
      'useSSL',
      'sslCa',
      'sslCAFile',
      'sslCert',
      'sslCertFile',
      'sslKey',
      'sslKeyFile',
      'sslKeyPassword',
      '__TAPDATA.useSSH',
      '__TAPDATA.sshHost',
      '__TAPDATA.sshPort',
      '__TAPDATA.sshUsername',
      '__TAPDATA.sshPassword',
    ])
    expect(fields.find((field) => field.name === 'sslKey')).toMatchObject({ secret: true })
    expect(fields.find((field) => field.name === '__TAPDATA.sshPassword')).toMatchObject({
      secret: true,
    })
    expect(connectorSpecConnectionSchema(taggedSpec, 'en').properties).toMatchObject({
      __tapstateSsl: {
        'x-component': 'ConfigSection',
        properties: {
          sslCa: {
            'x-component': 'TextFileReader',
            'x-component-props': { base64: true },
            fileNameField: 'sslCAFile',
          },
        },
      },
      __tapstateSsh: {
        properties: {
          __TAPDATA: {
            properties: {
              sshHost: { 'x-component': 'Input' },
              sshPassword: { 'x-component': 'Password' },
            },
          },
        },
      },
    })
  })

  it('does not infer TLS or SSH support from connector IDs when tags are absent', () => {
    const untaggedSpec = JSON.stringify({
      configOptions: { connection: { type: 'object', properties: { host: { type: 'string' } } } },
    })

    expect(connectorSpecConfigFields(untaggedSpec, [], 'en')).toEqual([])
    expect(connectorSpecConnectionSchema(untaggedSpec, 'en', 'mysql').properties).toEqual({
      host: { type: 'string' },
    })
  })

  it('keeps raw TextFileReader filename companions in submitted source settings', () => {
    const fileSpec = JSON.stringify({
      configOptions: {
        connection: {
          type: 'object',
          properties: {
            krb5Keytab: {
              type: 'string',
              title: 'Keytab',
              'x-component': 'TextFileReader',
              'x-component-props': { base64: true },
              fileNameField: 'krb5KeytabFile',
            },
          },
        },
      },
    })
    const catalogFields: ConnectorConfigField[] = [
      {
        name: 'krb5Keytab',
        type: 'string',
        label: 'Keytab',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: 'sslKey',
        type: 'string',
        label: 'Client private key',
        required: true,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
    ]
    const configFields = connectorSpecConfigFields(fileSpec, catalogFields)
    const fileFields = configFields.filter((field) => field.name.startsWith('krb5Keytab'))

    expect(configFields.find((field) => field.name === 'sslKey')).toMatchObject({
      required: true,
      secret: true,
    })
    expect(configFields.find((field) => field.name === 'krb5KeytabFile')).toMatchObject({
      type: 'string',
      clearable: true,
    })
    expect(
      buildSourceConfig(fileFields, {
        krb5Keytab: 'a2V5dGFi',
        krb5KeytabFile: 'client.keytab',
      }),
    ).toEqual({
      config: { krb5Keytab: 'a2V5dGFi', krb5KeytabFile: 'client.keytab' },
      errors: {},
    })
  })

  it('normalizes the legacy MySQL port schema and values at the connector boundary', () => {
    const mysqlSpec = JSON.stringify({
      configOptions: {
        connection: {
          type: 'object',
          properties: {
            port: {
              type: 'string',
              default: '3306',
              'x-component': 'InputNumber',
            },
          },
        },
      },
    })
    const mysqlFields: ConnectorConfigField[] = [
      {
        name: 'port',
        type: 'string',
        label: 'Port',
        required: true,
        defaultValue: '3306',
        secret: false,
        options: [],
        visibleWhen: null,
      },
    ]

    expect(connectorSpecConnectionSchema(mysqlSpec, 'en', 'mysql')).toMatchObject({
      properties: { port: { type: 'number', default: 3306, 'x-component': 'InputNumber' } },
    })
    expect(connectorSpecInitialValues(mysqlSpec, 'mysql')).toEqual({ port: 3306 })
    expect(normalizeConnectorConfigFields('mysql', mysqlFields)[0]).toMatchObject({
      name: 'port',
      type: 'number',
    })
    expect(normalizeConnectorConfigValues('mysql', { port: '3307' })).toEqual({ port: 3307 })
    expect(normalizeConnectorConfigValues('postgres', { port: '3307' })).toEqual({ port: '3307' })
  })
})
