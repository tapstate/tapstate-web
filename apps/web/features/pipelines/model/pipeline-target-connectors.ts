import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { hasStoreMarker } from '@/service/state-store-source'

import type { DeploymentProfile } from './deployment-profile'

export type SourceIdentity = Pick<SourceView, 'id' | 'connector'> &
  Partial<Pick<SourceView, 'metadata'>>

/** Profile policy narrows cloud to Atlas; OP exposes only sources whose catalog declares sink support. */
export function isTargetConnector(
  connector: string | null | undefined,
  deploymentProfile: DeploymentProfile,
  connectors: readonly ConnectorSummary[],
) {
  if (deploymentProfile === 'cloud') return connector === 'mongodb-atlas'
  return connectors.find((item) => item.id === connector)?.sink === true
}

export function targetSources<T extends SourceIdentity>(
  sources: readonly T[],
  connectors: readonly ConnectorSummary[],
  deploymentProfile: DeploymentProfile,
) {
  return sources.filter(
    (source) =>
      isTargetConnector(source.connector, deploymentProfile, connectors) &&
      (deploymentProfile !== 'cloud' || hasStoreMarker({ metadata: source.metadata ?? null })),
  )
}
