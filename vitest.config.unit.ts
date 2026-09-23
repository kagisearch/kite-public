import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.integration.test.{js,ts}'],
		environment: 'jsdom',
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
