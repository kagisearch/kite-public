<script lang="ts">
import { IconArrowUp } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';
import { displaySettings } from '$lib/data/settings.svelte.js';

let visible = $state(false);
let isScrolling = false;
let scrollStartTime = 0;
let scrollStartPosition = 0;
let animationFrame: number | null = null;

function handleScroll() {
	if (!isScrolling) {
		const scrollY = window.scrollY;
		const scrollHeight = document.documentElement.scrollHeight;
		const clientHeight = window.innerHeight;
		const scrollProgress = scrollY / (scrollHeight - clientHeight);

		// On mobile (window width < 768px), only show when near the end (80% scrolled)
		// On desktop, show after 500px
		const isMobile = window.innerWidth < 768;

		if (isMobile) {
			visible = scrollProgress > 0.8;
		} else {
			visible = scrollY > 500;
		}
	}
}

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function scrollToTop() {
	isScrolling = true;
	scrollStartTime = performance.now();
	scrollStartPosition = window.scrollY;

	const duration = 300; // 300ms for faster scrolling

	function animateScroll(currentTime: number) {
		const elapsed = currentTime - scrollStartTime;
		const progress = Math.min(elapsed / duration, 1);
		const easeProgress = easeInOutCubic(progress);

		window.scrollTo(0, scrollStartPosition * (1 - easeProgress));

		if (progress < 1) {
			animationFrame = requestAnimationFrame(animateScroll);
		} else {
			isScrolling = false;
			visible = false;
			animationFrame = null;
		}
	}

	animationFrame = requestAnimationFrame(animateScroll);
}

onMount(() => {
	window.addEventListener('scroll', handleScroll, { passive: true });
	return () => {
		window.removeEventListener('scroll', handleScroll);
	};
});
</script>

{#if displaySettings.categoryHeaderPosition === "bottom"}
  <!-- When header is at bottom on mobile, position button above it -->
  <button
    class="fixed bottom-8 end-8 w-12 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 z-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 max-md:bottom-20 max-md:end-6 max-md:w-11 max-md:h-11"
    class:opacity-0={!visible}
    class:invisible={!visible}
    class:opacity-100={visible}
    class:visible
    onclick={scrollToTop}
    aria-label={s("navigation.backToTop")}
    title={s("navigation.backToTop")}
  >
    <IconArrowUp class="w-6 h-6 text-gray-700 dark:text-gray-300" />
  </button>
{:else}
  <!-- When header is at top on mobile, normal positioning -->
  <button
    class="fixed bottom-8 end-8 w-12 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 z-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 max-md:bottom-6 max-md:end-6 max-md:w-11 max-md:h-11"
    class:opacity-0={!visible}
    class:invisible={!visible}
    class:opacity-100={visible}
    class:visible
    onclick={scrollToTop}
    aria-label={s("navigation.backToTop")}
    title={s("navigation.backToTop")}
  >
    <IconArrowUp class="w-6 h-6 text-gray-700 dark:text-gray-300" />
  </button>
{/if}
