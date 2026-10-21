import { PREVIEW_CLOUD_CONSOLE_URL, validateCloudConsoleUrl } from './cloud-console-url'

const PRODUCTION_CLOUD_CONSOLE_URL = 'https://cloud.tapstate.com/'

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
  hostname: string = typeof window === 'undefined' ? '' : window.location.hostname,
  localDevelopment: boolean = import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true',
): string {
  const selectedUrl = localDevelopment
    ? configuredUrl
    : getCloudConsoleUrlForHostname(hostname) || configuredUrl || PREVIEW_CLOUD_CONSOLE_URL
  return validateCloudConsoleUrl(selectedUrl, localDevelopment)
}

export const cloudConsoleUrl = getCloudConsoleUrl()

export function replaceWithCloudConsole(url: string = cloudConsoleUrl) {
  window.location.replace(url)
}
