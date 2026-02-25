<script lang="ts">
import {
	IconBrandGithub,
	IconCheck,
	IconExternalLink,
	IconFilter,
	IconRss,
	IconServer,
	IconUsers,
	IconX,
} from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';

interface Props {
	onComplete: () => void;
}

let { onComplete }: Props = $props();

// Svelte action: fade-up elements when they scroll into view
function reveal(node: HTMLElement) {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('revealed');
					observer.unobserve(node);
				}
			}
		},
		{ threshold: 0.1, rootMargin: '-20px' },
	);
	observer.observe(node);
	return {
		destroy() {
			observer.disconnect();
		},
	};
}

// Bipartite flow animation — feeds (left) → story clusters (right)
const BIP_FEEDS = [
	{ x: 30, y: 8, r: 4, color: '#6366f1', story: 0 },
	{ x: 75, y: 18, r: 4.5, color: '#8b5cf6', story: 0 },
	{ x: 22, y: 32, r: 4, color: '#818cf8', story: 0 },
	{ x: 85, y: 40, r: 4, color: '#a78bfa', story: 1 },
	{ x: 35, y: 54, r: 4.5, color: '#7c3aed', story: 1 },
	{ x: 78, y: 58, r: 4, color: '#4f46e5', story: 1 },
	{ x: 28, y: 74, r: 4, color: '#c084fc', story: 2 },
	{ x: 72, y: 78, r: 4.5, color: '#6366f1', story: 1 },
	{ x: 22, y: 94, r: 4, color: '#818cf8', story: 2 },
	{ x: 82, y: 104, r: 4, color: '#a78bfa', story: 2 },
];
const BIP_STORIES = [
	{ x: 395, y: 20, r: 8, color: '#3b82f6' },
	{ x: 385, y: 58, r: 10, color: '#10b981' },
	{ x: 400, y: 98, r: 8, color: '#06b6d4' },
];
const BIP_YOU = { x: 50, y: 120, r: 5, color: '#f59e0b', story: 1 };

// Precompute feed→story connection lines
const BIP_LINES = BIP_FEEDS.map((feed, i) => {
	const story = BIP_STORIES[feed.story];
	const dx = story.x - feed.x;
	const dy = story.y - feed.y;
	return {
		index: i,
		x1: feed.x,
		y1: feed.y,
		x2: story.x,
		y2: story.y,
		length: Math.ceil(Math.sqrt(dx * dx + dy * dy)),
		color: feed.color,
	};
});
const BIP_YOU_LINE = (() => {
	const story = BIP_STORIES[BIP_YOU.story];
	const dx = story.x - BIP_YOU.x;
	const dy = story.y - BIP_YOU.y;
	return {
		x1: BIP_YOU.x,
		y1: BIP_YOU.y,
		x2: story.x,
		y2: story.y,
		length: Math.ceil(Math.sqrt(dx * dx + dy * dy)),
	};
})();

function buildNetworkCSS(): string {
	const dur = 12;
	let css = '';

	const feedStart = (i: number) => 4 + i * 2.5;
	const lineStart = (i: number) => feedStart(i) + 2;
	const lineDrawEnd = (i: number) => lineStart(i) + 10;
	const youStart = 42;
	const holdEnd = 65;
	const fadeEnd = 80;

	// Feed node keyframes (pop in staggered)
	for (let i = 0; i < BIP_FEEDS.length; i++) {
		const s = feedStart(i);
		css += `@keyframes bf${i}{0%,${s}%{transform:scale(0);opacity:0}${s + 2}%{transform:scale(1.3);opacity:.8}${s + 3}%{transform:scale(1);opacity:.7}${holdEnd}%{transform:scale(1);opacity:.7}${fadeEnd}%,100%{transform:scale(0);opacity:0}}`;
	}

	// Line drawing keyframes (stroke-dashoffset from length to 0)
	for (let i = 0; i < BIP_LINES.length; i++) {
		const s = lineStart(i);
		const e = lineDrawEnd(i);
		const len = BIP_LINES[i].length;
		css += `@keyframes bl${i}{0%,${s}%{stroke-dashoffset:${len};opacity:0}${s + 1}%{opacity:.2}${e}%{stroke-dashoffset:0;opacity:.25}${holdEnd}%{stroke-dashoffset:0;opacity:.25}${fadeEnd}%{opacity:0}100%{stroke-dashoffset:${len};opacity:0}}`;
	}

	// Story node keyframes — appear when first connected line starts arriving
	const storyFirstFeed = [0, 3, 6];
	for (const si of [0, 2]) {
		const appear = lineDrawEnd(storyFirstFeed[si]) - 3;
		const full = appear + 8;
		css += `@keyframes bs${si}{0%,${appear}%{transform:scale(0);opacity:0}${full}%{transform:scale(1);opacity:.6}${holdEnd}%{transform:scale(1);opacity:.6}${fadeEnd}%,100%{transform:scale(0);opacity:0}}`;
	}

	// Story 1 — extra pulse when "you" connects
	const s1Appear = lineDrawEnd(storyFirstFeed[1]) - 3;
	const s1Full = s1Appear + 8;
	const youLineArrival = youStart + 10;
	css += `@keyframes bs1{0%,${s1Appear}%{transform:scale(0);opacity:0}${s1Full}%{transform:scale(1);opacity:.6}${youLineArrival}%{transform:scale(1);opacity:.6}${youLineArrival + 2}%{transform:scale(1.3);opacity:.8}${youLineArrival + 4}%{transform:scale(1.1);opacity:.7}${holdEnd}%{transform:scale(1.1);opacity:.7}${fadeEnd}%,100%{transform:scale(0);opacity:0}}`;

	// "You" node keyframe
	css += `@keyframes bf-you{0%,${youStart}%{transform:scale(0);opacity:0}${youStart + 2}%{transform:scale(1.5);opacity:1}${youStart + 4}%{transform:scale(1);opacity:.9}${holdEnd}%{transform:scale(1);opacity:.9}${fadeEnd}%,100%{transform:scale(0);opacity:0}}`;

	// "You" line (simple fade — stroke-dasharray used for visual dashing)
	const yls = youStart + 3;
	css += `@keyframes bl-you{0%,${yls}%{opacity:0}${yls + 3}%{opacity:.35}${holdEnd}%{opacity:.35}${fadeEnd}%,100%{opacity:0}}`;

	// Labels
	const lblStart = lineDrawEnd(0) - 2;
	css += `@keyframes blbl-stories{0%,${lblStart}%{opacity:0}${lblStart + 4}%{opacity:.6}${holdEnd}%{opacity:.6}${fadeEnd}%,100%{opacity:0}}`;
	css += `@keyframes blbl-you{0%,${youStart + 3}%{opacity:0}${youStart + 6}%{opacity:.8}${holdEnd}%{opacity:.8}${fadeEnd}%,100%{opacity:0}}`;

	// Class → animation assignments
	for (let i = 0; i < BIP_FEEDS.length; i++) {
		css += `.bfeed-${i}{animation:bf${i} ${dur}s ease-out infinite}`;
	}
	for (let i = 0; i < BIP_LINES.length; i++) {
		css += `.bline-${i}{animation:bl${i} ${dur}s ease-out infinite}`;
	}
	for (let i = 0; i < BIP_STORIES.length; i++) {
		css += `.bstory-${i}{animation:bs${i} ${dur}s ease-out infinite}`;
	}
	css += `.bfeed-you{animation:bf-you ${dur}s ease-out infinite}`;
	css += `.bline-you{animation:bl-you ${dur}s ease-out infinite}`;
	css += `.blabel-stories{animation:blbl-stories ${dur}s ease-out infinite}`;
	css += `.blabel-you{animation:blbl-you ${dur}s ease-out infinite}`;

	return css;
}

const networkCSS = buildNetworkCSS();
</script>

<div class="min-h-screen bg-app-bg">
	<!-- Skip link -->
	<button
		onclick={onComplete}
		class="fixed top-5 right-5 z-10 text-sm text-primary-400 hover:text-primary-600 transition-colors"
	>
		{s('contribute.onboarding.skip')} &rarr;
	</button>

	<!-- Header -->
	<header class="pt-16 pb-10 px-5 text-center hero-fade">
		<img src="/favicon.svg" alt="" class="w-14 h-14 mx-auto mb-5" />
		<h1
			class="text-3xl md:text-4xl font-bold text-primary"
		>
			{s('contribute.onboarding.title')}
		</h1>
		<p class="mt-2 text-base text-primary-600 max-w-lg mx-auto">
			{s('contribute.onboarding.subtitle')}
		</p>
	</header>

	<div class="max-w-2xl mx-auto px-5 pb-20 space-y-12">
		<!-- How stories get made -->
		<section use:reveal class="reveal-section">
			<h2
				class="text-lg font-semibold text-primary mb-5"
			>
				{s('contribute.onboarding.pipeline.title')}
			</h2>

			<div class="space-y-6">
				<!-- Step 1 -->
				<div class="flex items-start gap-3">
					<div
						class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5"
					>
						1
					</div>
					<div>
						<h3
							class="text-sm font-semibold text-primary"
						>
							{s('contribute.onboarding.pipeline.step1.title')}
						</h3>
						<p
							class="text-sm text-primary-600 leading-relaxed"
						>
							{s('contribute.onboarding.pipeline.step1.description')}
						</p>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="flex items-start gap-3">
					<div
						class="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5"
					>
						2
					</div>
					<div>
						<h3
							class="text-sm font-semibold text-primary"
						>
							{s('contribute.onboarding.pipeline.step2.title')}
						</h3>
						<p
							class="text-sm text-primary-600 leading-relaxed"
						>
							{s('contribute.onboarding.pipeline.step2.description')}
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="flex items-start gap-3">
					<div
						class="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5"
					>
						3
					</div>
					<div>
						<h3
							class="text-sm font-semibold text-primary"
						>
							{s('contribute.onboarding.pipeline.step3.title')}
						</h3>
						<p
							class="text-sm text-primary-600 leading-relaxed"
						>
							{s('contribute.onboarding.pipeline.step3.description')}
						</p>
					</div>
				</div>
			</div>

			<!-- Clustering animation -->
			<div
				class="mt-6 flex justify-center bg-primary-50 rounded-lg py-6"
				aria-hidden="true"
			>
				<svg
					class="clustering-illustration"
					viewBox="0 0 280 120"
					width="300"
					height="129"
				>
					<circle class="dot dot-a1" cx="30" cy="20" r="6" fill="#3b82f6" opacity="0.7" />
					<circle class="dot dot-a2" cx="80" cy="90" r="6" fill="#6366f1" opacity="0.7" />
					<circle class="dot dot-a3" cx="50" cy="55" r="6" fill="#8b5cf6" opacity="0.7" />
					<circle class="dot dot-a4" cx="15" cy="70" r="5" fill="#a78bfa" opacity="0.6" />
					<circle class="dot dot-a5" cx="75" cy="30" r="5" fill="#818cf8" opacity="0.6" />
					<circle class="dot dot-b1" cx="200" cy="25" r="6" fill="#10b981" opacity="0.7" />
					<circle class="dot dot-b2" cx="250" cy="80" r="6" fill="#14b8a6" opacity="0.7" />
					<circle class="dot dot-b3" cx="220" cy="65" r="6" fill="#06b6d4" opacity="0.7" />
					<circle class="dot dot-b4" cx="265" cy="35" r="5" fill="#34d399" opacity="0.6" />
					<circle class="dot dot-l1" cx="140" cy="30" r="5" fill="#f59e0b" opacity="0.7" />
					<circle class="dot dot-l2" cx="150" cy="100" r="5" fill="#ef4444" opacity="0.7" />
					<circle class="dot dot-l3" cx="125" cy="70" r="4" fill="#f97316" opacity="0.6" />
					<circle class="cluster-ring ring-a" cx="55" cy="55" r="26" fill="none" stroke="#6366f1" stroke-width="1.5" opacity="0" />
					<circle class="cluster-ring ring-b" cx="228" cy="52" r="24" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0" />
					<text class="cluster-label label-a" x="55" y="92" text-anchor="middle" font-size="9" fill="#6366f1" opacity="0">story</text>
					<text class="cluster-label label-b" x="228" y="87" text-anchor="middle" font-size="9" fill="#10b981" opacity="0">story</text>
				</svg>
			</div>

			<p
				class="mt-4 text-xs text-primary-400 italic text-center"
			>
				{s('contribute.onboarding.pipeline.note')}
			</p>
		</section>

		<hr class="border-primary-200" />

		<!-- Community-driven nature -->
		<section use:reveal class="reveal-section">
			<h2
				class="text-lg font-semibold text-primary mb-3"
			>
				{s('contribute.onboarding.community.title')}
			</h2>
			<div class="space-y-3 text-sm text-primary-600 leading-relaxed">
				<p>{s('contribute.onboarding.community.description')}</p>
				<p>{s('contribute.onboarding.community.whyXnotY')}</p>
				<p>{s('contribute.onboarding.community.noStories')}</p>
			</div>

			<!-- Feed → story flow animation -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- eslint-disable svelte/no-at-html-tags -->
			{@html `<style>${networkCSS}</style>`}
			<div
				class="mt-5 bg-primary-50 rounded-lg py-5 px-2"
				aria-hidden="true"
			>
				<svg class="network-illustration" viewBox="0 0 460 135" width="100%" preserveAspectRatio="xMidYMid meet">
					<!-- Feed → story connection lines (drawn left-to-right) -->
					{#each BIP_LINES as line}
						<line
							class="bline bline-{line.index}"
							x1={line.x1}
							y1={line.y1}
							x2={line.x2}
							y2={line.y2}
							stroke={line.color}
							stroke-width="1"
							stroke-dasharray={line.length}
							opacity="0"
						/>
					{/each}

					<!-- "You" → story line (visually dashed) -->
					<line
						class="bline bline-you"
						x1={BIP_YOU_LINE.x1}
						y1={BIP_YOU_LINE.y1}
						x2={BIP_YOU_LINE.x2}
						y2={BIP_YOU_LINE.y2}
						stroke={BIP_YOU.color}
						stroke-width="1.5"
						stroke-dasharray="4 3"
						opacity="0"
					/>

					<!-- Story cluster nodes (right side) -->
					{#each BIP_STORIES as story, i}
						<circle class="bstory bstory-{i}" cx={story.x} cy={story.y} r={story.r} fill={story.color} opacity="0" />
					{/each}

					<!-- Feed nodes (left side) -->
					{#each BIP_FEEDS as feed, i}
						<circle class="bfeed bfeed-{i}" cx={feed.x} cy={feed.y} r={feed.r} fill={feed.color} opacity="0" />
					{/each}

					<!-- "You" node -->
					<circle class="bfeed bfeed-you" cx={BIP_YOU.x} cy={BIP_YOU.y} r={BIP_YOU.r} fill={BIP_YOU.color} opacity="0" />

					<!-- Labels -->
					<text class="blabel blabel-stories" x="420" y="60" text-anchor="start" font-size="8" fill="#6b7280" opacity="0">{s('contribute.onboarding.community.networkLabelStories')}</text>
					<text class="blabel blabel-you" x={BIP_YOU.x + 12} y={BIP_YOU.y + 3} text-anchor="start" font-size="8" fill={BIP_YOU.color} opacity="0">{s('contribute.onboarding.community.networkLabelYou')}</text>
				</svg>
			</div>

			<p
				class="mt-3 text-xs text-primary-400 italic text-center"
			>
				{s('contribute.onboarding.community.networkNote')}
			</p>
		</section>

		<hr class="border-primary-200" />

		<!-- Two kinds of feeds -->
		<section use:reveal class="reveal-section">
			<h2
				class="text-lg font-semibold text-primary mb-4"
			>
				{s('contribute.onboarding.feedTypes.title')}
			</h2>
			<div class="grid sm:grid-cols-2 gap-4">
				<div
					class="border border-primary-200 rounded-lg p-4"
				>
					<div class="flex items-center gap-2 mb-2">
						<IconServer
							size={16}
							class="text-blue-500"
						/>
						<h3
							class="text-sm font-semibold text-primary"
						>
							{s('contribute.onboarding.feedTypes.core.title')}
						</h3>
					</div>
					<p
						class="text-xs text-primary-600 leading-relaxed"
					>
						{s('contribute.onboarding.feedTypes.core.description')}
					</p>
				</div>
				<div
					class="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-4"
				>
					<div class="flex items-center gap-2 mb-2">
						<IconUsers
							size={16}
							class="text-blue-600 dark:text-blue-400"
						/>
						<h3
							class="text-sm font-semibold text-primary"
						>
							{s('contribute.onboarding.feedTypes.community.title')}
						</h3>
					</div>
					<p
						class="text-xs text-primary-600 leading-relaxed"
					>
						{s('contribute.onboarding.feedTypes.community.description')}
					</p>
				</div>
			</div>
		</section>

		<hr class="border-primary-200" />

		<!-- What you can contribute -->
		<section use:reveal class="reveal-section">
			<h2
				class="text-lg font-semibold text-primary mb-4"
			>
				{s('contribute.onboarding.whatToDo.title')}
			</h2>
			<div class="space-y-4">
				<div>
					<h3
						class="text-sm font-semibold text-primary mb-1"
					>
						{s('contribute.onboarding.whatToDo.existing.title')}
					</h3>
					<p
						class="text-sm text-primary-600 leading-relaxed"
					>
						{s('contribute.onboarding.whatToDo.existing.description')}
					</p>
				</div>
				<div>
					<h3
						class="text-sm font-semibold text-primary mb-1"
					>
						{s('contribute.onboarding.whatToDo.new.title')}
					</h3>
					<p
						class="text-sm text-primary-600 leading-relaxed"
					>
						{s('contribute.onboarding.whatToDo.new.description')}
					</p>
				</div>
			</div>
		</section>

		<hr class="border-primary-200" />

		<!-- Feed guidelines -->
		<section use:reveal class="reveal-section">
			<h2
				class="text-lg font-semibold text-primary mb-4"
			>
				{s('contribute.onboarding.guidelines.title')}
			</h2>
			<ul class="space-y-3">
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconRss size={15} class="shrink-0 mt-0.5 text-blue-500" />
					<span>{s('contribute.onboarding.guidelines.rssOnly')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconCheck size={15} class="shrink-0 mt-0.5 text-green-500" />
					<span>{s('contribute.onboarding.guidelines.working')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconCheck size={15} class="shrink-0 mt-0.5 text-green-500" />
					<span>{s('contribute.onboarding.guidelines.quality')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconCheck size={15} class="shrink-0 mt-0.5 text-green-500" />
					<span>{s('contribute.onboarding.guidelines.anyLanguage')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconFilter size={15} class="shrink-0 mt-0.5 text-amber-500" />
					<span>{s('contribute.onboarding.guidelines.topicSpecific')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconX size={15} class="shrink-0 mt-0.5 text-red-400" />
					<span>{s('contribute.onboarding.guidelines.noLanguageSplit')}</span>
				</li>
				<li class="flex items-start gap-2.5 text-sm text-primary-600">
					<IconRss size={15} class="shrink-0 mt-0.5 text-blue-500" />
					<span>{s('contribute.onboarding.guidelines.minimum')}</span>
				</li>
			</ul>
		</section>

		<!-- CTA -->
		<section use:reveal class="reveal-section text-center pt-4">
			<button
				onclick={onComplete}
				class="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-base"
			>
				{s('contribute.onboarding.cta')}
				<span class="text-lg">&rarr;</span>
			</button>
		</section>

		<!-- Source link -->
		<div class="text-center text-xs text-primary-400 pt-2">
			<a
				href="https://github.com/kagisearch/kite-public"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 hover:text-primary-600"
			>
				<IconBrandGithub size={13} />
				kagisearch/kite-public
				<IconExternalLink size={11} />
			</a>
		</div>
	</div>
</div>

<style>
	/* Hero entrance animation */
	.hero-fade {
		opacity: 0;
		transform: translateY(16px);
		animation: hero-enter 0.6s ease-out forwards;
	}

	@keyframes hero-enter {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Scroll-reveal sections */
	.reveal-section {
		opacity: 0;
		transform: translateY(24px);
		transition:
			opacity 0.5s ease-out,
			transform 0.5s ease-out;
	}
	.reveal-section:global(.revealed) {
		opacity: 1;
		transform: translateY(0);
	}

	/* === Clustering SVG animation === */
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

	/* === Bipartite flow animation (feeds → stories) === */
	.bfeed, .bstory {
		transform-box: fill-box;
		transform-origin: center;
	}

	/* Pause animations until their section scrolls into view */
	.reveal-section .dot,
	.reveal-section .cluster-ring,
	.reveal-section .cluster-label,
	.reveal-section .bfeed,
	.reveal-section .bline,
	.reveal-section .bstory,
	.reveal-section .blabel {
		animation-play-state: paused;
	}
	.reveal-section:global(.revealed) .dot,
	.reveal-section:global(.revealed) .cluster-ring,
	.reveal-section:global(.revealed) .cluster-label,
	.reveal-section:global(.revealed) .bfeed,
	.reveal-section:global(.revealed) .bline,
	.reveal-section:global(.revealed) .bstory,
	.reveal-section:global(.revealed) .blabel {
		animation-play-state: running;
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-fade { opacity: 1; transform: none; animation: none; }
		.reveal-section { opacity: 1; transform: none; transition: none; }
		.dot, .cluster-ring, .cluster-label { animation: none !important; }
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
		/* Bipartite flow: show fully connected state */
		.bfeed, .bline, .bstory, .blabel { animation: none !important; }
		.bfeed { opacity: 0.7; transform: scale(1); }
		.bfeed-you { opacity: 0.9; transform: scale(1); }
		.bline { opacity: 0.25; stroke-dashoffset: 0; }
		.bline-you { opacity: 0.35; }
		.bstory { opacity: 0.6; transform: scale(1); }
		.blabel { opacity: 0.6; }
	}
</style>
