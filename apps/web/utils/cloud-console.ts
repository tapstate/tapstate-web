import { validateCloudConsoleUrl } from './cloud-console-url'

const PRODUCTION_CLOUD_CONSOLE_URL = 'https://cloud.tapstate.com/'
const PREVIEW_CLOUD_CONSOLE_URL = 'https://dev.cloud.tapstate.com/'

function getCloudConsoleUrlForHostname(hostname: string): string | undefined {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '')

  if (
    normalizedHostname === 'dev.cloud.tapstate.com' ||
    normalizedHostname.endsWith('.dev.cloud.tapstate.com')
  ) {
    return PREVIEW_CLOUD_CONSOLE_URL
  }

  if (
    normalizedHostname === 'cloud.tapstate.com' ||
    normalizedHostname.endsWith('.cloud.tapstate.com')
  ) {
    return PRODUCTION_CLOUD_CONSOLE_URL
  }

  return undefined
}

export function getCloudConsoleUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_CLOUD_CONSOLE_URL,
  hostnameOrLocalDevelopment: string | boolean =
    typeof window === 'undefined' ? '' : window.location.hostname,
): string {
  const localDevelopment =
    typeof hostnameOrLocalDevelopment === 'boolean'
      ? hostnameOrLocalDevelopment
      : import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true'
  const hostname =
    typeof hostnameOrLocalDevelopment === 'string'
      ? hostnameOrLocalDevelopment
      : typeof window === 'undefined'
        ? ''
        : window.location.hostname
  const inferredUrl = localDevelopment ? undefined : getCloudConsoleUrlForHostname(hostname)
  return validateCloudConsoleUrl(inferredUrl || configuredUrl, localDevelopment)
}

export const cloudConsoleUrl = getCloudConsoleUrl()

export function replaceWithCloudConsole(url: string = cloudConsoleUrl) {
  window.location.replace(url)
}
