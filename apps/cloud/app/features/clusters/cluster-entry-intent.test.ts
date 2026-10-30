import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { consumeOAuthClusterEntry, rememberOAuthClusterEntry } from './cluster-entry-intent'

const target = { organizationId: 'org-b', enterClusterId: 'cluster-b' }
beforeEach(() => window.sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('tab-scoped OAuth Cluster navigation', () => {
  it('returns only validated identifiers once after the original provider callback', () => {
    rememberOAuthClusterEntry(target)
    expect(consumeOAuthClusterEntry('success')).toEqual(target)
    expect(consumeOAuthClusterEntry('success')).toEqual({})
  })
  it.each(['cancelled', 'provider-error', undefined])(
    'discards %s rather than redirect a later sign-in',
    (outcome) => {
      rememberOAuthClusterEntry(target)
      expect(consumeOAuthClusterEntry(outcome)).toEqual({})
      expect(consumeOAuthClusterEntry('success')).toEqual({})
    },
  )
  it('continues sign-in if tab storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => rememberOAuthClusterEntry(target)).not.toThrow()
  })
  it('does not revive an expired provider target', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
    rememberOAuthClusterEntry(target)
    clock.mockReturnValue(1000 + 11 * 60 * 1000)
    expect(consumeOAuthClusterEntry('success')).toEqual({})
  })
  it('does not store a foreign URL or credentials as a navigation target', () => {
    rememberOAuthClusterEntry({
      organizationId: 'org-b',
      enterClusterId: 'https://user:secret@foreign.test',
    })
    expect(consumeOAuthClusterEntry('success')).toEqual({})
  })
  it('an ordinary sign-in discards a target left by an abandoned provider flow', () => {
    rememberOAuthClusterEntry(target)
    expect(consumeOAuthClusterEntry()).toEqual({})
    expect(consumeOAuthClusterEntry('success')).toEqual({})
  })
})
