export interface TawkWidgetConfig {
  propertyId: string
  widgetId: string
}

interface TawkWidgetEnvironment {
  hostname: string
  development: boolean
  propertyId?: string
  widgetId?: string
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
  hostname,
  development,
  propertyId,
  widgetId,
}: TawkWidgetEnvironment): TawkWidgetConfig | null {
  const configuredPropertyId = propertyId?.trim()
  const configuredWidgetId = widgetId?.trim()

  if (configuredPropertyId || configuredWidgetId) {
    if (!configuredPropertyId || !configuredWidgetId) return null
    return { propertyId: configuredPropertyId, widgetId: configuredWidgetId }
  }

  const normalizedHostname = hostname.toLowerCase()
  if (
    development ||
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    isHostOrSubdomain(normalizedHostname, 'dev.cloud.tapstate.com')
  ) {
    return devWidget
  }

  if (isHostOrSubdomain(normalizedHostname, 'cloud.tapstate.com')) return prodWidget

  return null
}
