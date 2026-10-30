import { describe, expect, it } from 'vitest'

import { clusterAddressPreview } from './cluster-name'

describe('clusterAddressPreview', () => {
  it('uses the normalized Cluster name as the dev URL hostname', () => {
    expect(clusterAddressPreview('FLY', 'dev.cloud.tapstate.com')).toBe(
      'https://fly.dev.cloud.tapstate.com',
    )
  })

  it('uses the production Cluster URL domain', () => {
    expect(clusterAddressPreview('Acme Data', 'cloud.tapstate.com')).toBe(
      'https://acme-data.cloud.tapstate.com',
    )
  })

  it('keeps the full valid DNS label and omits labels longer than DNS permits', () => {
    const longName = 'a'.repeat(63)
    expect(clusterAddressPreview(longName, 'dev.cloud.tapstate.com')).toBe(
      `https://${longName}.dev.cloud.tapstate.com`,
    )
    expect(clusterAddressPreview(`${longName}a`, 'dev.cloud.tapstate.com')).toBeNull()
  })

  it('uses the dev domain for local Cloud Console previews', () => {
    expect(clusterAddressPreview('FLY', 'localhost')).toBe('https://fly.dev.cloud.tapstate.com')
  })

  it('uses the selected Cloud domain for local proxy previews', () => {
    expect(clusterAddressPreview('FLY', 'localhost', 'cloud.tapstate.com')).toBe(
      'https://fly.cloud.tapstate.com',
    )
  })

  it('omits the URL preview when the name or Cloud Console host is unsupported', () => {
    expect(clusterAddressPreview('团队', 'dev.cloud.tapstate.com')).toBeNull()
    expect(clusterAddressPreview('FLY', 'console.example.com')).toBeNull()
  })
})
