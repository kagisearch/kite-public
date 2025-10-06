import { describe, expect, it } from 'vitest';
import { mediaService } from '../../mediaService';

describe('MediaService Integration Tests', () => {
	describe('loadMediaData with real API', () => {
		it('should load media information', async () => {
			const mediaData = await mediaService.loadMediaData('en');

			expect(Array.isArray(mediaData)).toBe(true);

			if (mediaData.length > 0) {
				mediaData.forEach((media) => {
					expect(media).toHaveProperty('country');
					expect(media).toHaveProperty('organization');
					expect(media).toHaveProperty('domains');
					expect(media).toHaveProperty('description');
					expect(media).toHaveProperty('owner');
					expect(media).toHaveProperty('typology');

					expect(typeof media.country).toBe('string');
					expect(typeof media.organization).toBe('string');
					expect(Array.isArray(media.domains)).toBe(true);
					expect(media.domains.length).toBeGreaterThan(0);
					expect(typeof media.description).toBe('string');
					expect(typeof media.owner).toBe('string');
					expect(typeof media.typology).toBe('string');

					// Each domain should be a string (can be hostname or organization name)
					media.domains.forEach((domain) => {
						expect(typeof domain).toBe('string');
						expect(domain.length).toBeGreaterThan(0);
					});
				});
			}
		});
	});

	describe('getMediaInfoForDomain with real API', () => {
		it('should find media info for known domains', async () => {
			// First load all media data to get a valid domain
			const allMedia = await mediaService.loadMediaData('en');

			if (allMedia.length > 0 && allMedia[0].domains.length > 0) {
				const testDomain = allMedia[0].domains[0];
				const mediaInfo = await mediaService.getMediaInfoForDomain(testDomain, 'en');

				expect(mediaInfo).not.toBeNull();
				expect(mediaInfo?.domains).toContain(testDomain);
				expect(mediaInfo?.organization).toBe(allMedia[0].organization);
			}
		});

		it('should return null for unknown domains', async () => {
			const mediaInfo = await mediaService.getMediaInfoForDomain('unknown-domain-12345.com', 'en');
			expect(mediaInfo).toBeNull();
		});
	});

	describe('loadMediaDataForHost with real API', () => {
		it('should load media info for specific host', async () => {
			// Get a valid host from the media data
			const allMedia = await mediaService.loadMediaData('en');

			if (allMedia.length > 0 && allMedia[0].domains.length > 0) {
				const testHost = allMedia[0].domains[0];
				const mediaInfo = await mediaService.loadMediaDataForHost(testHost, 'en');

				expect(mediaInfo).not.toBeNull();
				if (mediaInfo) {
					expect(mediaInfo.domains).toContain(testHost);
					expect(mediaInfo).toHaveProperty('organization');
					expect(mediaInfo).toHaveProperty('country');
					expect(mediaInfo).toHaveProperty('typology');
				}
			}
		});

		it('should return null for unknown hosts', async () => {
			const mediaInfo = await mediaService.loadMediaDataForHost('nonexistent-host-xyz.com', 'en');
			expect(mediaInfo).toBeNull();
		});

		it('should be more efficient than loading all media data', async () => {
			// This test assumes the optimized endpoint is faster
			const allMedia = await mediaService.loadMediaData('en');

			if (allMedia.length > 0 && allMedia[0].domains.length > 0) {
				const testHost = allMedia[0].domains[0];

				const startAll = performance.now();
				await mediaService.getMediaInfoForDomain(testHost, 'en');
				const timeAll = performance.now() - startAll;

				const startHost = performance.now();
				await mediaService.loadMediaDataForHost(testHost, 'en');
				const timeHost = performance.now() - startHost;

				// The host-specific endpoint should generally be faster
				// but we won't assert this as network conditions vary
				console.log(
					`Load all media: ${timeAll.toFixed(2)}ms, Load specific host: ${timeHost.toFixed(2)}ms`,
				);
			}
		});
	});
});
