import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { i18n, setupI18n, SUPPORTED_LOCALES } from './index'

beforeEach(() => {
  document.documentElement.lang = 'und'
})

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('document language', () => {
  it.each(SUPPORTED_LOCALES)('matches the active %s interface language', async (locale) => {
    await i18n.changeLanguage(locale)

    expect(document.documentElement.lang).toBe(locale)
  })

  it('restores the active document language when setup is reused', async () => {
    await i18n.changeLanguage('zh-TW')
    document.documentElement.lang = 'und'

    setupI18n()

    expect(document.documentElement.lang).toBe('zh-TW')
  })
})
