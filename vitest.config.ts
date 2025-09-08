import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // @ts-expect-error: Vite/Vitest plugin type mismatch in Vitest config context
  plugins: [svelte()],
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
      '$app/state': path.resolve('./src/app.state.ts'),
    },
  },
});