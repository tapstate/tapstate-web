import { describe, expect, it } from 'vitest'

import { resolveTawkWidgetConfig } from './tawk-widget-config'

describe('resolveTawkWidgetConfig', () => {
  it('uses the dev Property for development and the dev Cloud host', () => {
    expect(resolveTawkWidgetConfig({ hostname: 'localhost', development: true })).toEqual({
      propertyId: '6ad811f9c0b97c34b365a428',
      widgetId: '1k5e0ceht',
    })
    expect(
      resolveTawkWidgetConfig({
        hostname: 'dev.cloud.tapstate.com',
        development: false,
      }),
    ).toEqual({ propertyId: '6ad811f9c0b97c34b365a428', widgetId: '1k5e0ceht' })
  })

  it('uses the production Property only for the production Cloud host', () => {
    expect(resolveTawkWidgetConfig({ hostname: 'cloud.tapstate.com', development: false })).toEqual(
      { propertyId: '6ad81a2c88dd6c34b5979eb7', widgetId: '1k5e2cghv' },
    )
  })

  it('uses a complete explicit environment override', () => {
    expect(
      resolveTawkWidgetConfig({
        hostname: 'preview.example.com',
        development: false,
        propertyId: 'property-id',
        widgetId: 'widget-id',
      }),
    ).toEqual({ propertyId: 'property-id', widgetId: 'widget-id' })
  })

  it('disables the widget for incomplete overrides and unrelated hosts', () => {
    expect(
      resolveTawkWidgetConfig({
        hostname: 'cloud.tapstate.com',
        development: false,
        propertyId: 'property-id',
      }),
    ).toBeNull()
    expect(resolveTawkWidgetConfig({ hostname: 'example.com', development: false })).toBeNull()
  })
})
