import { describe, expect, it } from 'vitest'

import { isAllowedCloudClusterHostname } from './cluster-entry-host'

describe('isAllowedCloudClusterHostname', () => {
  it.each([
    ['feynman.dev.cloud.tapstate.com', 'dev.cloud.tapstate.com'],
    ['feynman.cloud.tapstate.com', 'cloud.tapstate.com'],
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
