import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { hasStoreMarker } from '@/service/state-store-source'

import type { DeploymentProfile } from './deployment-profile'

export interface TargetConnectorPolicy {
  profile: DeploymentProfile
  localDevelopment: boolean
}

export type SourceIdentity = Pick<SourceView, 'id' | 'connector'> &
  Partial<Pick<SourceView, 'metadata'>>

/** Release Cloud targets Atlas; local Cloud also permits catalog-confirmed MongoDB sinks. */
export function isTargetConnector(
  connector: string | null | undefined,
  connectors: readonly ConnectorSummary[],
  policy: TargetConnectorPolicy,
) {
  if (policy.profile === 'cloud') {
    if (connector === 'mongodb-atlas') return true
    if (connector !== 'mongodb' || policy.localDevelopment !== true) return false
  }
  return connectors.find((item) => item.id === connector)?.sink === true
}

export function targetSources<T extends SourceIdentity>(
  sources: readonly T[],
  connectors: readonly ConnectorSummary[],
  policy: TargetConnectorPolicy,
) {
  return sources.filter(
    (source) =>
      isTargetConnector(source.connector, connectors, policy) &&
      (policy.profile !== 'cloud' ||
        (policy.localDevelopment && source.connector === 'mongodb') ||
        hasStoreMarker({ metadata: source.metadata ?? null })),
  )
}
