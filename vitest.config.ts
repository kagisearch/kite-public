import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.integration.test.{js,ts}'],
          environment: 'jsdom',
          pool: 'threads',
          setupFiles: ['./src/tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.{js,ts}'],
          environment: 'node',
          setupFiles: ['./src/tests/setup.integration.ts'],
          pool: 'forks',
          testTimeout: 10000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
    },
  },
});