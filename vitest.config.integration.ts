import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // @ts-expect-error: Vite/Vitest plugin type mismatch in Vitest config context
  plugins: [svelte()],
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