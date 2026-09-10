import { describe, expect, it } from 'vitest'

import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { pipelineNodeConnectors } from './pipeline-node-connectors'

const mysql: ConnectorSummary = {
  id: 'mysql',
  name: 'MySQL',
  icon: 'icons/mysql.png',
  group: 'Database',
  modes: ['read'],
  discovery: 'tables',
  sink: false,
  pushOut: false,
  origin: 'builtin',
}

const source: SourceView = {
  id: 'mysql_feynman',
  metadata: null,
  connector: 'mysql',
  config: {},
  configuredSecrets: [],
  mode: null,
  tables: null,
  srs: null,
  contentHash: 'a'.repeat(64),
}

describe('pipelineNodeConnectors', () => {
  it('maps every known Source identity to the connector icon metadata', () => {
    expect(pipelineNodeConnectors([source], [mysql])).toEqual(
      new Map([
        [
          'mysql_feynman',
          {
            id: 'mysql',
            name: 'MySQL',
            icon: 'icons/mysql.png',
          },
        ],
      ]),
    )
  })

  it('leaves Sources without a catalog connector out of the icon map', () => {
    expect(pipelineNodeConnectors([{ ...source, connector: 'unavailable' }], [mysql])).toEqual(
      new Map(),
    )
  })
})
