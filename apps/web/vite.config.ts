import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

import { getWebBuildInputs } from './build/web-build-inputs'

export default defineConfig(({ mode }) => {
  const build = getWebBuildInputs(mode, loadEnv(mode, process.cwd(), ''))
  return {
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
          target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: false,
        },
        '/api': {
          target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
        },
        '/version': {
          target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
        },
        '/connector-icons': {
          target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
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
