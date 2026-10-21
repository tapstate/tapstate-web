export const PREVIEW_CLOUD_CONSOLE_URL = 'https://dev.cloud.tapstate.com/'

function localConsoleOrigin(configuredUrl: string | undefined): string | null {
  const match = /^http:\/\/localhost:([1-9][0-9]{0,4})\/?$/.exec(configuredUrl?.trim() ?? '')
  return match && Number(match[1]) <= 65535 ? `http://localhost:${match[1]}/` : null
}

/** HTTP is confined to an explicit development artifact and a literal localhost origin. */
export function validateCloudConsoleUrl(
  configuredUrl: string | undefined,
  localDevelopment = false,
): string {
  const localOrigin = localConsoleOrigin(configuredUrl)
  if (localDevelopment) {
    if (!localOrigin) {
      throw new Error(
        'Local Cloud Console requires an explicit localhost HTTP origin and valid port',
      )
    }
    return localOrigin
  }
  let url: URL
  try {
    url = new URL(configuredUrl?.trim() || PREVIEW_CLOUD_CONSOLE_URL)
  } catch {
    throw new Error('VITE_CLOUD_CONSOLE_URL must be a valid HTTPS URL')
  }
  if (localOrigin) {
    throw new Error(
      'Local Cloud Console HTTP requires TAPSTATE_LOCAL_DEVELOPMENT=true; release builds require HTTPS',
    )
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('VITE_CLOUD_CONSOLE_URL must be an HTTPS URL without credentials or a fragment')
  }
  return url.toString()
}
