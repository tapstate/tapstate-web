const cloudConsoleHosts = new Set(['cloud.tapstate.com', 'dev.cloud.tapstate.com'])
const localDevelopmentHosts = new Set(['localhost', '127.0.0.1'])
const clusterLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function clusterDomainForConsoleHost(
  consoleHost: string,
  configuredDomain?: string,
): string | null {
  if (configuredDomain) return cloudConsoleHosts.has(configuredDomain) ? configuredDomain : null
  if (cloudConsoleHosts.has(consoleHost)) return consoleHost
  if (localDevelopmentHosts.has(consoleHost)) return 'dev.cloud.tapstate.com'
  return null
}

export function isAllowedCloudClusterHostname(hostname: string, consoleHost: string): boolean {
  if (!cloudConsoleHosts.has(consoleHost)) return false

  const suffix = `.${consoleHost}`
  const clusterLabel = hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : ''
  return clusterLabelPattern.test(clusterLabel)
}
export function isAllowedCloudClusterOrigin(
  origin: URL,
  consoleHost: string,
  allowDevelopmentPort: boolean,
): boolean {
  return (
    isAllowedCloudClusterHostname(origin.hostname, consoleHost) &&
    (origin.port === '' || allowDevelopmentPort)
  )
}
