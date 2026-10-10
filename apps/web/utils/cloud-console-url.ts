export const PREVIEW_CLOUD_CONSOLE_URL = 'https://dev.cloud.tapstate.com/'

/** HTTP is confined to an explicit development artifact and a literal localhost origin. */
export function validateCloudConsoleUrl(
  configuredUrl: string | undefined,
  localDevelopment = false,
): string {
  if (localDevelopment) {
    const match = /^http:\/\/localhost:([1-9][0-9]{0,4})\/?$/.exec(configuredUrl?.trim() ?? '')
    if (!match || Number(match[1]) > 65535) {
      throw new Error(
        'Local Cloud Console requires an explicit localhost HTTP origin and valid port',
      )
    }
    return `http://localhost:${match[1]}/`
  }
  const url = new URL(configuredUrl?.trim() || PREVIEW_CLOUD_CONSOLE_URL)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('VITE_CLOUD_CONSOLE_URL must be an HTTPS URL without credentials or a fragment')
  }
  return url.toString()
}
