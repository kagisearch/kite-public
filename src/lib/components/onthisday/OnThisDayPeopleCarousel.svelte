<script lang="ts">
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { isRtlLocale } from '$lib/client/rtl-detection';
import { languageSettings } from '$lib/data/settings.svelte';
import { batchService } from '$lib/services/batchService';
import { fetchWikipediaContent } from '$lib/services/wikipediaService';
import type { OnThisDayEvent } from '$lib/types';

interface Props {
	people: OnThisDayEvent[];
}

let { people }: Props = $props();

// People images cache (for carousel)
let peopleImagesCache = new Map<string, string>();
let imagesLoaded = $state(0); // Counter to trigger reactivity when images load

// People carousel state
let currentSlide = $state(0);
const itemsPerSlide = 3;
const chunkedPeople = $derived(
	people.reduce((chunks: OnThisDayEvent[][], item: OnThisDayEvent, index: number) => {
		const chunkIndex = Math.floor(index / itemsPerSlide);
		if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
		chunks[chunkIndex].push(item);
		return chunks;
	}, []),
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
function getPersonImage(person: OnThisDayEvent): string {
	// Reference imagesLoaded to trigger reactivity when images load
	imagesLoaded;
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
  <h3 class="mb-4 text-2xl font-bold text-gray-700 dark:text-gray-300">
    {s("onthisday.people") || "People"}
  </h3>

  <!-- Carousel for Desktop -->
  <div class="relative hidden md:block">
    <!-- Left Arrow -->
    <button
      class="absolute top-1/2 start-[-2rem] -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 focus-visible-ring dark:text-gray-500 dark:hover:text-gray-300"
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
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>

    <!-- Slides Wrapper -->
    <div class="overflow-hidden" onwheel={handleWheel}>
      <div
        class="flex transition-transform duration-300 ease-out"
        style="transform: {carouselTransform}"
      >
        {#each chunkedPeople as slide}
          <div class="flex w-full shrink-0 justify-around">
            {#each slide as person, index}
              <div
                class="relative flex w-1/3 flex-col items-center px-4 text-center"
              >
                <!-- Vertical separator -->
                {#if index < slide.length - 1}
                  <div
                    class="absolute top-0 right-0 h-full w-[1px] bg-[var(--color-header)]"
                  ></div>
                {/if}

                <!-- Year -->
                <span
                  class="mr-auto mb-2 text-2xl font-bold text-[var(--color-header)]"
                >
                  {person.year}
                </span>

                <!-- Image + Text -->
                <div class="flex items-start gap-4">
                  <img
                    class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    src={getPersonImage(person)}
                    alt="placeholder"
                  />
                  <span
                    class="text-left text-sm text-gray-700 dark:text-gray-300"
                    dir="auto"
                  >
                    {@html person.content.replace(
                      /href=/g,
                      'class="underline text-gray-800 hover:text-gray-600 cursor-pointer transition-colors dark:text-gray-200 dark:hover:text-gray-400" href=',
                    )}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <!-- Right Arrow -->
    <button
      class="absolute top-1/2 end-[-2rem] -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 focus-visible-ring dark:text-gray-500 dark:hover:text-gray-300"
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
            class="h-2 w-2 rounded-full transition-colors focus-visible-ring {currentSlide ===
            i
              ? 'bg-gray-600 dark:bg-gray-400'
              : 'bg-gray-300 dark:bg-gray-600'}"
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
    {#each people as person}
      <div class="mb-4 flex items-start gap-4">
        <!-- Year -->
        <span class="text-2xl font-bold text-[var(--color-header)]">
          {person.year}
        </span>
        <!-- Content -->
        <span class="text-sm text-gray-700 dark:text-gray-300" dir="auto">
          {@html person.content.replace(
            /href=/g,
            'class="underline text-gray-800 hover:text-gray-600 cursor-pointer transition-colors dark:text-gray-200 dark:hover:text-gray-400" href=',
          )}
        </span>
      </div>
    {/each}
  </div>
</div>
