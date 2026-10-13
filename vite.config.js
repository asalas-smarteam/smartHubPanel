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
    build: {
      rolldownOptions: {
        output: {
          // Librerías en archivos aparte: cambian poco y el navegador las mantiene en caché.
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
              },
              {
                name: 'vendor-ui',
                test: /node_modules[\\/](radix-ui|@radix-ui|sonner|lucide-react)[\\/]/,
              },
              {
                name: 'vendor-data',
                test: /node_modules[\\/](@tanstack|zod|react-hook-form|@hookform|date-fns)[\\/]/,
              },
            ],
          },
        },
      },
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
      // Las pantallas completas con varios pasos de usuario tardan más que el límite por defecto (5 s).
      testTimeout: 30000,
      coverage: {
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/components/ui/**', 'src/mocks/**', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      },
    },
  }
})
