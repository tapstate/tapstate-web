let prepared: Promise<boolean> | undefined
let preparedLanguage: string | undefined

/** Only the dedicated OP installation origin uses this stateless navigation fallback. */
export function prepareInstallationReconnect(language = 'en'): Promise<boolean> {
  if (preparedLanguage !== language) {
    prepared = undefined
    preparedLanguage = language
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(false)
  prepared ??= navigator.serviceWorker
    .register(`/installation-reconnect.js?lang=${encodeURIComponent(language)}`, {
      scope: '/',
      updateViaCache: 'none',
    })
    .then(async (registration) => {
      if (registration.active) return true
      return await new Promise<boolean>((resolve) => {
        const worker = registration.installing ?? registration.waiting
        if (!worker) {
          resolve(false)
          return
        }
        const timer = window.setTimeout(() => resolve(false), 3000)
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            window.clearTimeout(timer)
            resolve(worker.state === 'activated')
          }
        })
      })
    })
    .catch(() => false)
  return prepared
}
