import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { hasStoreMarker } from '@/service/state-store-source'

import type { DeploymentProfile } from './deployment-profile'

export type SourceIdentity = Pick<SourceView, 'id' | 'connector'> &
  Partial<Pick<SourceView, 'metadata'>>

/** Release Cloud targets Atlas; local Cloud also permits catalog-confirmed MongoDB sinks. */
export function isTargetConnector(
  connector: string | null | undefined,
  deploymentProfile: DeploymentProfile,
  connectors: readonly ConnectorSummary[],
  localDevelopment: boolean = import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true',
) {
  if (deploymentProfile === 'cloud') {
    if (connector === 'mongodb-atlas') return true
    if (connector !== 'mongodb' || localDevelopment !== true) return false
  }
  return connectors.find((item) => item.id === connector)?.sink === true
}

export function targetSources<T extends SourceIdentity>(
  sources: readonly T[],
  connectors: readonly ConnectorSummary[],
  deploymentProfile: DeploymentProfile,
  localDevelopment: boolean = import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true',
) {
  return sources.filter(
    (source) =>
      isTargetConnector(source.connector, deploymentProfile, connectors, localDevelopment) &&
      (deploymentProfile !== 'cloud' ||
        (localDevelopment && source.connector === 'mongodb') ||
        hasStoreMarker({ metadata: source.metadata ?? null })),
  )
}
