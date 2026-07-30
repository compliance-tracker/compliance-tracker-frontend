/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // globals left off deliberately - describe/it/expect are imported explicitly from
    // 'vitest' in each test file instead, so tsconfig.app.json (the actual app's build
    // config, also used for `npm run build`'s type-check) never needs test-only global
    // type declarations added to it just to keep test files compiling.
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // e2e/ (issue #30) uses @playwright/test's own test()/expect(), which Vitest's runner
    // doesn't understand - excluded here so `npm test` never tries to execute them itself;
    // Playwright's own config (testDir: './e2e') is what actually runs them.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
