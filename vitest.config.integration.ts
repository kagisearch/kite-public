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
    testTimeout: 20000,
    // Keep default pool; avoid non-existent threads option in InlineConfig types
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
    },
    conditions: ['node'],
  },
});