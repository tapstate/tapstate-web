const PREVIEW_CLOUD_CONSOLE_URL = 'https://dev.cloud.tapstate.com/'

export function getCloudConsoleUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_CLOUD_CONSOLE_URL,
): string {
  const url = new URL(configuredUrl?.trim() || PREVIEW_CLOUD_CONSOLE_URL)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('VITE_CLOUD_CONSOLE_URL must be an HTTPS URL without credentials or a fragment')
  }
  return url.toString()
}

export const cloudConsoleUrl = getCloudConsoleUrl()

export function replaceWithCloudConsole(url: string = cloudConsoleUrl) {
  window.location.replace(url)
}
