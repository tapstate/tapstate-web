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
