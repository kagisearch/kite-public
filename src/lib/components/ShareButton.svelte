<script lang="ts">
import { flip, offset, shift, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { IconCheck, IconLoader2, IconShare } from '@tabler/icons-svelte';
import { onDestroy, onMount } from 'svelte';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { page } from '$app/state';
import { s } from '$lib/client/localization.svelte';
import { generateShareUrl } from '$lib/utils/urlShortener';

interface Props {
	title?: string;
	description?: string;
	batchId?: string | null;
	categoryId?: string | null;
	storyIndex?: number | null;
	dataLang?: string | null;
	class?: string;
}

let {
	title = s('article.shareDefaultTitle') || 'Check out this story',
	description = '',
	batchId,
	categoryId,
	storyIndex,
	dataLang,
	class: className = '',
}: Props = $props();

let showCopiedFeedback = $state(false);
let isLoading = $state(false);
let feedbackTimer: NodeJS.Timeout | undefined;

// Floating UI setup for the "Copied!" tooltip
const floating = useFloating({
	placement: 'left',
	strategy: 'fixed',
	middleware: [
		offset(8), // 8px gap from button
		flip({
			fallbackPlacements: ['right', 'top', 'bottom'],
		}), // Flip if no space
		shift({
			padding: 8,
		}), // Keep within viewport
	],
});

// Hide tooltip on scroll
function hideTooltipOnScroll() {
	if (showCopiedFeedback) {
		showCopiedFeedback = false;
		if (feedbackTimer) {
			clearTimeout(feedbackTimer);
			feedbackTimer = undefined;
		}
	}
}

// Setup scroll listener
onMount(() => {
	if (browser) {
		window.addEventListener('scroll', hideTooltipOnScroll, { passive: true });
	}
});

onDestroy(() => {
	if (browser) {
		window.removeEventListener('scroll', hideTooltipOnScroll);
	}
	if (feedbackTimer) {
		clearTimeout(feedbackTimer);
	}
});

async function handleShare() {
	if (!browser || isLoading || showCopiedFeedback) return;

	isLoading = true;

	try {
		// Generate full URL first
		const baseUrl = window.location.origin;
		const fullUrl = generateShareUrl(baseUrl, {
			batchId,
			categoryId,
			storyIndex,
			dataLang,
		});

		let shareUrl = fullUrl;

		// Try to get short URL from API
		try {
			const response = await fetch('/api/shorten', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: fullUrl,
					batchId,
					categoryId,
					storyIndex,
					languageCode: dataLang,
				}),
			});

			if (response.ok) {
				const { shortUrl } = await response.json();
				shareUrl = shortUrl;
			}
		} catch (err) {
			console.warn('Failed to shorten URL, using full URL:', err);
		}

		isLoading = false;

		// Check if mobile and Web Share API is available
		const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);

		if (isMobile && navigator.share) {
			try {
				// Format the shared text nicely
				// Include title, description, and attribution
				const shareTitle = `${title} - Kite News`;
				const shareText = description
					? `${description}\n\nRead more on Kite:`
					: `${title}\n\nRead more on Kite:`;

				await navigator.share({
					title: shareTitle,
					text: shareText,
					url: shareUrl,
				});

				// Don't show floating tooltip on mobile - native share is enough
				return;
			} catch (err) {
				// User cancelled or error occurred
				if (err instanceof Error && err.name !== 'AbortError') {
					console.error('Error sharing:', err);
				}
				// Fall through to clipboard copy if share fails
			}
		}

		// Desktop: Copy to clipboard
		try {
			await navigator.clipboard.writeText(shareUrl);

			// Show feedback
			showCopiedFeedback = true;

			// Clear any existing timer
			if (feedbackTimer) clearTimeout(feedbackTimer);

			// Hide feedback after 2 seconds
			feedbackTimer = setTimeout(() => {
				showCopiedFeedback = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy URL:', err);
			// Fallback: select and copy
			const textArea = document.createElement('textarea');
			textArea.value = shareUrl;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);

			// Show feedback
			showCopiedFeedback = true;
			feedbackTimer = setTimeout(() => {
				showCopiedFeedback = false;
			}, 2000);
		}
	} catch (error) {
		console.error('Share failed:', error);
		isLoading = false;
	}
}
</script>

<!-- Share Button (icon only) -->
<button
  bind:this={floating.elements.reference}
  onclick={handleShare}
  class="group relative flex h-10 w-10 items-center justify-center rounded-lg {className}"
  aria-label={s("article.shareStory") || "Share story"}
  title={s("article.shareStory") || "Share story"}
  disabled={isLoading}
>
  {#if isLoading}
    <!-- Loading spinner -->
    <IconLoader2
      size={20}
      stroke={2}
      class="animate-spin text-gray-500 dark:text-gray-400"
    />
  {:else}
    <!-- Share icon -->
    <IconShare
      size={20}
      stroke={2}
      class="transition-colors text-gray-600 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200"
    />
  {/if}
</button>

<!-- Floating "Copied!" feedback -->
{#if showCopiedFeedback}
  <Portal>
    <div
      bind:this={floating.elements.floating}
      class="absolute top-0 left-0 z-[2000] flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-200 dark:bg-green-700 {floating.isPositioned
        ? 'opacity-100'
        : 'opacity-0 invisible'}"
      style={floating.floatingStyles}
    >
      <IconCheck size={16} stroke={2.5} class="text-white" />
      <span>{s("article.shareCopied") || "Copied!"}</span>
    </div>
  </Portal>
{/if}

<style>
  button {
    -webkit-tap-highlight-color: transparent;
  }
</style>
