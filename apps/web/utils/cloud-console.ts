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
  hostname: string = typeof window === 'undefined' ? '' : window.location.hostname,
): string {
  const inferredUrl = getCloudConsoleUrlForHostname(hostname)
  const url = new URL(inferredUrl || configuredUrl?.trim() || PREVIEW_CLOUD_CONSOLE_URL)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('VITE_CLOUD_CONSOLE_URL must be an HTTPS URL without credentials or a fragment')
  }
  return url.toString()
}

export const cloudConsoleUrl = getCloudConsoleUrl()

export function replaceWithCloudConsole(url: string = cloudConsoleUrl) {
  window.location.replace(url)
}
