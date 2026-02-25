<script lang="ts">
import { IconBrandGithub, IconExternalLink, IconX } from '@tabler/icons-svelte';
import { fade, scale } from 'svelte/transition';
import Portal from 'svelte-portal';
import { s } from '$lib/client/localization.svelte';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import { scrollLock } from '$lib/utils/scrollLock.js';

interface Props {
	visible: boolean;
	onClose: () => void;
}

let { visible, onClose }: Props = $props();

const modal = createModalBehavior();

let dialogElement: HTMLElement | undefined = $state(undefined);
let closeButtonRef: HTMLElement | undefined = $state(undefined);
let previousActiveElement: Element | null = null;

const KITE_PUBLIC_URL = 'https://github.com/kagisearch/kite-public';

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		onClose();
		return;
	}

	if (e.key === 'Tab' && dialogElement) {
		const focusableElements = Array.from(
			dialogElement.querySelectorAll(
				'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]',
			),
		) as HTMLElement[];

		if (focusableElements.length === 0) return;

		const first = focusableElements[0];
		const last = focusableElements[focusableElements.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
}

$effect(() => {
	if (typeof document === 'undefined') return;

	if (visible) {
		previousActiveElement = document.activeElement;
		scrollLock.lock();
		requestAnimationFrame(() => {
			closeButtonRef?.focus();
		});

		return () => {
			scrollLock.unlock();
			if (previousActiveElement && 'focus' in previousActiveElement) {
				(previousActiveElement as HTMLElement).focus();
			}
		};
	}
});
</script>

{#if visible}
	<Portal>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="fixed inset-0 z-modal flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
			onclick={(e) => modal.handleBackdropClick(e, onClose)}
			onkeydown={handleKeydown}
			role="dialog"
			aria-modal="true"
			aria-labelledby="clustering-title"
			tabindex="-1"
			transition:fade={{ duration: modal.getTransitionDuration() }}
		>
			<div
				bind:this={dialogElement}
				class="w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-y-auto"
				role="document"
				transition:scale={{ duration: modal.getTransitionDuration(), start: 0.95, opacity: 0 }}
			>
				<!-- Header -->
				<div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 id="clustering-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{s("stories.clusteringModal.title") || "How stories are generated"}
					</h2>
					<button
						bind:this={closeButtonRef}
						onclick={onClose}
						class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible-ring"
						aria-label={s("ui.close") || "Close"}
					>
						<IconX size={20} />
					</button>
				</div>

				<!-- Content -->
				<div class="p-5 space-y-5">
					<!-- Clustering animation -->
					<div class="flex justify-center" aria-hidden="true">
						<svg class="clustering-illustration" viewBox="0 0 280 120" width="280" height="120">
							<!-- Group A: will cluster (left) -->
							<circle class="dot dot-cluster-a dot-a1" cx="30" cy="20" r="6" fill="#3b82f6" opacity="0.7" />
							<circle class="dot dot-cluster-a dot-a2" cx="80" cy="90" r="6" fill="#6366f1" opacity="0.7" />
							<circle class="dot dot-cluster-a dot-a3" cx="50" cy="55" r="6" fill="#8b5cf6" opacity="0.7" />
							<circle class="dot dot-cluster-a dot-a4" cx="15" cy="70" r="5" fill="#a78bfa" opacity="0.6" />
							<circle class="dot dot-cluster-a dot-a5" cx="75" cy="30" r="5" fill="#818cf8" opacity="0.6" />

							<!-- Group B: will cluster (right) -->
							<circle class="dot dot-cluster-b dot-b1" cx="200" cy="25" r="6" fill="#10b981" opacity="0.7" />
							<circle class="dot dot-cluster-b dot-b2" cx="250" cy="80" r="6" fill="#14b8a6" opacity="0.7" />
							<circle class="dot dot-cluster-b dot-b3" cx="220" cy="65" r="6" fill="#06b6d4" opacity="0.7" />
							<circle class="dot dot-cluster-b dot-b4" cx="265" cy="35" r="5" fill="#34d399" opacity="0.6" />

							<!-- Unclustered: will fade out -->
							<circle class="dot dot-lone dot-l1" cx="140" cy="30" r="5" fill="#f59e0b" opacity="0.7" />
							<circle class="dot dot-lone dot-l2" cx="150" cy="100" r="5" fill="#ef4444" opacity="0.7" />
							<circle class="dot dot-lone dot-l3" cx="125" cy="70" r="4" fill="#f97316" opacity="0.6" />

							<!-- Cluster rings -->
							<circle class="cluster-ring ring-a" cx="55" cy="55" r="26" fill="none" stroke="#6366f1" stroke-width="1.5" opacity="0" />
							<circle class="cluster-ring ring-b" cx="228" cy="52" r="24" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0" />

							<!-- Labels -->
							<text class="cluster-label label-a" x="55" y="92" text-anchor="middle" font-size="9" fill="#6366f1" opacity="0">story</text>
							<text class="cluster-label label-b" x="228" y="87" text-anchor="middle" font-size="9" fill="#10b981" opacity="0">story</text>
						</svg>
					</div>

					<div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
						<p>
							{s("stories.clusteringModal.communityFeedsDescription") || "The RSS feeds for this category are put together by community members, not the Kagi team."}
						</p>
						<p>
							{s("stories.clusteringModal.clusteringDescription") || "When articles from different feeds cover the same topic, they get grouped into a story. The more feeds that pick up on something, the stronger the signal."}
						</p>
						<p>
							{s("stories.clusteringModal.noClusterDescription") || "If feeds don't have enough overlap in what they're covering, no clusters form and no stories show up. This is normal and happens more with niche or regional categories."}
						</p>
						<p>
							{s("stories.clusteringModal.fullyAutomaticDescription") || "Nobody picks or chooses what appears. The whole process runs automatically, from pulling in feeds to clustering to writing summaries."}
						</p>
					</div>

					<!-- Divider -->
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
						</div>
						<div class="relative flex justify-center text-xs">
							<span class="px-2 bg-white dark:bg-gray-800 text-gray-500">
								{s("stories.clusteringModal.helpImprove") || "Help improve this category"}
							</span>
						</div>
					</div>

					<!-- Call to action -->
					<div class="text-center space-y-2">
						<p class="text-sm text-gray-600 dark:text-gray-400">
							{s("stories.clusteringModal.helpImproveDescription") || "Adding more feeds makes clustering work better. You can suggest new ones on GitHub."}
						</p>
						<a
							href={KITE_PUBLIC_URL}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible-ring"
						>
							<IconBrandGithub size={18} />
							{s("stories.clusteringModal.suggestFeeds") || "Suggest feeds on GitHub"}
							<IconExternalLink size={14} class="opacity-70" />
						</a>
					</div>
				</div>
			</div>
		</div>
	</Portal>
{/if}

<style>
	/* Group A keyframes: converge toward (55, 55) */
	@keyframes cluster-a1 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(25px, 35px); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-a2 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(-25px, -35px); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-a3 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(5px, 0); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-a4 {
		0%, 15% { transform: translate(0, 0); opacity: 0.6; }
		50%, 75% { transform: translate(40px, -15px); opacity: 0.9; }
		90%, 100% { transform: translate(0, 0); opacity: 0.6; }
	}
	@keyframes cluster-a5 {
		0%, 15% { transform: translate(0, 0); opacity: 0.6; }
		50%, 75% { transform: translate(-20px, 25px); opacity: 0.9; }
		90%, 100% { transform: translate(0, 0); opacity: 0.6; }
	}

	/* Group B keyframes: converge toward (228, 52) */
	@keyframes cluster-b1 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(28px, 27px); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-b2 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(-22px, -28px); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-b3 {
		0%, 15% { transform: translate(0, 0); opacity: 0.7; }
		50%, 75% { transform: translate(8px, -13px); opacity: 1; }
		90%, 100% { transform: translate(0, 0); opacity: 0.7; }
	}
	@keyframes cluster-b4 {
		0%, 15% { transform: translate(0, 0); opacity: 0.6; }
		50%, 75% { transform: translate(-37px, 17px); opacity: 0.9; }
		90%, 100% { transform: translate(0, 0); opacity: 0.6; }
	}

	/* Lone dots: dim slightly and drift in place */
	@keyframes lone-l1 {
		0%, 15% { opacity: 0.7; transform: translate(0, 0); }
		50%, 75% { opacity: 0.35; transform: translate(4px, -6px); }
		90%, 100% { opacity: 0.7; transform: translate(0, 0); }
	}
	@keyframes lone-l2 {
		0%, 15% { opacity: 0.7; transform: translate(0, 0); }
		50%, 75% { opacity: 0.35; transform: translate(-5px, 4px); }
		90%, 100% { opacity: 0.7; transform: translate(0, 0); }
	}
	@keyframes lone-l3 {
		0%, 20% { opacity: 0.6; transform: translate(0, 0); }
		55%, 75% { opacity: 0.3; transform: translate(6px, 5px); }
		90%, 100% { opacity: 0.6; transform: translate(0, 0); }
	}

	/* Rings and labels */
	@keyframes ring-appear {
		0%, 30% { opacity: 0; transform: scale(0.5); }
		50%, 75% { opacity: 0.5; transform: scale(1); }
		90%, 100% { opacity: 0; transform: scale(0.5); }
	}
	@keyframes label-appear {
		0%, 35% { opacity: 0; }
		55%, 75% { opacity: 0.8; }
		90%, 100% { opacity: 0; }
	}

	.dot-a1 { animation: cluster-a1 7s ease-in-out infinite; }
	.dot-a2 { animation: cluster-a2 7s ease-in-out infinite; }
	.dot-a3 { animation: cluster-a3 7s ease-in-out infinite; }
	.dot-a4 { animation: cluster-a4 7s ease-in-out infinite; }
	.dot-a5 { animation: cluster-a5 7s ease-in-out infinite; }
	.dot-b1 { animation: cluster-b1 7s ease-in-out infinite; }
	.dot-b2 { animation: cluster-b2 7s ease-in-out infinite; }
	.dot-b3 { animation: cluster-b3 7s ease-in-out infinite; }
	.dot-b4 { animation: cluster-b4 7s ease-in-out infinite; }
	.dot-l1 { animation: lone-l1 7s ease-in-out infinite; }
	.dot-l2 { animation: lone-l2 7s 0.3s ease-in-out infinite; }
	.dot-l3 { animation: lone-l3 7s 0.5s ease-in-out infinite; }
	.ring-a, .ring-b { animation: ring-appear 7s ease-in-out infinite; transform-origin: center; }
	.label-a, .label-b { animation: label-appear 7s ease-in-out infinite; }

	@media (prefers-reduced-motion: reduce) {
		.dot, .cluster-ring, .cluster-label {
			animation: none !important;
		}
		.dot-a1 { transform: translate(25px, 35px); opacity: 1; }
		.dot-a2 { transform: translate(-25px, -35px); opacity: 1; }
		.dot-a3 { transform: translate(5px, 0); opacity: 1; }
		.dot-a4 { transform: translate(40px, -15px); opacity: 0.9; }
		.dot-a5 { transform: translate(-20px, 25px); opacity: 0.9; }
		.dot-b1 { transform: translate(28px, 27px); opacity: 1; }
		.dot-b2 { transform: translate(-22px, -28px); opacity: 1; }
		.dot-b3 { transform: translate(8px, -13px); opacity: 1; }
		.dot-b4 { transform: translate(-37px, 17px); opacity: 0.9; }
		.dot-l1 { opacity: 0.35; transform: translate(4px, -6px); }
		.dot-l2 { opacity: 0.35; transform: translate(-5px, 4px); }
		.dot-l3 { opacity: 0.3; transform: translate(6px, 5px); }
		.ring-a, .ring-b { opacity: 0.5; transform: scale(1); }
		.label-a, .label-b { opacity: 0.8; }
	}
</style>
