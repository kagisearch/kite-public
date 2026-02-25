<script lang="ts">
import { fetchFavicon, getImmediateFaviconUrl } from '$lib/services/faviconService';

interface Props {
	domain: string;
	alt?: string;
	class?: string;
	loading?: 'lazy' | 'eager';
}

let {
	domain,
	alt = '',
	class: className = 'h-5 w-5 rounded-sm',
	loading = 'lazy',
}: Props = $props();

// State for favicon URL - initialized empty, effect handles updates
let faviconUrl = $state('');
let isBestQuality = $state(false);

// Brightness detection state
let avgLuminance = $state<number | null>(null);
let isDarkMode = $state(false);

// Derive initial URL from domain prop reactively
const initialUrl = $derived(getImmediateFaviconUrl(domain));

// Display URL: use fetched URL if available, otherwise derived initial
const displayUrl = $derived(faviconUrl || initialUrl);

// Reactively determine if the favicon needs inversion based on luminance + theme
const DARK_THRESHOLD = 50; // Icons darker than this get inverted in dark mode
const LIGHT_THRESHOLD = 210; // Icons lighter than this get inverted in light mode
let needsInvert = $derived(
	avgLuminance !== null &&
		((isDarkMode && avgLuminance < DARK_THRESHOLD) ||
			(!isDarkMode && avgLuminance > LIGHT_THRESHOLD)),
);

// Watch for theme changes via MutationObserver on <html> class
$effect(() => {
	if (typeof document === 'undefined') return;

	isDarkMode = document.documentElement.classList.contains('dark');

	const observer = new MutationObserver(() => {
		isDarkMode = document.documentElement.classList.contains('dark');
	});

	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

	return () => observer.disconnect();
});

// Update when domain changes
$effect(() => {
	if (domain) {
		// Reset state for new domain
		faviconUrl = '';
		isBestQuality = false;
		avgLuminance = null;

		// Fetch with updates
		fetchFavicon(domain, (result) => {
			faviconUrl = result.url;
			isBestQuality = result.quality === 'best';
		});
	}
});

/**
 * Analyze the favicon's brightness by drawing it to an offscreen canvas
 * and computing the average luminance of opaque pixels.
 */
function analyzeBrightness(img: HTMLImageElement) {
	try {
		const canvas = document.createElement('canvas');
		const size = 16;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		ctx.drawImage(img, 0, 0, size, size);
		const imageData = ctx.getImageData(0, 0, size, size);
		const data = imageData.data;

		let totalLuminance = 0;
		let opaquePixels = 0;

		for (let i = 0; i < data.length; i += 4) {
			const a = data[i + 3];
			if (a < 128) continue; // Skip transparent/semi-transparent pixels

			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
			opaquePixels++;
		}

		if (opaquePixels === 0) return;

		avgLuminance = totalLuminance / opaquePixels;
	} catch {
		// Canvas tainted or other error - silently ignore
	}
}
</script>

<img
  src={displayUrl}
  alt={alt || `${domain} favicon`}
  class={className}
  class:high-quality={isBestQuality}
  class:needs-invert={needsInvert}
  {loading}
  crossorigin="anonymous"
  onload={(e) => analyzeBrightness(e.currentTarget as HTMLImageElement)}
  onerror={(e) => {
    // Fallback to placeholder on error
    const target = e.currentTarget as HTMLImageElement;
    target.src = "/svg/placeholder.svg";
  }}
/>

<style>
  img {
    transition: filter 0.2s ease-in-out;
  }

  img.high-quality {
    /* Subtle indication that high quality version loaded */
    filter: contrast(1.05);
  }

  img.needs-invert {
    filter: invert(1) hue-rotate(180deg);
  }

  img.high-quality.needs-invert {
    filter: invert(1) hue-rotate(180deg) contrast(1.05);
  }
</style>
