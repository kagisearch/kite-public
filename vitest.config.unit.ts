import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/**/*.integration.test.{js,ts}'],
    environment: 'jsdom',
    pool: 'threads',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
    },
    conditions: ['browser'],
  },
});