export function installationLoginUrl(
  value: unknown,
  currentOrigin = window.location.origin,
): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/login' ||
      url.search ||
      url.hash ||
      url.origin === currentOrigin
    )
      return undefined
    return url.href
  } catch {
    return undefined
  }
}

export function replaceWithInstallationLogin(url: string) {
  window.location.replace(url)
}
