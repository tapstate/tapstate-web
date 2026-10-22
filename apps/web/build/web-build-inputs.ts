import { validateCloudConsoleUrl } from '../utils/cloud-console-url'
import { isCloudDeploymentMode } from '../utils/deployment-mode'

export interface WebBuildInputs {
  schemaVersion: 1
  profile: 'op' | 'cloud'
  purpose: 'release' | 'local-development'
  cloudConsoleUrl?: string
}

/** A producer-owned marker accompanies the exact profile and URL baked into the bundle. */
export function getWebBuildInputs(
  mode: string,
  environment: Record<string, string | undefined>,
): WebBuildInputs {
  const flag = environment.TAPSTATE_LOCAL_DEVELOPMENT
  if (flag !== undefined && flag !== 'true' && flag !== 'false') {
    throw new Error('TAPSTATE_LOCAL_DEVELOPMENT must be explicitly true or false')
  }
  const localDevelopment = flag === 'true'
  const profile = isCloudDeploymentMode(mode) ? 'cloud' : 'op'
  return {
    schemaVersion: 1,
    profile,
    purpose: localDevelopment ? 'local-development' : 'release',
    ...(profile === 'cloud'
      ? {
          cloudConsoleUrl: validateCloudConsoleUrl(
            environment.VITE_CLOUD_CONSOLE_URL,
            localDevelopment,
          ),
        }
      : {}),
  }
}
