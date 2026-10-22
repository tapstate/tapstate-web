import { describe, expect, it } from 'vitest'

import { resolveTawkWidgetConfig } from './tawk-widget-config'

describe('resolveTawkWidgetConfig', () => {
  it('does not enable Tawk for the on-prem profile', () => {
    expect(
      resolveTawkWidgetConfig({
        enabled: false,
        cloudConsoleUrl: 'https://dev.cloud.tapstate.com/',
        development: false,
      }),
    ).toBeNull()
  })

  it('uses the dev Property for local and preview Cloud Console origins', () => {
    expect(
      resolveTawkWidgetConfig({
        enabled: true,
        cloudConsoleUrl: 'http://localhost:5175/',
        development: false,
      }),
    ).toEqual({ propertyId: '6ad811f9c0b97c34b365a428', widgetId: '1k5e0ceht' })
    expect(
      resolveTawkWidgetConfig({
        enabled: true,
        cloudConsoleUrl: 'https://dev.cloud.tapstate.com/',
        development: false,
      }),
    ).toEqual({ propertyId: '6ad811f9c0b97c34b365a428', widgetId: '1k5e0ceht' })
  })

  it('uses the production Property for the production Cloud Console origin', () => {
    expect(
      resolveTawkWidgetConfig({
        enabled: true,
        cloudConsoleUrl: 'https://cloud.tapstate.com/',
        development: false,
      }),
    ).toEqual({ propertyId: '6ad81a2c88dd6c34b5979eb7', widgetId: '1k5e2cghv' })
  })

  it('does not activate a Property for an unrelated Cloud Console host', () => {
    expect(
      resolveTawkWidgetConfig({
        enabled: true,
        cloudConsoleUrl: 'https://example.com/',
        development: false,
      }),
    ).toBeNull()
  })
})
