import antfu from '@antfu/eslint-config'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'

// Workspace lint config built on @antfu/eslint-config (Vue + TypeScript +
// stylistic, flat config). The vue-i18n block layered on top is the hard gate
// that blocks hardcoded UI strings — every user-visible string must go through
// vue-i18n instead of being written inline in a template. antfu does not ship
// this rule, so it is added explicitly to keep the gate.
export default antfu(
  {
    vue: true,
    typescript: true,
    ignores: ['**/dist/**'],
  },
  {
    files: ['**/*.vue'],
    plugins: { '@intlify/vue-i18n': vueI18n },
    rules: {
      // No raw text in templates — route everything through t() / $t().
      '@intlify/vue-i18n/no-raw-text': 'error',
    },
  },
)
