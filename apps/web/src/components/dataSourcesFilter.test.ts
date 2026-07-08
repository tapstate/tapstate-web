import type { SourceConnectionStatusFilter } from './dataSourcesFilter'
import {
  filterSourcesBySearchAndStatus,
  sourceMatchesConnectionStatus,
} from './dataSourcesFilter'

interface TestSource {
  id: string
  name: string
  type: string
  status: 'connected' | 'error'
  host: string
}

const sources: TestSource[] = [
  { id: 'prod', name: 'production_db', type: 'postgres', status: 'connected', host: 'db.prod.internal' },
  { id: 'events', name: 'analytics_events', type: 'kafka', status: 'connected', host: 'kafka.prod.internal' },
  { id: 'legacy', name: 'legacy_mongodb', type: 'mongodb', status: 'error', host: 'mongo-cluster-old' },
]

function assertIds(actual: TestSource[], expected: string[], message: string) {
  const actualIds = actual.map(source => source.id)
  if (actualIds.join('|') !== expected.join('|')) {
    throw new Error(`${message}: expected ${expected.join(', ')}; received ${actualIds.join(', ')}`)
  }
}

assertIds(
  filterSourcesBySearchAndStatus(sources, '', 'all'),
  ['prod', 'events', 'legacy'],
  'all status filter returns every source',
)

assertIds(
  filterSourcesBySearchAndStatus(sources, '', 'connected'),
  ['prod', 'events'],
  'connected status filter only returns connected sources',
)

assertIds(
  filterSourcesBySearchAndStatus(sources, '', 'error'),
  ['legacy'],
  'error status filter only returns error sources',
)

assertIds(
  filterSourcesBySearchAndStatus(sources, 'production', 'connected'),
  ['prod'],
  'search text and status filter are combined',
)

assertIds(
  filterSourcesBySearchAndStatus(sources, 'mongo', 'connected'),
  [],
  'search text cannot include sources excluded by status',
)

const allStatuses: SourceConnectionStatusFilter = 'all'

if (!sourceMatchesConnectionStatus(sources[0], allStatuses)) {
  throw new Error('all status filter must match a connected source')
}

if (sourceMatchesConnectionStatus(sources[0], 'error')) {
  throw new Error('error status filter must not match a connected source')
}
