import type { Cluster } from '../../service/cloud-api'

import { clusterDomainForConsoleHost } from './cluster-entry-host'

const clusterDnsLabelMaxLength = 63
const clusterIdSuffixLength = 24

export function clusterDnsLabel(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function hasValidClusterDnsLabel(name: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(clusterDnsLabel(name))
}

export function clusterAddressPreview(
  name: string,
  consoleHost: string,
  configuredDomain?: string,
) {
  if (!hasValidClusterDnsLabel(name)) return null

  const domain = clusterDomainForConsoleHost(consoleHost, configuredDomain)
  if (!domain) return null

  const prefixLength = clusterDnsLabelMaxLength - clusterIdSuffixLength - 1
  const prefix = clusterDnsLabel(name).slice(0, prefixLength).replace(/-+$/, '')
  if (!prefix) return null

  return `https://${prefix}-<cluster-id>.${domain}`
}

export function suggestedClusterDisplayName(organizationName: string, clusters: Cluster[]) {
  const base = organizationName.trim().slice(0, 100)
  const taken = new Set(
    clusters
      .filter((cluster) => cluster.state !== 'TERMINATED')
      .map((cluster) => clusterDnsLabel(cluster.name)),
  )
  if (!taken.has(clusterDnsLabel(base))) return base

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const suffixText = ` ${suffix}`
    const candidate = `${base.slice(0, 100 - suffixText.length)}${suffixText}`
    if (!taken.has(clusterDnsLabel(candidate))) return candidate
  }

  const suffix = ` ${Date.now().toString(36)}`
  return `${base.slice(0, 100 - suffix.length)}${suffix}`
}
