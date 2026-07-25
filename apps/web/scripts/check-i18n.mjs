import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const localeDir = join(root, 'i18n', 'locales')
const locales = ['en', 'zh-CN', 'zh-TW']

function flatten(value, prefix = '') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix]

  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

const keySets = new Map()

for (const locale of locales) {
  const path = join(localeDir, `${locale}.json`)
  const json = JSON.parse(readFileSync(path, 'utf8'))
  keySets.set(locale, new Set(flatten(json).filter(Boolean)))
}

const reference = keySets.get('en')
let failed = false

for (const locale of locales.slice(1)) {
  const keys = keySets.get(locale)
  const missing = [...reference].filter((key) => !keys.has(key))
  const extra = [...keys].filter((key) => !reference.has(key))

  if (missing.length > 0 || extra.length > 0) {
    failed = true
    console.error(`${locale} locale keys differ from en`)
    if (missing.length > 0) console.error(`missing: ${missing.join(', ')}`)
    if (extra.length > 0) console.error(`extra: ${extra.join(', ')}`)
  }
}

if (failed) process.exit(1)

console.log(`i18n keys match across ${locales.join(', ')}`)
