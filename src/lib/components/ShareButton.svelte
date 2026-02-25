<script lang="ts">
import { flip, offset, shift, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { IconCheck, IconLoader2, IconShare } from '@tabler/icons-svelte';
import { onDestroy, onMount } from 'svelte';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';

interface Props {
	title?: string;
	description?: string;
	batchId: string;
	categoryId: string;
	storyIndex?: number | null;
	clusterId?: number | null;
	languageCode?: string | null;
	class?: string;
}

let {
	title = s('article.shareDefaultTitle') || 'Check out this story',
	description = '',
	batchId,
	categoryId,
	storyIndex,
	clusterId,
	languageCode,
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
		// Build the payload for the shorten API - server builds the URL and calculates sequence
		const shortenPayload = {
			batchId,
			categoryId,
			clusterId: clusterId ?? undefined,
			storyIndex: storyIndex ?? undefined,
			title: title ?? undefined,
			languageCode: languageCode ?? undefined,
		};

		// Check if mobile and Web Share API is available
		const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);

		if (isMobile && navigator.share) {
			// For mobile Web Share API, fetch the short URL first
			let finalShareUrl = '';

			try {
				const response = await fetch('/api/shorten', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(shortenPayload),
				});

				if (response.ok) {
					const { shortUrl } = await response.json();
					finalShareUrl = shortUrl;
				}
			} catch (err) {
				console.error('Failed to create share URL:', err);
				isLoading = false;
				return;
			}

			isLoading = false;

			try {
				// Format the shared text nicely
				const shareTitle = `${title} - Kagi News`;
				const shareText = description
					? `${description}\n\nRead more on Kagi:`
					: `${title}\n\nRead more on Kagi:`;

				await navigator.share({
					title: shareTitle,
					text: shareText,
					url: finalShareUrl,
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

		// Desktop: Copy to clipboard with Safari-compatible approach
		// Safari requires clipboard operation to start synchronously in user gesture
		let copySuccess = false;

		if (navigator.clipboard && window.isSecureContext) {
			try {
				// Create a Promise that fetches the short URL from the API
				// Pass structured data (not a full URL) to the backend
				const urlPromise = fetch('/api/shorten', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(shortenPayload),
				})
					.then((response) => {
						if (!response.ok) throw new Error('Failed to create short URL');
						return response.json();
					})
					.then((data) => {
						if (!data.shortUrl) throw new Error('No short URL returned');
						return data.shortUrl;
					})
					.catch((err) => {
						console.error('Failed to create share URL:', err);
						throw err;
					});

				// Use ClipboardItem to pass the Promise directly to clipboard API
				// This preserves user gesture context in Safari
				const item = new ClipboardItem({
					'text/plain': urlPromise.then((url) => new Blob([url], { type: 'text/plain' })),
				});

				await navigator.clipboard.write([item]);
				copySuccess = true;
			} catch (err) {
				console.warn('ClipboardItem API failed:', err);
			}
		}

		// Fallback: Fetch URL synchronously and copy with execCommand
		if (!copySuccess) {
			try {
				const response = await fetch('/api/shorten', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(shortenPayload),
				});

				if (response.ok) {
					const { shortUrl } = await response.json();
					const textArea = document.createElement('textarea');
					textArea.value = shortUrl;
					textArea.style.position = 'fixed';
					textArea.style.top = '0';
					textArea.style.left = '-999999px';
					textArea.setAttribute('readonly', '');
					document.body.appendChild(textArea);
					textArea.select();
					textArea.setSelectionRange(0, shortUrl.length);
					copySuccess = document.execCommand('copy');
					document.body.removeChild(textArea);
				}
			} catch (execErr) {
				console.error('All clipboard methods failed:', execErr);
			}
		}

		isLoading = false;

		if (copySuccess) {
			// Show feedback
			showCopiedFeedback = true;

			// Clear any existing timer
			if (feedbackTimer) clearTimeout(feedbackTimer);

			// Hide feedback after 2 seconds
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
      class="absolute top-0 left-0 z-tooltip flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-200 dark:bg-green-700 {floating.isPositioned
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
