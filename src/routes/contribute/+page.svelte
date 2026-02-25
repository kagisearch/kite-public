<script lang="ts">
import {
	IconArrowLeft,
	IconBrandGithub,
	IconExternalLink,
	IconInfoCircle,
} from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import ContributeCategoryStep from '$lib/components/contribute/ContributeCategoryStep.svelte';
import ContributeFeedStep from '$lib/components/contribute/ContributeFeedStep.svelte';
import ContributeHistory from '$lib/components/contribute/ContributeHistory.svelte';
import ContributeOnboarding from '$lib/components/contribute/ContributeOnboarding.svelte';
import ContributeSubmitStep from '$lib/components/contribute/ContributeSubmitStep.svelte';
import {
	deduplicateFeeds,
	type FeedCheckResult,
	generateManualPrSnippet,
	type KiteFeedsData,
	type PendingPrCategory,
	parseCoreFeedsPy,
	parseFeedUrls,
} from '$lib/utils/feedContribution';

const FEEDS_URL = 'https://raw.githubusercontent.com/kagisearch/kite-public/main/kite_feeds.json';
const CORE_FEEDS_URL =
	'https://raw.githubusercontent.com/kagisearch/kite-public/main/core_feeds.py';

// Props from +page.server.ts
let { data } = $props();

// State: onboarding (SSR-safe via cookie)
let showOnboarding = $state(!data.hasSeenOnboarding);

// State: data loading
let feedsData = $state<KiteFeedsData | null>(null);
let communityFeedsData = $state<KiteFeedsData | null>(null);
let loadingFeeds = $state(true);
let loadError = $state<string | null>(null);

// State: category selection
let mode = $state<'existing' | 'new'>('existing');
let selectedCategory = $state('');
let newCategoryName = $state('');
let newCategoryLanguage = $state('en');
let showExistingFeeds = $state(false);

// State: feed input
let addedFeeds = $state<FeedCheckResult[]>([]);
let duplicateFeeds = $state<string[]>([]);
let parseError = $state<string | null>(null);

// State: validation queue
let validationQueue = $state<string[]>([]);
let activeValidations = $state(0);
const MAX_CONCURRENT_VALIDATIONS = 2;

// State: pending PRs
let pendingPrs = $state<PendingPrCategory[]>([]);

// State: submission
let isSubmitting = $state(false);
let submitResult = $state<{
	type: 'success' | 'error' | 'manual';
	message: string;
	prUrl?: string;
	snippet?: {
		editUrl: string;
		fileName: string;
		content: string;
		isNew: boolean;
		isFullFile: boolean;
	};
} | null>(null);

// Derived
const currentCategoryData = $derived(
	feedsData && selectedCategory ? feedsData[selectedCategory] : null,
);

const activeCategoryName = $derived(
	mode === 'existing' ? selectedCategory : newCategoryName.trim(),
);

const validFeeds = $derived(addedFeeds.filter((f) => f.status === 'valid'));
const errorFeeds = $derived(addedFeeds.filter((f) => f.status === 'error'));
const unknownFeeds = $derived(addedFeeds.filter((f) => f.status === 'unknown'));
const pendingFeeds = $derived(
	addedFeeds.filter((f) => f.status === 'pending' || f.status === 'checking'),
);
const submittableFeeds = $derived(addedFeeds.filter((f) => f.status !== 'error'));
const allErrored = $derived(
	addedFeeds.length > 0 && pendingFeeds.length === 0 && submittableFeeds.length === 0,
);
const canSubmit = $derived(
	activeCategoryName.length > 0 &&
		submittableFeeds.length > 0 &&
		pendingFeeds.length === 0 &&
		!allErrored,
);

const selectedPendingNewCategory = $derived(
	mode === 'existing'
		? pendingPrs.find(
				(pr) =>
					pr.isNew &&
					pr.categoryName === selectedCategory &&
					(feedsData ? !feedsData[pr.categoryName] : true),
			) || null
		: null,
);
const effectiveIsNew = $derived(mode === 'new' || selectedPendingNewCategory !== null);

// Find related pending PR for the selected category (if any)
const relatedPendingPr = $derived(
	mode === 'existing' ? pendingPrs.find((pr) => pr.categoryName === selectedCategory) : null,
);

// Fetch feeds data and pending PRs on mount
$effect(() => {
	if (browser && !feedsData) {
		loadFeedsData();
		loadPendingPrs();
	}
});

// Process validation queue
$effect(() => {
	if (validationQueue.length > 0 && activeValidations < MAX_CONCURRENT_VALIDATIONS) {
		const url = validationQueue[0];
		validationQueue = validationQueue.slice(1);
		validateFeed(url);
	}
});

function handleOnboardingComplete() {
	if (browser) {
		// biome-ignore lint/suspicious/noDocumentCookie: simple cookie set, Cookie Store API has poor browser support
		document.cookie = 'kite-contribute-seen=1; path=/; max-age=31536000; SameSite=Lax';
	}
	showOnboarding = false;
}

async function loadFeedsData() {
	loadingFeeds = true;
	loadError = null;

	try {
		// Fetch community feeds and core feeds in parallel
		const [communityResponse, coreResponse] = await Promise.all([
			fetch(FEEDS_URL),
			fetch(CORE_FEEDS_URL).catch(() => null),
		]);

		if (!communityResponse.ok) {
			throw new Error(`Failed to load feeds: ${communityResponse.status}`);
		}
		const communityData: KiteFeedsData = await communityResponse.json();
		communityFeedsData = { ...communityData };

		// Parse core feeds and merge (core categories that already exist in community are skipped)
		if (coreResponse?.ok) {
			const corePyContent = await coreResponse.text();
			const coreData = parseCoreFeedsPy(corePyContent);
			for (const [name, category] of Object.entries(coreData)) {
				if (!communityData[name]) {
					communityData[name] = category;
				}
			}
		}

		feedsData = communityData;
	} catch (e) {
		loadError = e instanceof Error ? e.message : 'Failed to load feeds data';
	} finally {
		loadingFeeds = false;
	}
}

async function loadPendingPrs() {
	try {
		const response = await fetch('/api/contribute/pending-prs');
		if (response.ok) {
			pendingPrs = await response.json();
		}
	} catch {
		// Non-critical — silently fail
	}
}

function handleAddFeeds(input: string): boolean {
	parseError = null;

	const parsed = parseFeedUrls(input);

	// Check if input had text but no valid URLs
	const lines = input
		.split(/[\s,]+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (parsed.length === 0 && lines.length > 0) {
		parseError = s('contribute.noValidUrls');
		return false;
	}

	// Deduplicate against existing category feeds and already-added feeds
	const existingUrls = [...(currentCategoryData?.feeds || []), ...addedFeeds.map((f) => f.url)];
	const { unique, duplicates: dupes } = deduplicateFeeds(parsed, existingUrls);

	if (dupes.length > 0) {
		duplicateFeeds = [...new Set([...duplicateFeeds, ...dupes])];
	}

	if (unique.length === 0 && dupes.length > 0) {
		parseError = s('contribute.allDuplicates', { count: String(dupes.length) });
		return false;
	}

	if (unique.length === 0) {
		return false;
	}

	// Add to feed list as pending
	const newResults: FeedCheckResult[] = unique.map((url) => ({
		url,
		status: 'pending' as const,
	}));
	addedFeeds = [...addedFeeds, ...newResults];

	// Queue for validation
	validationQueue = [...validationQueue, ...unique];

	return true;
}

async function validateFeed(url: string) {
	activeValidations++;

	// Mark as checking
	addedFeeds = addedFeeds.map((f) => (f.url === url ? { ...f, status: 'checking' as const } : f));

	try {
		const response = await fetch(`/api/feed-check?url=${encodeURIComponent(url)}`);
		const result = await response.json();

		addedFeeds = addedFeeds.map((f) =>
			f.url === url
				? {
						...f,
						status: result.status || (response.ok ? 'unknown' : 'error'),
						contentType: result.contentType,
						statusCode: result.statusCode || response.status,
						error:
							result.error ||
							result.message ||
							(!response.ok ? `HTTP ${response.status}` : undefined),
					}
				: f,
		);
	} catch {
		addedFeeds = addedFeeds.map((f) =>
			f.url === url ? { ...f, status: 'unknown' as const, error: 'Network error' } : f,
		);
	} finally {
		activeValidations--;
	}
}

function removeFeed(url: string) {
	addedFeeds = addedFeeds.filter((f) => f.url !== url);
	validationQueue = validationQueue.filter((u) => u !== url);
}

function removeAllErrored() {
	const errorUrls = new Set(errorFeeds.map((f) => f.url));
	addedFeeds = addedFeeds.filter((f) => !errorUrls.has(f.url));
}

function handleModeChange(newMode: 'existing' | 'new') {
	mode = newMode;
	resetForm();
}

function handleCategoryChange(value: string) {
	selectedCategory = value;
	addedFeeds = [];
	duplicateFeeds = [];
	showExistingFeeds = false;
	submitResult = null;
	parseError = null;
}

async function handleSubmit() {
	if (!canSubmit) return;

	// Manual mode: generate snippet client-side, no API call
	if ((data.githubMode ?? 'manual') === 'manual') {
		const feedsToSubmit = submittableFeeds.map((f) => f.url);
		const isCore = currentCategoryData?.category_type === 'core';
		const snippet = generateManualPrSnippet({
			category: activeCategoryName,
			isNew: effectiveIsNew,
			feeds: feedsToSubmit,
			sourceLanguage: mode === 'new' ? newCategoryLanguage : undefined,
			isCore,
			communityFeedsData: communityFeedsData ?? undefined,
		});
		submitResult = {
			type: 'manual',
			message: '',
			snippet,
		};
		return;
	}

	isSubmitting = true;
	submitResult = null;

	const feedsToSubmit = submittableFeeds.map((f) => f.url);

	try {
		const response = await fetch('/api/contribute', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				category: activeCategoryName,
				isNew: effectiveIsNew,
				sourceLanguage: mode === 'new' ? newCategoryLanguage : undefined,
				feeds: feedsToSubmit,
				relatedPr: relatedPendingPr?.prNumber,
			}),
		});

		const result = await response.json();

		if (result.success) {
			submitResult = {
				type: 'success',
				message: s('contribute.successMessage', { prNumber: String(result.prNumber) }),
				prUrl: result.prUrl,
			};
			await loadPendingPrs();
		} else {
			submitResult = {
				type: 'error',
				message: result.message || s('contribute.failedPr'),
			};
		}
	} catch {
		submitResult = {
			type: 'error',
			message: s('contribute.networkError'),
		};
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	addedFeeds = [];
	duplicateFeeds = [];
	submitResult = null;
	parseError = null;
	if (mode === 'new') {
		newCategoryName = '';
	}
}
</script>

<svelte:head>
	<title>{s('contribute.pageTitle')}</title>
</svelte:head>

{#if showOnboarding}
	<ContributeOnboarding onComplete={handleOnboardingComplete} />
{:else}
	<div class="min-h-screen bg-app-bg">
		<!-- Header -->
		<header class="bg-modal-bg border-b border-primary-200">
			<div class="max-w-3xl mx-auto px-4 py-6">
				<div class="flex items-center gap-4">
					<a
						href="/"
						class="flex items-center gap-2 text-primary-400 hover:text-primary-600 transition-colors"
						aria-label={s('common.back')}
					>
						<IconArrowLeft size={20} />
						<img src="/favicon.svg" alt="Kagi News" class="w-8 h-8" />
					</a>
					<div class="flex-1">
						<h1 class="text-2xl font-bold text-primary">
							{s('contribute.heading')}
						</h1>
						<p class="text-sm text-primary-600">
							{s('contribute.subtitle')}
						</p>
					</div>
					<button
						onclick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); showOnboarding = true; }}
						class="text-xs text-primary-400 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
					>
						<IconInfoCircle size={14} />
						{s('contribute.howItWorks')}
					</button>
				</div>
			</div>
		</header>

		<main class="max-w-3xl mx-auto px-4 py-8 space-y-6">
			{#if data.contributions?.length > 0}
				<ContributeHistory contributions={data.contributions} />
			{/if}

			<ContributeCategoryStep
				bind:mode
				{feedsData}
				{loadingFeeds}
				{loadError}
				{pendingPrs}
				bind:selectedCategory
				bind:newCategoryName
				bind:newCategoryLanguage
				bind:showExistingFeeds
				onModeChange={handleModeChange}
				onCategoryChange={handleCategoryChange}
				onLoadRetry={loadFeedsData}
			/>

			{#if activeCategoryName}
				<ContributeFeedStep
					{addedFeeds}
					{duplicateFeeds}
					{validFeeds}
					{errorFeeds}
					{unknownFeeds}
					{pendingFeeds}
					{allErrored}
					{parseError}
					onAddFeeds={handleAddFeeds}
					onRemoveFeed={removeFeed}
					onRemoveAllErrored={removeAllErrored}
				/>
			{/if}

			{#if addedFeeds.length > 0}
			<ContributeSubmitStep
				{submitResult}
				{isSubmitting}
				{canSubmit}
				{allErrored}
				{mode}
				githubMode={data.githubMode ?? 'manual'}
				{activeCategoryName}
				{submittableFeeds}
				{errorFeeds}
				{pendingFeeds}
				onSubmit={handleSubmit}
				onReset={resetForm}
			/>
			{/if}

			<!-- Footer link -->
			<div class="text-center text-xs text-primary-400 pt-4 pb-8">
				<a
					href="https://github.com/kagisearch/kite-public"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 hover:text-primary-600"
				>
					<IconBrandGithub size={14} />
					kagisearch/kite-public
					<IconExternalLink size={12} />
				</a>
			</div>
		</main>
	</div>
{/if}
