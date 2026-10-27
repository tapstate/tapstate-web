import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

import { getWebBuildInputs } from './build/web-build-inputs'

function rewriteLocalOrigin(
  proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0],
  proxyOrigin: string,
) {
  proxy.on('proxyReq', (proxyReq, request) => {
    const origin = request.headers.origin
    const host = request.headers.host
    if (typeof origin !== 'string' || typeof host !== 'string') return

    const protocol =
      'encrypted' in request.socket && request.socket.encrypted === true ? 'https' : 'http'
    if (origin === `${protocol}://${host}`) proxyReq.setHeader('origin', proxyOrigin)
  })
}

export default defineConfig(({ mode }) => {
  const envDir = process.env.TAPSTATE_LOCAL_PREVIEW_ENV_DIR ?? process.cwd()
  const build = getWebBuildInputs(mode, loadEnv(mode, envDir, ''))
  const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080'
  const proxyOrigin = new URL(proxyTarget).origin
  return {
    envDir,
    define: {
      'import.meta.env.VITE_LOCAL_DEVELOPMENT': JSON.stringify(
        String(build.purpose === 'local-development' && build.profile === 'cloud'),
      ),
      'import.meta.env.VITE_CLOUD_CONSOLE_URL': JSON.stringify(build.cloudConsoleUrl ?? ''),
    },
    plugins: [
      {
        name: 'tapstate-web-build-marker',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'tapstate-web-build.json',
            source: JSON.stringify(build, null, 2) + '\n',
          })
        },
      },
      tanstackRouter({
        generatedRouteTree: './app/routeTree.gen.ts',
        quoteStyle: 'single',
        routesDirectory: './app/routes',
        semicolons: false,
        target: 'react',
      }),
      tailwindcss(),
      react(),
    ],
    resolve: {
      // Formily uses React context internally. Keep the workspace bridge and the
      // Ant Design adapter on one runtime instance so controls receive their field.
      dedupe: [
        'react',
        'react-dom',
        '@formily/core',
        '@formily/json-schema',
        '@formily/react',
        '@formily/reactive',
        '@formily/reactive-react',
      ],
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/auth': {
          target: proxyTarget,
          changeOrigin: build.profile === 'cloud',
          ...(build.profile === 'cloud'
            ? {
                configure: (proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0]) =>
                  rewriteLocalOrigin(proxy, proxyOrigin),
              }
            : {}),
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          configure: (proxy) => rewriteLocalOrigin(proxy, proxyOrigin),
        },
        '/version': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/connector-icons': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['**/*.test.ts', '**/*.test.tsx'],
    },
  }
})
