import { validateCloudConsoleUrl } from './cloud-console-url'

export function getCloudConsoleUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_CLOUD_CONSOLE_URL,
  localDevelopment: boolean = import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true',
): string {
  return validateCloudConsoleUrl(configuredUrl, localDevelopment)
}

export const cloudConsoleUrl = getCloudConsoleUrl()

export function replaceWithCloudConsole(url: string = cloudConsoleUrl) {
  window.location.replace(url)
}
