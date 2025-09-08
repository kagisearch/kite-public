import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.{js,ts}'],
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.integration.ts'],
    testTimeout: 10000, // Longer timeout for API calls
    pool: 'forks', // Use separate processes to avoid state pollution
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
    },
    conditions: ['node'],
  },
});