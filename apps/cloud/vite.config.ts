import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig } from 'vite'

export default defineConfig({
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
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
