import type { DeploymentProfile } from '@/utils/deployment-profile'

import type { SourceView } from './source-client'

export function hasStoreMarker(source: Pick<SourceView, 'metadata'>): boolean {
  const labels = source.metadata?.labels
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) return false
  return labels.store === 'true' || labels.store === true
}

/** The server removes user labels and projects this marker from the authoritative binding. */
export function stateStoreSource(
  sources: readonly SourceView[],
  _profile: DeploymentProfile,
): SourceView | null {
  return sources.find(hasStoreMarker) ?? null
}

export function isDataSource(source: SourceView): boolean {
  return !hasStoreMarker(source)
}

/** Display only the database component; connection credentials and URI options never reach this label. */
export function stateStoreDatabase(source: Pick<SourceView, 'config'>): string | null {
  if (typeof source.config.database === 'string' && source.config.database.trim())
    return source.config.database
  if (typeof source.config.uri !== 'string') return null
  const path = /^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^/?#]+)(?:[?#].*)?$/i.exec(source.config.uri)?.[1]
  if (!path) return null
  try {
    const database = decodeURIComponent(path)
    return /[\s.$/\\]/.test(database) || database.includes(String.fromCharCode(0)) ? null : database
  } catch {
    return null
  }
}
