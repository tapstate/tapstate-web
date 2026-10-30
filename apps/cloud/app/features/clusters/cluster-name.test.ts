import { describe, expect, it } from 'vitest'

import { clusterAddressPreview } from './cluster-name'

describe('clusterAddressPreview', () => {
  it('shows the normalized name at the start of the dev Cluster URL', () => {
    expect(clusterAddressPreview('FLY', 'dev.cloud.tapstate.com')).toBe(
      'https://fly-<cluster-id>.dev.cloud.tapstate.com',
    )
  })

  it('uses the production Cluster URL domain', () => {
    expect(clusterAddressPreview('Acme Data', 'cloud.tapstate.com')).toBe(
      'https://acme-data-<cluster-id>.cloud.tapstate.com',
    )
  })

  it('leaves room for the generated Cluster ID suffix', () => {
    const longName = 'a'.repeat(60)
    expect(clusterAddressPreview(longName, 'dev.cloud.tapstate.com')).toBe(
      `https://${'a'.repeat(38)}-<cluster-id>.dev.cloud.tapstate.com`,
    )
  })

  it('uses the dev domain for local Cloud Console previews', () => {
    expect(clusterAddressPreview('FLY', 'localhost')).toBe(
      'https://fly-<cluster-id>.dev.cloud.tapstate.com',
    )
  })

  it('uses the selected Cloud domain for local proxy previews', () => {
    expect(clusterAddressPreview('FLY', 'localhost', 'cloud.tapstate.com')).toBe(
      'https://fly-<cluster-id>.cloud.tapstate.com',
    )
  })

  it('omits the URL preview when the name or Cloud Console host is unsupported', () => {
    expect(clusterAddressPreview('团队', 'dev.cloud.tapstate.com')).toBeNull()
    expect(clusterAddressPreview('FLY', 'console.example.com')).toBeNull()
  })
})
