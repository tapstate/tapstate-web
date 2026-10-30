export interface TawkWidgetConfig {
  propertyId: string
  widgetId: string
}

interface TawkWidgetEnvironment {
  enabled: boolean
  cloudConsoleUrl: string
  development: boolean
}

const devWidget: TawkWidgetConfig = {
  propertyId: '6ad811f9c0b97c34b365a428',
  widgetId: '1k5e0ceht',
}

const prodWidget: TawkWidgetConfig = {
  propertyId: '6ad811f9c0b97c34b365a428',
  widgetId: '1k5e0ceht',
}

function isHostOrSubdomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

export function resolveTawkWidgetConfig({
  enabled,
  cloudConsoleUrl,
  development,
}: TawkWidgetEnvironment): TawkWidgetConfig | null {
  if (!enabled) return null

  const hostname = new URL(cloudConsoleUrl).hostname.toLowerCase()
  if (
    development ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    isHostOrSubdomain(hostname, 'dev.cloud.tapstate.com')
  ) {
    return devWidget
  }

  if (isHostOrSubdomain(hostname, 'cloud.tapstate.com')) return prodWidget

  return null
}
