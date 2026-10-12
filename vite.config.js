import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { defineConfig, loadEnv } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const apiTarget = env.PANEL_API_TARGET || 'http://localhost:3000'
  // El worker de MSW solo se sirve en `npm run dev:mock`; nunca llega al build.
  const useMockWorker = command === 'serve' && mode === 'mock'

  return {
    plugins: [react(), tailwindcss(), useMockWorker && msw({ mode: 'worker-only' })].filter(
      Boolean,
    ),
    resolve: {
      alias: { '@': path.resolve(rootDir, 'src') },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '/panel/api'),
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.js'],
      css: false,
      restoreMocks: true,
      coverage: {
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/components/ui/**', 'src/mocks/**', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      },
    },
  }
})
