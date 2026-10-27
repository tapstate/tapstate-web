export interface ClusterEntrySearch {
  organizationId?: string
  enterClusterId?: string
}

/** Navigation hints only; entry still revalidates membership, current state and the resolved origin. */
export function clusterEntrySearch(search: Record<string, unknown>): ClusterEntrySearch {
  const id = (value: unknown) =>
    typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : undefined
  const organizationId = id(search.organizationId)
  const enterClusterId = organizationId ? id(search.enterClusterId) : undefined
  return { organizationId, enterClusterId }
}
