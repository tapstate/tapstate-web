import type { ConnectorSummary, SourceView } from '@/service/source-client'

import type { DeploymentProfile } from './deployment-profile'

export type SourceIdentity = Pick<SourceView, 'id' | 'connector'>

/** Cloud accepts MongoDB and Atlas; source-only previews never become targets in either profile. */
export function isTargetConnector(
  connector: string | null | undefined,
  deploymentProfile: DeploymentProfile,
  connectors: readonly ConnectorSummary[],
) {
  if (connector === 'aws-rds-mysql' || connector === 'db2') return false
  if (deploymentProfile === 'cloud') {
    return connector === 'mongodb' || connector === 'mongodb-atlas'
  }
  return connectors.find((item) => item.id === connector)?.sink === true
}

export function targetSources<T extends SourceIdentity>(
  sources: readonly T[],
  connectors: readonly ConnectorSummary[],
  deploymentProfile: DeploymentProfile,
) {
  return sources.filter((source) =>
    isTargetConnector(source.connector, deploymentProfile, connectors),
  )
}
