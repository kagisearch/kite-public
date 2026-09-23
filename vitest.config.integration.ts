import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
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
	},
});
