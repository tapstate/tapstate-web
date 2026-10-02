export type DeploymentProfile = 'cloud' | 'on-prem'

/** The Vite `cloud` mode enables Cloud-only behavior; all other modes use the on-prem profile. */
export function getDeploymentProfile(
  mode: string | undefined = import.meta.env.MODE,
): DeploymentProfile {
  return mode?.trim().toLowerCase() === 'cloud' ? 'cloud' : 'on-prem'
}

export const deploymentProfile = getDeploymentProfile()
