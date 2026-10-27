import { useEffect, useSyncExternalStore } from 'react'

import { cloudConsoleUrl } from '@/utils/cloud-console'
import { deploymentProfile } from '@/utils/deployment-profile'

import {
  notifyTawkOfflineSubmission,
  TawkNotificationError,
} from '../../service/tawk-feedback-client'
import { resolveTawkWidgetConfig } from './tawk-widget-config'

interface TawkApi {
  onBeforeLoad?: () => void
  onLoad?: () => void
  onChatMinimized?: () => void
  onChatHidden?: () => void
  onOfflineSubmit?: (_data: unknown) => void
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

const scriptId = 'tapstate-tawk-feedback-widget'

let activeMounts = 0
let supportOpen = false
const supportListeners = new Set<() => void>()
let apiWithBeforeLoadHandler: TawkApi | undefined
let apiWithLoadHandler: TawkApi | undefined
let apiWithMinimizedHandler: TawkApi | undefined
let apiWithHiddenHandler: TawkApi | undefined
let apiWithOfflineHandler: TawkApi | undefined

function setSupportOpen(open: boolean) {
  if (supportOpen === open) return
  supportOpen = open
  supportListeners.forEach((listener) => listener())
}

export function useTawkSupportOpen() {
  return useSyncExternalStore(
    (listener) => {
      supportListeners.add(listener)
      return () => supportListeners.delete(listener)
    },
    () => supportOpen,
    () => false,
  )
}

function syncWidgetVisibility() {
  const api = window.Tawk_API
  if (activeMounts > 0 && supportOpen) {
    api?.showWidget?.()
    api?.maximize?.()
  } else api?.hideWidget?.()
}

function ensureTawkScript(propertyId: string, widgetId: string) {
  const api = (window.Tawk_API ??= {})
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
          setSupportOpen(false)
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
        if (api.isChatHidden?.() !== false) setSupportOpen(false)
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
    enabled: deploymentProfile === 'cloud',
    cloudConsoleUrl,
    development: import.meta.env.DEV,
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
      setSupportOpen(true)
      syncWidgetVisibility()
      return
    } catch {
      setSupportOpen(false)
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
      await notifyTawkOfflineSubmission(eventId, propertyId)
      return
    } catch (error) {
      const shouldRetry =
        attempt === 0 &&
        (!(error instanceof TawkNotificationError) || error.status === 0 || error.status >= 500)
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
      if (activeMounts === 0) setSupportOpen(false)
      syncWidgetVisibility()
    }
  }, [config?.propertyId, config?.widgetId])

  return null
}
