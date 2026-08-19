import { describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import { buildSourceEditConfig, serializeSourceSrs } from './source-edit-dialog'

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
