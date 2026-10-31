import { describe, expect, it } from 'vitest'

import { startupRetryUrl } from '../../startup-retry'

describe('startup recovery navigation', () => {
  it('keeps the verified organization and Cluster target on reload', () => {
    const current = new URL('https://cloud.example/?organizationId=org-b&enterClusterId=cluster-b')
    expect(startupRetryUrl(current)).toBe(current.href)
  })
  it('keeps the exact onboarding subscription and organization-creation mode', () => {
    const current = new URL(
      'https://cloud.example/onboarding?organizationId=org-b&subscriptionId=sub-b&createOrganization=false',
    )
    expect(startupRetryUrl(current)).toBe(current.href)
    expect(
      startupRetryUrl(new URL('https://cloud.example/onboarding?createOrganization=true')),
    ).toBe('https://cloud.example/onboarding?createOrganization=true')
  })
  it('preserves a deep path without replaying a code, token or fragment', () => {
    expect(
      startupRetryUrl(
        new URL('https://cluster.example/pipelines/orders?code=secret&token=secret#secret'),
      ),
    ).toBe('https://cluster.example/pipelines/orders')
    expect(startupRetryUrl(new URL('https://cluster.example/auth/exchange?code=secret'))).toBe(
      'https://cluster.example/',
    )
  })
  it('rejects malformed and unscoped continuation identifiers', () => {
    expect(
      startupRetryUrl(
        new URL('https://cloud.example/?organizationId=../other&enterClusterId=cluster-b'),
      ),
    ).toBe('https://cloud.example/')
    expect(startupRetryUrl(new URL('https://cloud.example/?enterClusterId=cluster-b'))).toBe(
      'https://cloud.example/',
    )
  })
})
