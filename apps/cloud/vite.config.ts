import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), 'CLOUD_')
  const proxyTarget =
    process.env.CLOUD_PROXY_TARGET || localEnv.CLOUD_PROXY_TARGET || 'http://localhost:8080'
  const proxyOrigin = new URL(proxyTarget).origin

  return {
    plugins: [
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
        '/v1/api': {
          target: proxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, request) => {
              const origin = request.headers.origin
              const host = request.headers.host
              if (typeof origin !== 'string' || typeof host !== 'string') return

              const protocol =
                'encrypted' in request.socket && request.socket.encrypted === true
                  ? 'https'
                  : 'http'
              const requestOrigin = `${protocol}://${host}`
              if (origin === requestOrigin) proxyReq.setHeader('origin', proxyOrigin)
            })
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['**/*.test.ts', '**/*.test.tsx'],
    },
  }
})
