const cloudConsoleHosts = new Set(['cloud.tapstate.com', 'dev.cloud.tapstate.com'])
const clusterLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

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
