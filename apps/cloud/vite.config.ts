import type { ClientRequest, IncomingMessage } from 'node:http'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { EventEmitter } from 'node:events'
import process from 'node:process'
import { loadEnv, type ProxyOptions } from 'vite'
import { defineConfig } from 'vitest/config'

import { startupShell } from '../web/build/startup-shell'
import startupLocale from './app/i18n/locales/en.json'

function rewriteLocalOrigin(
  proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0],
  proxyOrigin: string,
) {
  EventEmitter.prototype.on.call(
    proxy,
    'proxyReq',
    (proxyReq: ClientRequest, request: IncomingMessage) => {
      const origin = request.headers.origin
      const host = request.headers.host
      if (typeof origin !== 'string' || typeof host !== 'string') return

      const protocol =
        'encrypted' in request.socket && request.socket.encrypted === true ? 'https' : 'http'
      if (origin === `${protocol}://${host}`) proxyReq.setHeader('origin', proxyOrigin)
    },
  )
}

export default defineConfig(({ mode }) => {
  const envDir = process.env.TAPSTATE_LOCAL_PREVIEW_ENV_DIR ?? process.cwd()
  const localEnv = loadEnv(mode, envDir, 'CLOUD_')
  const legacyEnv = loadEnv(mode, envDir, 'VITE_')
  const proxyTarget =
    process.env.CLOUD_PROXY_TARGET ||
    localEnv.CLOUD_PROXY_TARGET ||
    process.env.VITE_PROXY_TARGET ||
    legacyEnv.VITE_PROXY_TARGET ||
    'http://localhost:8080'
  const proxyOrigin = new URL(proxyTarget).origin
  const apiProxy: ProxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    configure: (proxy) => rewriteLocalOrigin(proxy, proxyOrigin),
  }

  return {
    envDir,
    plugins: [
      startupShell(startupLocale.startup),
      tanstackRouter({
        generatedRouteTree: './app/routeTree.gen.ts',
        routesDirectory: './app/routes',
        target: 'react',
        quoteStyle: 'single',
        semicolons: false,
      }),
      tailwindcss(),
      react(),
    ],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/v1/api': apiProxy,
      },
    },
    test: {
      environment: 'jsdom',
      include: ['**/*.test.ts', '**/*.test.tsx'],
    },
  }
})
