import { describe, expect, it } from 'vitest'

import { getDeploymentProfile } from '@/utils/deployment-profile'

import { getWebBuildInputs } from '../../build/web-build-inputs'

describe('deployment profile', () => {
  it.each(['cloud', ' CLOUD ', 'Cloud', 'onprem', 'development', 'unknown'])(
    'shares the build profile decision for %s mode',
    (mode) => {
      expect(getWebBuildInputs(mode, {}).profile).toBe(
        getDeploymentProfile(mode) === 'cloud' ? 'cloud' : 'op',
      )
    },
  )
  it('defaults to on-prem and recognizes cloud package builds', () => {
    expect(getDeploymentProfile(undefined)).toBe('on-prem')
    expect(getDeploymentProfile('onprem')).toBe('on-prem')
    expect(getDeploymentProfile('cloud')).toBe('cloud')
    expect(getDeploymentProfile('CLOUD')).toBe('cloud')
    expect(getDeploymentProfile('unknown')).toBe('on-prem')
  })
})
