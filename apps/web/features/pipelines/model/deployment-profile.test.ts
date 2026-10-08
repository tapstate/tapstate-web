import { describe, expect, it } from 'vitest'

import { getDeploymentProfile } from './deployment-profile'

describe('deployment profile', () => {
  it('defaults to on-prem and recognizes cloud package builds', () => {
    expect(getDeploymentProfile(undefined)).toBe('on-prem')
    expect(getDeploymentProfile('cloud')).toBe('cloud')
    expect(getDeploymentProfile('CLOUD')).toBe('cloud')
    expect(getDeploymentProfile('unknown')).toBe('on-prem')
  })
})
