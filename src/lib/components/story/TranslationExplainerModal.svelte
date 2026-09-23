<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { ALL_LANGUAGES } from '$lib/constants/languages';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import { scrollLock } from '$lib/utils/scrollLock.js';
import { IconLanguage, IconX } from '@tabler/icons-svelte';
import Portal from 'svelte-portal';
import { fade, scale } from 'svelte/transition';

interface Props {
	visible: boolean;
	onClose: () => void;
	/** Target language code (e.g. 'et'). Looked up against ALL_LANGUAGES for the human name. */
	targetLanguageName?: string;
}

let { visible, onClose, targetLanguageName }: Props = $props();

const modal = createModalBehavior();

let dialogElement: HTMLElement | undefined = $state(undefined);
let closeButtonRef: HTMLElement | undefined = $state(undefined);
let previousActiveElement: Element | null = null;

const humanLanguageName = $derived.by(() => {
	if (!targetLanguageName) return null;
	const entry = ALL_LANGUAGES.find((l) => l.code === targetLanguageName);
	if (!entry) return targetLanguageName.toUpperCase();
	const m = entry.name.match(/\(([^)]+)\)/);
	return m?.[1] ?? entry.name;
});

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
			aria-labelledby="translation-explainer-title"
			tabindex="-1"
			transition:fade={{ duration: modal.getTransitionDuration() }}
		>
			<div
				bind:this={dialogElement}
				class="w-full max-w-lg max-h-[90vh] bg-modal-bg rounded-xl shadow-2xl overflow-y-auto"
				role="document"
				transition:scale={{ duration: modal.getTransitionDuration(), start: 0.95, opacity: 0 }}
			>
				<div class="flex items-center justify-between p-4 border-b border-primary-100">
					<div class="flex items-center gap-2">
						<IconLanguage size={20} class="text-blue-500" />
						<h2 id="translation-explainer-title" class="text-lg font-semibold text-primary">
							{s('translation.explainer.title') || 'On-demand translation'}
						</h2>
					</div>
					<button
						bind:this={closeButtonRef}
						onclick={onClose}
						class="p-1.5 text-primary-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 focus-visible-ring"
						aria-label={s('ui.close') || 'Close'}
					>
						<IconX size={20} />
					</button>
				</div>

				<!-- A miniature representation of an actual Kagi News story, with
					 its real sections (title, summary, talking points, perspectives).
					 Sections start in the source language and flip to the target
					 language one at a time, matching how on-demand SSE fills the
					 fields in. -->
				<div class="flex justify-center pt-5 pb-2" aria-hidden="true">
					<svg class="story-illustration" viewBox="0 0 320 200" width="320" height="200">
						<rect x="8" y="8" width="304" height="184" rx="10" class="story-card" />

						<!-- Title -->
						<rect
							class="field-source field-source-title"
							x="22"
							y="22"
							width="240"
							height="9"
							rx="3"
						/>
						<rect
							class="field-target field-target-title"
							x="22"
							y="22"
							width="220"
							height="9"
							rx="3"
						/>

						<!-- Short summary -->
						<rect
							class="field-source field-source-summary-1"
							x="22"
							y="42"
							width="266"
							height="5"
							rx="2"
						/>
						<rect
							class="field-source field-source-summary-2"
							x="22"
							y="52"
							width="200"
							height="5"
							rx="2"
						/>
						<rect
							class="field-target field-target-summary-1"
							x="22"
							y="42"
							width="266"
							height="5"
							rx="2"
						/>
						<rect
							class="field-target field-target-summary-2"
							x="22"
							y="52"
							width="200"
							height="5"
							rx="2"
						/>

						<text
							x="22"
							y="76"
							font-size="8"
							font-weight="600"
							class="section-label"
							letter-spacing="0.5">TALKING POINTS</text
						>

						<!-- Bullets -->
						<circle cx="26" cy="86" r="2" class="bullet" />
						<rect
							class="field-source field-source-point-1"
							x="34"
							y="84"
							width="230"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-point-1"
							x="34"
							y="84"
							width="230"
							height="4"
							rx="2"
						/>

						<circle cx="26" cy="98" r="2" class="bullet" />
						<rect
							class="field-source field-source-point-2"
							x="34"
							y="96"
							width="210"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-point-2"
							x="34"
							y="96"
							width="210"
							height="4"
							rx="2"
						/>

						<circle cx="26" cy="110" r="2" class="bullet" />
						<rect
							class="field-source field-source-point-3"
							x="34"
							y="108"
							width="180"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-point-3"
							x="34"
							y="108"
							width="180"
							height="4"
							rx="2"
						/>

						<text
							x="22"
							y="132"
							font-size="8"
							font-weight="600"
							class="section-label"
							letter-spacing="0.5">PERSPECTIVES</text
						>

						<!-- Perspective cards -->
						<rect x="22" y="140" width="134" height="32" rx="4" class="perspective-card" />
						<rect
							class="field-source field-source-persp-1a"
							x="30"
							y="148"
							width="116"
							height="4"
							rx="2"
						/>
						<rect
							class="field-source field-source-persp-1b"
							x="30"
							y="158"
							width="90"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-persp-1a"
							x="30"
							y="148"
							width="116"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-persp-1b"
							x="30"
							y="158"
							width="90"
							height="4"
							rx="2"
						/>

						<rect x="164" y="140" width="134" height="32" rx="4" class="perspective-card" />
						<rect
							class="field-source field-source-persp-2a"
							x="172"
							y="148"
							width="116"
							height="4"
							rx="2"
						/>
						<rect
							class="field-source field-source-persp-2b"
							x="172"
							y="158"
							width="80"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-persp-2a"
							x="172"
							y="148"
							width="116"
							height="4"
							rx="2"
						/>
						<rect
							class="field-target field-target-persp-2b"
							x="172"
							y="158"
							width="80"
							height="4"
							rx="2"
						/>

						<!-- Language tag -->
						<g class="lang-tag-source">
							<rect x="220" y="178" width="84" height="14" rx="7" class="lang-tag-bg-source" />
							<text
								x="262"
								y="187.5"
								text-anchor="middle"
								font-size="8"
								font-weight="600"
								class="lang-tag-text-source">SOURCE</text
							>
						</g>
						<g class="lang-tag-target">
							<rect x="220" y="178" width="84" height="14" rx="7" class="lang-tag-bg-target" />
							<text
								x="262"
								y="187.5"
								text-anchor="middle"
								font-size="8"
								font-weight="600"
								fill="white">TRANSLATED</text
							>
						</g>
					</svg>
				</div>

				<div class="px-5 pb-5 space-y-3 text-sm text-primary-600">
					<p>
						{s('translation.explainer.pretranslated') ||
							'Languages with established readership (English, Italian, French, German, Spanish, Chinese, Japanese, and others) get every story pre-translated during batch processing.'}
					</p>
					<p>
						{#if humanLanguageName}
							{s('translation.explainer.onDemandLang', { lang: humanLanguageName }) ||
								`Smaller-readership languages like ${humanLanguageName} use on-demand translation. Titles are still pre-translated so the list is browseable. Full content translates when a reader opens a story.`}
						{:else}
							{s('translation.explainer.onDemand') ||
								'Smaller-readership languages use on-demand translation. Titles are still pre-translated so the list is browseable. Full content translates when a reader opens a story.'}
						{/if}
					</p>
					<p>
						{s('translation.explainer.networkEffect') ||
							'Translations are cached for future readers. As a language gains readership, it joins the pre-translated set.'}
					</p>
				</div>
			</div>
		</div>
	</Portal>
{/if}

<style>
.story-illustration {
	overflow: visible;
	color: currentColor;
}

.story-card {
	fill: rgba(148, 163, 184, 0.05);
	stroke: rgba(148, 163, 184, 0.25);
	stroke-width: 1;
}
:global(.dark) .story-card {
	fill: rgba(148, 163, 184, 0.04);
	stroke: rgba(148, 163, 184, 0.18);
}

.perspective-card {
	fill: rgba(148, 163, 184, 0.06);
	stroke: rgba(148, 163, 184, 0.2);
	stroke-width: 0.5;
}
:global(.dark) .perspective-card {
	fill: rgba(148, 163, 184, 0.03);
	stroke: rgba(148, 163, 184, 0.15);
}

.bullet {
	fill: rgba(100, 116, 139, 0.6);
}

.section-label {
	fill: rgba(100, 116, 139, 0.7);
}
:global(.dark) .section-label {
	fill: rgba(148, 163, 184, 0.6);
}

/* Source field (grey, fades out as each section translates) */
.field-source {
	fill: rgba(100, 116, 139, 0.5);
}
:global(.dark) .field-source {
	fill: rgba(148, 163, 184, 0.4);
}

/* Target field (blue, fades in) */
.field-target {
	fill: #3b82f6;
	opacity: 0;
}
:global(.dark) .field-target {
	fill: #60a5fa;
}

/* All sections animate over the same 6s loop with animation-delay: 0
 * so they all reset at the same instant (loop boundary). The stagger
 * happens inside the keyframes via percent stops:
 *   0–X% : source visible, target hidden
 *   X→Y% : flip window
 *   Y–100%: target visible, source hidden  (then INSTANT snap at 100%→0%)
 */
.field-source-title,
.field-target-title,
.field-source-summary-1,
.field-target-summary-1,
.field-source-summary-2,
.field-target-summary-2,
.field-source-point-1,
.field-target-point-1,
.field-source-point-2,
.field-target-point-2,
.field-source-point-3,
.field-target-point-3,
.field-source-persp-1a,
.field-target-persp-1a,
.field-source-persp-1b,
.field-target-persp-1b,
.field-source-persp-2a,
.field-target-persp-2a,
.field-source-persp-2b,
.field-target-persp-2b,
.lang-tag-source,
.lang-tag-target {
	animation-duration: 6s;
	animation-iteration-count: infinite;
	animation-timing-function: ease-in-out;
	animation-delay: 0s;
}

.field-source-title {
	animation-name: src-at-6;
}
.field-target-title {
	animation-name: tgt-at-6;
}
.field-source-summary-1,
.field-source-summary-2 {
	animation-name: src-at-13;
}
.field-target-summary-1,
.field-target-summary-2 {
	animation-name: tgt-at-13;
}
.field-source-point-1 {
	animation-name: src-at-20;
}
.field-target-point-1 {
	animation-name: tgt-at-20;
}
.field-source-point-2 {
	animation-name: src-at-25;
}
.field-target-point-2 {
	animation-name: tgt-at-25;
}
.field-source-point-3 {
	animation-name: src-at-30;
}
.field-target-point-3 {
	animation-name: tgt-at-30;
}
.field-source-persp-1a,
.field-source-persp-1b {
	animation-name: src-at-37;
}
.field-target-persp-1a,
.field-target-persp-1b {
	animation-name: tgt-at-37;
}
.field-source-persp-2a,
.field-source-persp-2b {
	animation-name: src-at-44;
}
.field-target-persp-2a,
.field-target-persp-2b {
	animation-name: tgt-at-44;
}
/* Language tag flips with the title (first section) */
.lang-tag-source {
	animation-name: src-at-6;
}
.lang-tag-target {
	animation-name: tgt-at-6;
}

/* Source keyframes: visible until flip-start, hidden after flip,
 * stays hidden to 100% — the SNAP back to source happens at the
 * iteration boundary (100% → 0%), so the reset is instant. */
@keyframes src-at-6 {
	0%,
	6% {
		opacity: 1;
	}
	10%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-13 {
	0%,
	13% {
		opacity: 1;
	}
	17%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-20 {
	0%,
	20% {
		opacity: 1;
	}
	24%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-25 {
	0%,
	25% {
		opacity: 1;
	}
	29%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-30 {
	0%,
	30% {
		opacity: 1;
	}
	34%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-37 {
	0%,
	37% {
		opacity: 1;
	}
	41%,
	100% {
		opacity: 0;
	}
}
@keyframes src-at-44 {
	0%,
	44% {
		opacity: 1;
	}
	48%,
	100% {
		opacity: 0;
	}
}

/* Target keyframes: inverse — hidden until flip-start, visible after. */
@keyframes tgt-at-6 {
	0%,
	6% {
		opacity: 0;
	}
	10%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-13 {
	0%,
	13% {
		opacity: 0;
	}
	17%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-20 {
	0%,
	20% {
		opacity: 0;
	}
	24%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-25 {
	0%,
	25% {
		opacity: 0;
	}
	29%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-30 {
	0%,
	30% {
		opacity: 0;
	}
	34%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-37 {
	0%,
	37% {
		opacity: 0;
	}
	41%,
	100% {
		opacity: 1;
	}
}
@keyframes tgt-at-44 {
	0%,
	44% {
		opacity: 0;
	}
	48%,
	100% {
		opacity: 1;
	}
}

/* Language tag: SOURCE shown at start, TRANSLATED shown after the title flips */
.lang-tag-bg-source {
	fill: rgba(100, 116, 139, 0.15);
	stroke: rgba(100, 116, 139, 0.3);
	stroke-width: 0.5;
}
.lang-tag-text-source {
	fill: rgba(71, 85, 105, 0.9);
}
:global(.dark) .lang-tag-text-source {
	fill: rgba(148, 163, 184, 0.9);
}
.lang-tag-bg-target {
	fill: #3b82f6;
}
:global(.dark) .lang-tag-bg-target {
	fill: #60a5fa;
}

.lang-tag-target {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.field-source,
	.lang-tag-source {
		opacity: 0;
		animation: none;
	}
	.field-target,
	.lang-tag-target {
		opacity: 1;
		animation: none;
	}
}
</style>
