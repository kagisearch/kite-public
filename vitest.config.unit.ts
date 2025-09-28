import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // @ts-expect-error: Vite/Vitest plugin type mismatch in Vitest config context
  plugins: [svelte()],
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
      '$app/state': path.resolve('./src/app.state.ts'),
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '$app/environment': path.resolve('./src/app.ts'),
      '$app/state': path.resolve('./src/app.state.ts'),
    },
    conditions: ['browser'],
  },
});