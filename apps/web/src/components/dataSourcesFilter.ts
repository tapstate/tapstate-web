export type SourceConnectionStatus = 'connected' | 'error'
export type SourceConnectionStatusFilter = 'all' | SourceConnectionStatus

export interface SourceFilterable {
  name: string
  type: string
  status: SourceConnectionStatus
  host: string
}

export function sourceMatchesConnectionStatus(
  source: Pick<SourceFilterable, 'status'>,
  statusFilter: SourceConnectionStatusFilter,
) {
  return statusFilter === 'all' || source.status === statusFilter
}

export function sourceMatchesSearchText(
  source: Pick<SourceFilterable, 'host' | 'name' | 'type'>,
  searchText: string,
) {
  const query = searchText.trim().toLowerCase()

  if (!query)
    return true

  return source.name.toLowerCase().includes(query)
    || source.type.toLowerCase().includes(query)
    || source.host.toLowerCase().includes(query)
}

export function filterSourcesBySearchAndStatus<T extends SourceFilterable>(
  sources: readonly T[],
  searchText: string,
  statusFilter: SourceConnectionStatusFilter,
) {
  return sources.filter(source =>
    sourceMatchesConnectionStatus(source, statusFilter)
    && sourceMatchesSearchText(source, searchText),
  )
}
