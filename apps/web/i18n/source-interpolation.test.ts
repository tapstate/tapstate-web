import i18next from 'i18next'
import { describe, expect, it } from 'vitest'

import { resources, SUPPORTED_LOCALES } from './index'

describe('Source locale interpolation', () => {
  it.each(SUPPORTED_LOCALES)('interpolates Source variables in %s', async (locale) => {
    const translator = i18next.createInstance()
    await translator.init({
      resources,
      lng: locale,
      interpolation: { escapeValue: false },
    })

    const sourceTranslations = [
      translator.t('sources.tablesCount', { count: 2 }),
      translator.t('sources.details.secretConfiguredCount', { count: 2 }),
      translator.t('sources.create.optionMeta', { group: 'database', id: 'mysql' }),
      translator.t('sources.create.connectionSubtitle', { connector: 'MySQL' }),
      translator.t('sources.create.success', { id: 'mysql-primary' }),
      translator.t('sources.edit.title', { id: 'mysql-primary' }),
      translator.t('sources.edit.subtitle', { connector: 'MySQL' }),
      translator.t('sources.delete.title', { id: 'mysql-primary' }),
    ]

    for (const text of sourceTranslations) {
      expect(text).not.toMatch(/\{(?:count|connector|group|id)\}/)
    }
  })
})
