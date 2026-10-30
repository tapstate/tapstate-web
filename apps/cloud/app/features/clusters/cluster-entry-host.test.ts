import { describe, expect, it } from 'vitest'

import {
  clusterDomainForConsoleHost,
  isAllowedCloudClusterHostname,
  isAllowedCloudClusterOrigin,
} from './cluster-entry-host'

describe('isAllowedCloudClusterHostname', () => {
  it.each([
    ['feynman.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['feynman.cloud.tapstate.com', 'cloud.tapstate.com'],
    ['26c64d59d72bf8a58984900a.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['5a8f4c2d.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
  ])('accepts %s from the %s console', (clusterHostname, consoleHostname) => {
    expect(isAllowedCloudClusterHostname(clusterHostname, consoleHostname)).toBe(true)
  })

  it.each([
    ['feynman.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['cluster.other.example', 'dev.cloud.tapstate.com'],
    ['one.two.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['-feynman.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['feynman.dev.cloud.tapstate.com', 'feynman.dev.cloud.tapstate.com'],
  ])('rejects %s from the %s console', (clusterHostname, consoleHostname) => {
    expect(isAllowedCloudClusterHostname(clusterHostname, consoleHostname)).toBe(false)
  })
})

describe('clusterDomainForConsoleHost', () => {
  it.each([
    { consoleHost: 'cloud.tapstate.com', expectedDomain: 'cloud.tapstate.com' },
    { consoleHost: 'dev.cloud.tapstate.com', expectedDomain: 'dev.cloud.tapstate.com' },
    { consoleHost: 'localhost', expectedDomain: 'dev.cloud.tapstate.com' },
    { consoleHost: '127.0.0.1', expectedDomain: 'dev.cloud.tapstate.com' },
    {
      consoleHost: 'localhost',
      expectedDomain: 'cloud.tapstate.com',
      configuredDomain: 'cloud.tapstate.com',
    },
    { consoleHost: 'console.example.com', expectedDomain: null },
  ])(
    'maps $consoleHost to the Cluster address domain $expectedDomain',
    ({ consoleHost, expectedDomain, configuredDomain }) => {
      expect(clusterDomainForConsoleHost(consoleHost, configuredDomain)).toBe(expectedDomain)
    },
  )
  it('omits the preview domain when a local proxy selects an unsupported Cloud host', () => {
    expect(clusterDomainForConsoleHost('localhost', 'console.example.com')).toBeNull()
  })
})

describe('isAllowedCloudClusterOrigin', () => {
  it('allows an explicit Cluster port in a local development build', () => {
    expect(
      isAllowedCloudClusterOrigin(
        new URL('https://feynman.dev.cloud.tapstate.com:29443'),
        'dev.cloud.tapstate.com',
        true,
      ),
    ).toBe(true)
  })

  it('rejects an explicit Cluster port in a release build', () => {
    expect(
      isAllowedCloudClusterOrigin(
        new URL('https://feynman.dev.cloud.tapstate.com:29443'),
        'dev.cloud.tapstate.com',
        false,
      ),
    ).toBe(false)
  })

  it('rejects a foreign Cluster origin in a local development build', () => {
    expect(
      isAllowedCloudClusterOrigin(
        new URL('https://cluster.other.example:29443'),
        'dev.cloud.tapstate.com',
        true,
      ),
    ).toBe(false)
  })
})
