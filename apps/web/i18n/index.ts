import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'

export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'zh-TW'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
} as const

export function setupI18n() {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    })
  }

  return i18next
}

export const i18n = setupI18n()
