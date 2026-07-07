// Type the virtual messages module injected at build time by
// @intlify/unplugin-vue-i18n. Without this vue-tsc cannot resolve the import.
declare module '@intlify/unplugin-vue-i18n/messages' {
  const messages: Record<string, Record<string, unknown>>
  export default messages
}
