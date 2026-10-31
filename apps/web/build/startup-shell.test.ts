import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it } from 'vitest'

describe('document startup before application scripts', () => {
  it.each(['web', 'cloud'])(
    'keeps %s visible when the entry module never executes',
    async (app) => {
      const html = readFileSync(resolve(import.meta.dirname, `../../${app}/index.html`), 'utf8')
      const root = resolve(import.meta.dirname, `../../${app}`)
      const server = await createServer({
        root,
        configFile: resolve(root, 'vite.config.ts'),
        server: { middlewareMode: true, preTransformRequests: false },
        // This test transforms the document without loading the application modules.
        optimizeDeps: { noDiscovery: true, include: [] },
      })
      let transformed: string
      try {
        transformed = await server.transformIndexHtml('/', html)
      } finally {
        await server.close()
      }
      const template = document.createElement('template')
      template.innerHTML = transformed
      const waiting = template.content.querySelector('#root [role="status"]')
      expect(
        waiting,
        'The initial document must paint a status before any application script executes',
      ).not.toBeNull()
      expect(waiting?.textContent).toContain('Loading')
      expect(template.content.querySelector('#root a')).toBeNull()
      expect(waiting?.textContent).toContain('reload')
      expect(template.content.querySelector('#root script')).toBeNull()
      expect(transformed).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(/)
    },
  )
})
