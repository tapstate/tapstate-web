import { useEffect } from 'react'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { resolveTawkWidgetConfig } from './tawk-widget-config'

interface TawkCustomStyle {
  visibility?: {
    desktop?: {
      position?: 'br' | 'bl' | 'tr' | 'tl' | 'cr' | 'cl'
      xOffset?: number | string
      yOffset?: number | string
    }
    mobile?: {
      position?: 'br' | 'bl'
      xOffset?: number | string
      yOffset?: number | string
    }
  }
}

interface TawkApi {
  customStyle?: TawkCustomStyle
  onBeforeLoad?: () => void
  onLoad?: () => void
  onChatMinimized?: () => void
  onChatHidden?: () => void
  onOfflineSubmit?: (data: unknown) => void
  showWidget?: () => void
  hideWidget?: () => void
  maximize?: () => void
  isChatHidden?: () => boolean
  isChatMinimized?: () => boolean
}

declare global {
  interface Window {
    Tawk_API?: TawkApi
  }
}

const defaultCustomStyle: TawkCustomStyle = {
  visibility: {
    desktop: {
      position: 'bl',
      xOffset: 260,
      yOffset: 20,
    },
    mobile: {
      position: 'bl',
      xOffset: 10,
      yOffset: 10,
    },
  },
}

const scriptId = 'tapstate-tawk-feedback-widget'

let activeMounts = 0
let supportOpen = false
let apiWithBeforeLoadHandler: TawkApi | undefined
let apiWithLoadHandler: TawkApi | undefined
let apiWithMinimizedHandler: TawkApi | undefined
let apiWithHiddenHandler: TawkApi | undefined
let apiWithOfflineHandler: TawkApi | undefined

function syncWidgetVisibility() {
  const api = window.Tawk_API
  if (activeMounts > 0 && supportOpen) {
    api?.showWidget?.()
    api?.maximize?.()
  } else api?.hideWidget?.()
}

function ensureTawkScript(propertyId: string, widgetId: string) {
  const api = (window.Tawk_API ??= {})
  api.customStyle = {
    ...defaultCustomStyle,
    ...api.customStyle,
    visibility: {
      ...defaultCustomStyle.visibility,
      ...api.customStyle?.visibility,
      desktop: {
        ...defaultCustomStyle.visibility?.desktop,
        ...api.customStyle?.visibility?.desktop,
      },
      mobile: {
        ...defaultCustomStyle.visibility?.mobile,
        ...api.customStyle?.visibility?.mobile,
      },
    },
  }
  if (apiWithBeforeLoadHandler !== api) {
    const existingOnBeforeLoad = api.onBeforeLoad
    api.onBeforeLoad = () => {
      try {
        existingOnBeforeLoad?.()
      } finally {
        if (!supportOpen) api.hideWidget?.()
      }
    }
    apiWithBeforeLoadHandler = api
  }
  if (apiWithLoadHandler !== api) {
    const existingOnLoad = api.onLoad
    api.onLoad = () => {
      try {
        existingOnLoad?.()
      } finally {
        syncWidgetVisibility()
      }
    }
    apiWithLoadHandler = api
  }
  if (apiWithMinimizedHandler !== api) {
    const existingOnChatMinimized = api.onChatMinimized
    api.onChatMinimized = () => {
      try {
        existingOnChatMinimized?.()
      } finally {
        if (api.isChatMinimized?.() !== false) {
          supportOpen = false
          syncWidgetVisibility()
        }
      }
    }
    apiWithMinimizedHandler = api
  }
  if (apiWithHiddenHandler !== api) {
    const existingOnChatHidden = api.onChatHidden
    api.onChatHidden = () => {
      try {
        existingOnChatHidden?.()
      } finally {
        if (api.isChatHidden?.() !== false) supportOpen = false
      }
    }
    apiWithHiddenHandler = api
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

function widgetConfig() {
  return resolveTawkWidgetConfig({
    hostname: window.location.hostname,
    development: import.meta.env.DEV,
    propertyId: import.meta.env.VITE_TAWK_PROPERTY_ID,
    widgetId: import.meta.env.VITE_TAWK_WIDGET_ID,
  })
}

export function isTawkSupportAvailable() {
  return Boolean(widgetConfig())
}

export function openTawkSupport() {
  const config = widgetConfig()
  if (!config) return
  const api = window.Tawk_API
  if (activeMounts > 0 && api?.showWidget && api.maximize) {
    try {
      supportOpen = true
      syncWidgetVisibility()
      return
    } catch {
      supportOpen = false
      try {
        api.hideWidget?.()
      } catch {
        // The hosted support page remains available when the embedded widget fails.
      }
    }
  }
  window.open(
    `https://tawk.to/chat/${config.propertyId}/${config.widgetId}`,
    '_blank',
    'noopener,noreferrer',
  )
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
  const config = widgetConfig()

  useEffect(() => {
    if (!config) return

    activeMounts += 1
    ensureTawkScript(config.propertyId, config.widgetId)
    syncWidgetVisibility()

    return () => {
      activeMounts = Math.max(0, activeMounts - 1)
      if (activeMounts === 0) supportOpen = false
      syncWidgetVisibility()
    }
  }, [config?.propertyId, config?.widgetId])

  return null
}
