import { isCloudDeploymentMode } from './deployment-mode'

export type DeploymentProfile = 'cloud' | 'on-prem'

/** The Vite `cloud` mode enables Cloud-only behavior; all other modes use the on-prem profile. */
export function getDeploymentProfile(
  mode: string | undefined = import.meta.env.MODE,
): DeploymentProfile {
  return isCloudDeploymentMode(mode) ? 'cloud' : 'on-prem'
}

export const deploymentProfile = getDeploymentProfile()
