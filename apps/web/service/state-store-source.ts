import type { DeploymentProfile } from '@/utils/deployment-profile'

import { MANAGED_VIEW_STORE_SOURCE_ID, type SourceView } from './source-client'

export function hasStoreMarker(source: SourceView): boolean {
  const labels = source.metadata?.labels
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) return false
  return labels.store === 'true' || labels.store === true
}

/** The managed on-prem source is legacy; Cloud only accepts a marked Atlas source. */
export function stateStoreSource(
  sources: readonly SourceView[],
  profile: DeploymentProfile,
): SourceView | null {
  return (
    sources.find((source) =>
      profile === 'cloud'
        ? source.connector === 'mongodb-atlas' && hasStoreMarker(source)
        : source.id === MANAGED_VIEW_STORE_SOURCE_ID,
    ) ?? null
  )
}

export function isDataSource(source: SourceView): boolean {
  return source.id !== MANAGED_VIEW_STORE_SOURCE_ID && !hasStoreMarker(source)
}
