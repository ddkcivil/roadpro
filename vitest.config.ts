/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
      '@vercel/postgres': path.resolve(__dirname, 'api/node_modules/@vercel/postgres'),
      '@vercel/blob': path.resolve(__dirname, 'api/node_modules/@vercel/blob'),
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
