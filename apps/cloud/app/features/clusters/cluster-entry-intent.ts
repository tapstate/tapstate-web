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

const OAUTH_ENTRY_KEY = 'tapstate.cluster-entry.oauth.v1'
const OAUTH_ENTRY_MAX_AGE_MS = 10 * 60 * 1000

/** Retains navigation hints in this tab only; no code, credential, origin or authority is stored. */
export function rememberOAuthClusterEntry(search: ClusterEntrySearch) {
  const target = clusterEntrySearch({ ...search })
  if (!target.organizationId || !target.enterClusterId) {
    try {
      window.sessionStorage.removeItem(OAUTH_ENTRY_KEY)
    } catch {
      /* No target needs retention. */
    }
    return
  }
  try {
    window.sessionStorage.removeItem(OAUTH_ENTRY_KEY)
    window.sessionStorage.setItem(
      OAUTH_ENTRY_KEY,
      JSON.stringify({ version: 1, target, createdAt: Date.now() }),
    )
  } catch {
    // Authentication remains available when the browser blocks tab storage.
  }
}

/** A callback consumes its hint once; cancellation and unrelated sign-ins discard it. */
export function consumeOAuthClusterEntry(outcome?: string): ClusterEntrySearch {
  let encoded: string | null
  try {
    encoded = window.sessionStorage.getItem(OAUTH_ENTRY_KEY)
    window.sessionStorage.removeItem(OAUTH_ENTRY_KEY)
  } catch {
    return {}
  }
  if (outcome !== 'success' || !encoded || encoded.length > 512) return {}
  try {
    const value: unknown = JSON.parse(encoded)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const record = value as Record<string, unknown>
    if (
      Object.keys(record).sort().join(',') !== 'createdAt,target,version' ||
      record.version !== 1 ||
      typeof record.createdAt !== 'number' ||
      !Number.isFinite(record.createdAt) ||
      Date.now() < record.createdAt ||
      Date.now() - record.createdAt > OAUTH_ENTRY_MAX_AGE_MS ||
      !record.target ||
      typeof record.target !== 'object' ||
      Array.isArray(record.target)
    )
      return {}
    const target = clusterEntrySearch(record.target as Record<string, unknown>)
    return target.organizationId && target.enterClusterId ? target : {}
  } catch {
    return {}
  }
}
