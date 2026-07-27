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
  },
})
