// Messages compiled from src/i18n/locales/<locale>/<namespace>.json by
// @intlify/unplugin-vue-i18n at build time.
import messages from '@intlify/unplugin-vue-i18n/messages'
import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'zh-TW'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const i18n = createI18n({
  legacy: false, // Composition API mode — use useI18n().
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})
