<script lang="ts">
import { onMount, type Snippet } from 'svelte';
import { browser } from '$app/environment';
import { theme } from '$lib/stores/theme.svelte.js';
import { language } from '$lib/stores/language.svelte.js';
import { dataLanguage } from '$lib/stores/dataLanguage.svelte.js';
import { fontSize } from '$lib/stores/fontSize.svelte.js';
import { categories } from '$lib/stores/categories.svelte.js';
import { settings } from '$lib/stores/settings.svelte.js';
import { storyCount } from '$lib/stores/storyCount.svelte.js';
import { experimental } from '$lib/stores/experimental.svelte.js';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import 'overlayscrollbars/overlayscrollbars.css';
import '../styles/index.css';
import type { PageData } from './$types';

// Props from layout load
let { data, children }: {data: PageData, children: Snippet } = $props();

onMount(async () => {
	// Initialize all stores
	theme.init();
	language.init();
	language.initStrings(data.strings); // Initialize with page data
	dataLanguage.init();
	fontSize.init();
	categories.init();
	settings.init();
	storyCount.init();
	experimental.init();
	
	// Initialize OverlayScrollbars on the body element
	if (browser && document.body) {
		// Check if we're on mobile
		const isMobile = window.innerWidth < 768;
		
		// Add the initialization attribute to prevent flickering
		document.body.setAttribute('data-overlayscrollbars-initialize', '');
		document.documentElement.setAttribute('data-overlayscrollbars-initialize', '');
		
		// OverlayScrollbars setup with mobile-specific options
		const [initialize, instance] = useOverlayScrollbars({
			defer: true,
			options: {
				scrollbars: {
					visibility: isMobile ? 'hidden' : 'auto' // Hide scrollbar on mobile, show on desktop
				}
			}
		});
		
		// Initialize OverlayScrollbars on the body
		initialize(document.body);
	}
});
</script>

{@render children()}