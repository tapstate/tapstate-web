/** Retry the same page with only validated, non-secret Cluster continuation identifiers. */
export function startupRetryUrl(current: URL): string {
  const target = new URL(current.origin)
  target.pathname = current.pathname === '/auth/exchange' ? '/' : current.pathname
  const id = (name: string) => {
    const value = current.searchParams.get(name)
    return value && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : undefined
  }
  const organizationId = id('organizationId')
  const clusterId = organizationId ? id('enterClusterId') : undefined
  if (organizationId) target.searchParams.set('organizationId', organizationId)
  if (clusterId) target.searchParams.set('enterClusterId', clusterId)
  if (current.pathname === '/onboarding') {
    const subscriptionId = id('subscriptionId')
    if (organizationId && subscriptionId) target.searchParams.set('subscriptionId', subscriptionId)
    const createOrganization = current.searchParams.get('createOrganization')
    if (createOrganization === 'true' || createOrganization === 'false')
      target.searchParams.set('createOrganization', createOrganization)
  }
  return target.href
}
