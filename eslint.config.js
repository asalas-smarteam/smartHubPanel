import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'src/components/ui']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'vite.config.js',
      'eslint.config.js',
      'scripts/**',
      'src/**/*.test.{js,jsx}',
      'src/test/**',
      'src/mocks/server.js',
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Tests y helpers de tests: Fast Refresh no aplica.
    files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
