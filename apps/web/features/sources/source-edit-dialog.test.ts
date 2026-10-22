import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import { connectorSpecConfigFields } from './connector-spec-formily-schema'
import {
  buildSourceTestSettings,
  buildSourceEditConfig,
  retainedSecretNames,
  serializeSourceSrs,
} from './source-edit-dialog'

describe('SourceEditDialog source payload helpers', () => {
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
      required: true,
      defaultValue: null,
      secret: true,
      options: [],
      visibleWhen: null,
    },
  ]

  it('keeps configured secrets omitted and includes replacement secrets in validation', () => {
    expect(
      buildSourceEditConfig(
        fields,
        { host: 'db.local' },
        {
          password: { action: 'keep', value: '' },
        },
      ),
    ).toEqual({
      config: { host: 'db.local' },
      clearSecrets: [],
      errors: {},
    })
    expect(
      buildSourceEditConfig(
        fields,
        { host: 'db.local' },
        {
          password: { action: 'replace', value: 'replacement' },
        },
      ),
    ).toEqual({
      config: { host: 'db.local', password: 'replacement' },
      clearSecrets: [],
      errors: {},
    })
  })

  it('identifies only write-only secrets that must be re-entered before testing', () => {
    expect(
      retainedSecretNames({
        password: { action: 'keep', value: '' },
        apiToken: { action: 'replace', value: 'replacement' },
        tlsKey: { action: 'clear', value: '' },
      }),
    ).toEqual(['password'])
  })

  it('retains existing secrets for testing until a replacement or clear action changes them', () => {
    const keep = buildSourceEditConfig(
      fields,
      { host: 'db.local' },
      { password: { action: 'keep', value: '' } },
    )
    expect(buildSourceTestSettings({ host: 'db.saved', password: 'saved-secret' }, keep)).toEqual({
      host: 'db.local',
      password: 'saved-secret',
    })

    const replace = buildSourceEditConfig(
      fields,
      { host: 'db.local' },
      { password: { action: 'replace', value: 'new-secret' } },
    )
    expect(buildSourceTestSettings({ password: 'saved-secret' }, replace)).toEqual({
      password: 'new-secret',
      host: 'db.local',
    })

    const clear = buildSourceEditConfig(
      fields,
      { host: 'db.local' },
      { password: { action: 'clear', value: '' } },
    )
    expect(buildSourceTestSettings({ password: 'saved-secret' }, clear)).toEqual({
      password: null,
      host: 'db.local',
    })
  })

  it('replaces and clears nested SSH secrets without dropping sibling tunnel settings', () => {
    const sshFields: ConnectorConfigField[] = [
      {
        name: '__TAPDATA.sshHost',
        type: 'string',
        label: 'SSH host',
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
    ]
    const replacement = buildSourceEditConfig(
      sshFields,
      { __TAPDATA: { sshHost: 'bastion.example' } },
      { '__TAPDATA.sshPassword': { action: 'replace', value: 'new-secret' } },
    )

    expect(replacement).toEqual({
      config: { __TAPDATA: { sshHost: 'bastion.example', sshPassword: 'new-secret' } },
      clearSecrets: [],
      errors: {},
    })
    expect(
      buildSourceTestSettings(
        { __TAPDATA: { sshHost: 'old-bastion', sshPort: 22, sshPassword: 'old-secret' } },
        replacement,
      ),
    ).toEqual({
      __TAPDATA: { sshHost: 'bastion.example', sshPort: 22, sshPassword: 'new-secret' },
    })

    const clear = buildSourceEditConfig(
      sshFields,
      {},
      {
        '__TAPDATA.sshPassword': { action: 'clear', value: '' },
      },
    )
    expect(clear.clearSecrets).toEqual(['__TAPDATA.sshPassword'])
    expect(
      buildSourceTestSettings(
        { __TAPDATA: { sshHost: 'bastion.example', sshPassword: 'old-secret' } },
        clear,
      ),
    ).toEqual({ __TAPDATA: { sshHost: 'bastion.example', sshPassword: null } })
  })

  it('clears raw TextFileReader content and filename in edit and test settings', () => {
    const rawSpec = JSON.stringify({
      configOptions: {
        connection: {
          type: 'object',
          properties: {
            notes: {
              type: 'string',
              'x-component': 'TextFileReader',
              fileNameField: 'notesFile',
            },
          },
        },
      },
    })
    const rawFields: ConnectorConfigField[] = [
      {
        name: 'notes',
        type: 'string',
        label: 'Notes file',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: 'notesFile',
        type: 'string',
        label: 'Notes file name',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
    ]
    const fields = connectorSpecConfigFields(rawSpec, rawFields)
    const cleared = buildSourceEditConfig(fields, { notes: null, notesFile: null }, {})

    expect(fields.find((field) => field.name === 'notes')).toMatchObject({ clearable: true })
    expect(fields.find((field) => field.name === 'notesFile')).toMatchObject({ clearable: true })
    expect(cleared.config).toEqual({ notes: null, notesFile: null })
    expect(
      buildSourceTestSettings({ notes: 'saved-content', notesFile: 'saved.txt' }, cleared),
    ).toEqual({ notes: null, notesFile: null })
  })

  it('omits an untouched empty SRS from an unrelated edit', () => {
    expect(
      serializeSourceSrs({
        key: '',
        retention: '',
        schemaEvolution: '',
        queryable: false,
        enabled: false,
      }),
    ).toBeNull()
  })

  it('omits empty optional SRS strings while retaining meaningful fields', () => {
    expect(
      serializeSourceSrs({
        key: 'orders',
        retention: '',
        schemaEvolution: 'AUTO',
        queryable: true,
        enabled: false,
      }),
    ).toEqual({
      key: 'orders',
      schemaEvolution: 'AUTO',
      queryable: true,
      enabled: false,
    })
  })
})
