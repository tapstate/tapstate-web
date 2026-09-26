import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
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
  server: { port: 5174, strictPort: true },
})
