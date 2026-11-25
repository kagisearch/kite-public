<script lang="ts">
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { isRtlLocale } from '$lib/client/rtl-detection';
import { languageSettings } from '$lib/data/settings.svelte';
import { batchService } from '$lib/services/batchService';
import { fetchWikipediaContent } from '$lib/services/wikipediaService';
import type { FilteredOnThisDayEvent } from '$lib/utils/contentFilter';

interface Props {
	people: FilteredOnThisDayEvent[];
}

let { people }: Props = $props();

// Track which blurred people have been revealed
let revealedPeople = $state(new Set<number>());

function revealPerson(index: number) {
	revealedPeople = new Set([...revealedPeople, index]);
}

// People images cache (for carousel)
let peopleImagesCache = new Map<string, string>();
let imagesLoaded = $state(0); // Counter to trigger reactivity when images load

// People carousel state
let currentSlide = $state(0);
const itemsPerSlide = 3;
const chunkedPeople = $derived(
	people.reduce(
		(chunks: FilteredOnThisDayEvent[][], item: FilteredOnThisDayEvent, index: number) => {
			const chunkIndex = Math.floor(index / itemsPerSlide);
			if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
			chunks[chunkIndex].push(item);
			return chunks;
		},
		[],
	),
);

// Determine if RTL for carousel direction
const isRtl = $derived(isRtlLocale(languageSettings.ui));
const carouselTransform = $derived(
	isRtl ? `translateX(${currentSlide * 100}%)` : `translateX(-${currentSlide * 100}%)`,
);

// Preload Wikipedia thumbnails for people (for carousel images)
async function preloadPeopleImages() {
	if (people.length === 0) return;

	// Skip preloading in time travel mode
	if (batchService.isTimeTravelMode()) return;

	console.log('Starting to preload images for', people.length, 'people');

	const imagePromises = people.map(async (person, index) => {
		// Extract Wikipedia ID from the person's content
		const linkMatch = person.content.match(/<a[^>]*data-wiki-id="([^"]*)"[^>]*>/);
		if (!linkMatch) {
			console.warn(`No wiki-id found for person ${index}:`, person.content);
			return;
		}

		const wikiId = linkMatch[1];

		try {
			// fetchWikipediaContent now handles Q-IDs properly
			const data = await fetchWikipediaContent(wikiId);
			if (data?.thumbnail?.source) {
				const cacheKey = person.year + person.content;
				peopleImagesCache.set(cacheKey, data.thumbnail.source);
				console.log(`✅ Loaded image for ${person.year}:`, data.thumbnail.source);
				imagesLoaded++; // Trigger reactivity
			} else {
				console.warn(`❌ No thumbnail for ${person.year} (${wikiId})`);
			}
		} catch (error) {
			console.error(`Failed to preload image for person ${person.year}:`, error);
		}
	});

	await Promise.allSettled(imagePromises);
	console.log('Finished preloading people images. Total loaded:', imagesLoaded);
}

// Get cached image for a person (reactive to imagesLoaded)
function getPersonImage(person: FilteredOnThisDayEvent): string {
	// Reference imagesLoaded to trigger reactivity when images load
	void imagesLoaded;
	const cacheKey = person.year + person.content;
	const cached = peopleImagesCache.get(cacheKey);
	console.log(`Getting image for ${person.year}:`, cached ? 'FOUND' : 'NOT FOUND', cached);
	return cached || '/svg/placeholder.svg';
}

// Carousel functions
function nextSlide() {
	if (currentSlide < chunkedPeople.length - 1) {
		currentSlide++;
	}
}

function prevSlide() {
	if (currentSlide > 0) {
		currentSlide--;
	}
}

function goToSlide(index: number) {
	currentSlide = index;
}

// Handle pagination dot keyboard events
function handleDotKeydown(event: KeyboardEvent, index: number) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		goToSlide(index);
	}
}

// Wheel navigation
function handleWheel(event: WheelEvent) {
	event.preventDefault();
	if (event.deltaX > 0) {
		nextSlide();
	} else if (event.deltaX < 0) {
		prevSlide();
	}
}

// Reactively preload people images when people array changes
$effect(() => {
	if (browser && people.length > 0) {
		console.log('People data loaded, starting image preload for', people.length, 'people');
		preloadPeopleImages();
	}
});
</script>

<div>
	<h3 class="mb-4 text-2xl font-bold text-primary-700">
		{s('onthisday.people') || 'People'}
	</h3>

	<!-- Carousel for Desktop -->
	<div class="relative hidden md:block">
		<!-- Left Arrow -->
		<button
			class="absolute top-1/2 start-[-2rem] -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-primary-400 transition-colors hover:text-primary-600 disabled:opacity-50 focus-visible-ring"
			onclick={prevSlide}
			disabled={currentSlide === 0}
			aria-label="Previous slide"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		<!-- Slides Wrapper -->
		<div class="overflow-hidden" onwheel={handleWheel}>
			<div
				class="flex transition-transform duration-200 ease-out"
				style="transform: {carouselTransform}"
			>
				{#each chunkedPeople as slide, slideIndex}
					<div class="flex w-full shrink-0 justify-around">
						{#each slide as person, index}
							{@const personIndex = slideIndex * itemsPerSlide + index}
							{@const isBlurred = person._filtered && !revealedPeople.has(personIndex)}
							<div
								class="relative flex w-1/3 flex-col items-center px-4 text-center {isBlurred
									? 'cursor-pointer'
									: ''}"
								onclick={isBlurred ? () => revealPerson(personIndex) : undefined}
								onkeydown={isBlurred
									? (e) => {
											if (e.key === 'Enter' || e.key === ' ') revealPerson(personIndex);
										}
									: undefined}
								role={isBlurred ? 'button' : undefined}
								tabindex={isBlurred ? 0 : undefined}
							>
								<!-- Vertical separator -->
								{#if index < slide.length - 1}
									<div class="absolute top-0 right-0 h-full w-[1px] bg-[var(--color-header)]"></div>
								{/if}

								<div
									class="transition-all duration-200 {isBlurred
										? 'blur-lg pointer-events-none'
										: ''}"
								>
									<!-- Year -->
									<span class="mr-auto mb-2 text-2xl font-bold text-[var(--color-header)]">
										{person.year}
									</span>

									<!-- Image + Text -->
									<div class="flex items-start gap-4">
										<img
											class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
											src={getPersonImage(person)}
											alt="placeholder"
										/>
										<span class="text-left text-sm text-primary-700" dir="auto">
											{@html person.content.replace(
												/href=/g,
												'class="underline text-primary-800 hover:text-primary-600 cursor-pointer transition-colors" href=',
											)}
										</span>
									</div>
								</div>

								{#if isBlurred && person._matchedKeywords && person._matchedKeywords.length > 0}
									<div class="absolute inset-0 z-10 flex items-center justify-center">
										<div class="flex items-center gap-1">
											{#each person._matchedKeywords.slice(0, 2) as keyword}
												<span
													class="text-xs font-semibold text-primary-800 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded"
												>
													{keyword}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Right Arrow -->
		<button
			class="absolute top-1/2 end-[-2rem] -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-primary-400 transition-colors hover:text-primary-600 disabled:opacity-50 focus-visible-ring"
			onclick={nextSlide}
			disabled={currentSlide === chunkedPeople.length - 1}
			aria-label="Next slide"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>

		<!-- Dots Pagination -->
		{#if chunkedPeople.length > 1}
			<div class="mt-4 flex justify-center space-x-2">
				{#each chunkedPeople as _, i}
					<button
						class="h-2 w-2 rounded-full transition-colors focus-visible-ring {currentSlide === i
							? 'bg-primary-600'
							: 'bg-primary-200'}"
						onclick={() => goToSlide(i)}
						onkeydown={(e) => handleDotKeydown(e, i)}
						aria-label={`Go to slide ${i + 1}`}
					></button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- List for Mobile -->
	<div class="block md:hidden">
		{#each people as person, index}
			{@const isBlurred = person._filtered && !revealedPeople.has(index)}
			<div
				class="relative mb-4 {isBlurred ? 'cursor-pointer' : ''}"
				onclick={isBlurred ? () => revealPerson(index) : undefined}
				onkeydown={isBlurred
					? (e) => {
							if (e.key === 'Enter' || e.key === ' ') revealPerson(index);
						}
					: undefined}
				role={isBlurred ? 'button' : undefined}
				tabindex={isBlurred ? 0 : undefined}
			>
				<div
					class="flex items-start gap-4 transition-all duration-200 {isBlurred
						? 'blur-lg pointer-events-none'
						: ''}"
				>
					<!-- Year -->
					<span class="text-2xl font-bold text-[var(--color-header)]">
						{person.year}
					</span>
					<!-- Content -->
					<span class="text-sm text-primary-700" dir="auto">
						{@html person.content.replace(
							/href=/g,
							'class="underline text-primary-800 hover:text-primary-600 cursor-pointer transition-colors" href=',
						)}
					</span>
				</div>

				{#if isBlurred && person._matchedKeywords && person._matchedKeywords.length > 0}
					<div class="absolute inset-0 z-10 flex items-center justify-center">
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-primary-700">
								{s('contentFilter.filteredBecause') || 'Hidden due to filter:'}
							</span>
							{#each person._matchedKeywords.slice(0, 3) as keyword}
								<span
									class="text-xs font-semibold text-primary-800 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded"
								>
									{keyword}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
