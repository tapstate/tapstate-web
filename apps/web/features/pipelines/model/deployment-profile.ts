export type DeploymentProfile = 'cloud' | 'on-prem'

type DeploymentEnvironment = ImportMetaEnv & {
  readonly VITE_TAPSTATE_DEPLOYMENT_PROFILE?: string
}

/** Cloud packages set this at build time; local and OP builds remain open by default. */
export function getDeploymentProfile(
  value: string | undefined = (import.meta.env as DeploymentEnvironment)
    .VITE_TAPSTATE_DEPLOYMENT_PROFILE,
): DeploymentProfile {
  return value?.trim().toLowerCase() === 'cloud' ? 'cloud' : 'on-prem'
}
