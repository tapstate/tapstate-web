import { useEffect } from 'react'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { resolveTawkWidgetConfig } from './tawk-widget-config'

interface TawkApi {
  onLoad?: () => void
  onOfflineSubmit?: (data: unknown) => void
  showWidget?: () => void
  hideWidget?: () => void
}

declare global {
  interface Window {
    Tawk_API?: TawkApi
  }
}

const scriptId = 'tapstate-tawk-feedback-widget'

let activeMounts = 0
let apiWithLoadHandler: TawkApi | undefined
let apiWithOfflineHandler: TawkApi | undefined

function syncWidgetVisibility() {
  const api = window.Tawk_API
  if (activeMounts > 0) api?.showWidget?.()
  else api?.hideWidget?.()
}

function ensureTawkScript(propertyId: string, widgetId: string) {
  const api = (window.Tawk_API ??= {})
  if (apiWithLoadHandler !== api) {
    const existingOnLoad = api.onLoad
    api.onLoad = () => {
      existingOnLoad?.()
      syncWidgetVisibility()
    }
    apiWithLoadHandler = api
  }
  if (apiWithOfflineHandler !== api) {
    const existingOnOfflineSubmit = api.onOfflineSubmit
    api.onOfflineSubmit = (data) => {
      try {
        existingOnOfflineSubmit?.(data)
      } finally {
        if (activeMounts > 0) void notifyOfflineSubmission(propertyId)
      }
    }
    apiWithOfflineHandler = api
  }

  if (document.getElementById(scriptId)) return

  const script = document.createElement('script')
  script.id = scriptId
  script.async = true
  script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
  script.setAttribute('crossorigin', '*')
  script.onerror = () => script.remove()
  document.head.append(script)
}

async function notifyOfflineSubmission(propertyId: string) {
  const eventId = crypto.randomUUID()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await cloudApi.notifyTawkOfflineSubmission(eventId, propertyId)
      return
    } catch (error) {
      const shouldRetry =
        attempt === 0 &&
        (!(error instanceof CloudApiError) || error.status === 0 || error.status >= 500)
      if (!shouldRetry) {
        console.warn('Could not queue the Tawk offline feedback notification.')
        return
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000))
    }
  }
}

export function TawkFeedbackWidget() {
  const config = resolveTawkWidgetConfig({
    hostname: window.location.hostname,
    development: import.meta.env.DEV,
    propertyId: import.meta.env.VITE_TAWK_PROPERTY_ID,
    widgetId: import.meta.env.VITE_TAWK_WIDGET_ID,
  })

  useEffect(() => {
    if (!config) return

    activeMounts += 1
    ensureTawkScript(config.propertyId, config.widgetId)
    syncWidgetVisibility()

    return () => {
      activeMounts = Math.max(0, activeMounts - 1)
      syncWidgetVisibility()
    }
  }, [config?.propertyId, config?.widgetId])

  return null
}
