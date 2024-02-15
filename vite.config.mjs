import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

/// <reference types="vitest" />
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['__tests__/**/*.test.tsx'],
    exclude: ['__tests__/fixtures/**'],
    snapshotFormat: {
      printBasicPrototype: true,
    },
  },
})
