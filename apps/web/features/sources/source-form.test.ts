import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import {
  buildSourceConfig,
  createInitialConfig,
  isFieldVisible,
  type FormConnectorConfigField,
} from './source-form'

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

  it('builds nested injected settings and preserves explicit file clears', () => {
    const injectedFields: FormConnectorConfigField[] = [
      {
        name: '__TAPDATA.useSSH',
        type: 'boolean',
        label: 'Use SSH tunnel',
        required: false,
        defaultValue: 'false',
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: '__TAPDATA.sshPort',
        type: 'number',
        label: 'SSH port',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: '__TAPDATA.sshPassword',
        type: 'string',
        label: 'SSH password',
        required: false,
        defaultValue: null,
        secret: true,
        options: [],
        visibleWhen: null,
      },
      {
        name: 'sslCa',
        type: 'string',
        label: 'CA certificate',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
        clearable: true,
      },
    ]

    expect(createInitialConfig(injectedFields)).toEqual({
      __TAPDATA: { useSSH: false, sshPort: undefined, sshPassword: undefined },
      sslCa: undefined,
    })
    expect(
      buildSourceConfig(injectedFields, {
        __TAPDATA: { useSSH: true, sshPort: '2222', sshPassword: 'secret' },
        sslCa: null,
      }),
    ).toEqual({
      config: {
        __TAPDATA: { useSSH: true, sshPort: 2222, sshPassword: 'secret' },
        sslCa: null,
      },
      errors: {},
    })
  })

  it('omits a secret field when a newly selected file is removed', () => {
    const secretFile: FormConnectorConfigField = {
      name: 'sslKey',
      type: 'string',
      label: 'Client key',
      required: false,
      defaultValue: null,
      secret: true,
      options: [],
      visibleWhen: null,
      clearable: true,
    }

    expect(buildSourceConfig([secretFile], { sslKey: null })).toEqual({ config: {}, errors: {} })
  })
})
