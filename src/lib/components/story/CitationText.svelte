<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import FaviconImage from '$lib/components/common/FaviconImage.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import type { CitationMapping } from '$lib/utils/citationContext';
import type { Citation, ParsedTextSegment } from '$lib/utils/citationUtils';
import CitationTooltip from './CitationTooltip.svelte';

// Props
interface Props {
	text: string;
	showFavicons?: boolean;
	showNumbers?: boolean;
	inline?: boolean; // Whether to render inline (for list items) or as block (for paragraphs)
	articles?: Article[]; // Articles for citation tooltip
	citationMapping?: CitationMapping; // Global citation mapping
	citationTooltip?: CitationTooltip; // External tooltip reference for shared tooltips
	storyLocalizer?: LocalizerFunction; // Story-specific localization function
}

let {
	text,
	showFavicons = false, // Changed default to false (most common usage)
	showNumbers = false,
	inline = true, // Changed default to true (most common usage)
	articles = [],
	citationMapping,
	citationTooltip: externalTooltip,
	storyLocalizer = s, // Use regular localization if not provided
}: Props = $props();

// Helper function to parse citations from a text string
function parseCitationsFromText(textString: string): {
	segments: ParsedTextSegment[];
	citations: Citation[];
	citedArticleIndices: number[];
} {
	const citationPattern = /\[(\d+|\*)\]/g;
	const segments: ParsedTextSegment[] = [];
	const citations: Citation[] = [];
	const citedArticleIndices: number[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = citationPattern.exec(textString);

	while (match !== null) {
		// Add text before citation
		if (match.index > lastIndex) {
			segments.push({
				type: 'text',
				content: textString.slice(lastIndex, match.index),
			});
		}

		const citationText = match[1];
		const fullText = match[0];

		// Handle common knowledge citations
		if (citationText === '*') {
			const citation: Citation = {
				id: `citation-common`,
				domain: 'common',
				articleId: 'common',
				fullText,
				number: -1, // Special marker for common knowledge
			};

			segments.push({
				type: 'citation',
				content: fullText,
				citation,
			});

			citations.push(citation);
		} else {
			// Handle numbered citations
			const citationNumber = parseInt(citationText, 10);

			// Get article from citation mapping or fallback to direct index
			let article: Article | undefined;

			if (citationMapping) {
				// Use the citation mapping to get the article
				article = citationMapping.numberToArticle.get(citationNumber);
			} else {
				// Fallback to direct array index
				article = articles[citationNumber - 1];
			}

			if (article) {
				const citation: Citation = {
					id: `citation-${citationNumber}`,
					domain: article.domain,
					articleId: citationNumber.toString(),
					fullText,
					number: citationNumber,
				};

				segments.push({
					type: 'citation',
					content: fullText,
					citation,
				});

				citations.push(citation);

				// Find the article index in the articles array
				const articleIndex = articles.indexOf(article);
				if (articleIndex >= 0) {
					citedArticleIndices.push(articleIndex);
				}
			} else {
				// No matching article, treat as text
				segments.push({
					type: 'text',
					content: fullText,
				});
			}
		}

		lastIndex = match.index + match[0].length;
		match = citationPattern.exec(textString);
	}

	// Add remaining text
	if (lastIndex < textString.length) {
		segments.push({
			type: 'text',
			content: textString.slice(lastIndex),
		});
	}

	return { segments, citations, citedArticleIndices };
}

// Parse text into paragraphs, then parse citations within each paragraph
const parsedData = $derived.by(() => {
	// Ensure text is a string
	let textString = typeof text === 'string' ? text : String(text || '');

	// Handle both actual newlines and escaped \n sequences (from JSON)
	textString = textString.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');

	// Split into paragraphs (by double newline)
	const paragraphTexts = textString.split(/\n\n+/).filter((p) => p.trim());

	// If only one paragraph or inline mode, parse as single block
	if (paragraphTexts.length <= 1 || inline) {
		const result = parseCitationsFromText(textString.replace(/\n\n+/g, ' '));
		return {
			paragraphs: [{ segments: result.segments }],
			formattedSegments: result.segments, // Keep for backwards compatibility
			citations: result.citations,
			citedArticleIndices: result.citedArticleIndices,
		};
	}

	// Parse each paragraph separately
	const allCitations: Citation[] = [];
	const allCitedIndices: number[] = [];
	const paragraphs = paragraphTexts.map((paragraphText) => {
		const result = parseCitationsFromText(paragraphText);
		allCitations.push(...result.citations);
		allCitedIndices.push(...result.citedArticleIndices);
		return { segments: result.segments };
	});

	// Flatten segments for backwards compatibility
	const allSegments = paragraphs.flatMap((p) => p.segments);

	return {
		paragraphs,
		formattedSegments: allSegments,
		citations: allCitations,
		citedArticleIndices: allCitedIndices,
	};
});

// Get unique domains for favicon display
const uniqueDomains = $derived.by(() => {
	const domains = new Set<string>();
	parsedData.citations.forEach((citation) => {
		if (citation.domain && citation.domain !== 'common') {
			domains.add(citation.domain);
		}
	});
	return Array.from(domains);
});

// Threshold for collapsing citations (more than this will be collapsed)
const CITATION_COLLAPSE_THRESHOLD = 3;

// Group consecutive citations for collapsed display
interface CitationGroup {
	type: 'single' | 'group';
	citations: Citation[];
	numbers: number[];
	displayText: string;
}

function groupConsecutiveCitations(
	segments: ParsedTextSegment[],
): (ParsedTextSegment | { type: 'citation-group'; group: CitationGroup })[] {
	const result: (ParsedTextSegment | { type: 'citation-group'; group: CitationGroup })[] = [];
	let currentCitationRun: ParsedTextSegment[] = [];

	const flushCitationRun = () => {
		if (currentCitationRun.length === 0) return;

		if (currentCitationRun.length <= CITATION_COLLAPSE_THRESHOLD) {
			// Keep individual citations
			result.push(...currentCitationRun);
		} else {
			// Collapse into a group
			const citations = currentCitationRun
				.map((seg) => seg.citation)
				.filter((c): c is Citation => c !== undefined);
			const numbers = citations
				.map((c) => c.number)
				.filter((n): n is number => n !== undefined && n !== -1);

			// Format the display text using range notation where possible
			const displayText = formatCitationRange(numbers);

			result.push({
				type: 'citation-group',
				group: {
					type: 'group',
					citations,
					numbers,
					displayText,
				},
			});
		}
		currentCitationRun = [];
	};

	for (const segment of segments) {
		if (segment.type === 'citation') {
			currentCitationRun.push(segment);
		} else {
			// Check if this is just whitespace between citations
			if (
				segment.type === 'text' &&
				/^\s*$/.test(segment.content) &&
				currentCitationRun.length > 0
			) {
				// Keep accumulating - whitespace between citations shouldn't break the run
				currentCitationRun.push(segment);
			} else {
				flushCitationRun();
				result.push(segment);
			}
		}
	}
	flushCitationRun();

	return result;
}

// Format citation numbers as a compact range string
// e.g., [1,2,3,4,5] -> "[1-5]", [1,3,4,5] -> "[1,3-5]", [1,3,5,7] -> "[1,3,5,7]"
function formatCitationRange(numbers: number[]): string {
	if (numbers.length === 0) return '';
	if (numbers.length === 1) return `[${numbers[0]}]`;

	// Sort numbers
	const sorted = [...numbers].sort((a, b) => a - b);

	// Find consecutive ranges
	const ranges: (number | [number, number])[] = [];
	let rangeStart = sorted[0];
	let rangeEnd = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === rangeEnd + 1) {
			// Extend current range
			rangeEnd = sorted[i];
		} else {
			// Push current range and start new one
			if (rangeStart === rangeEnd) {
				ranges.push(rangeStart);
			} else {
				ranges.push([rangeStart, rangeEnd]);
			}
			rangeStart = sorted[i];
			rangeEnd = sorted[i];
		}
	}
	// Push final range
	if (rangeStart === rangeEnd) {
		ranges.push(rangeStart);
	} else {
		ranges.push([rangeStart, rangeEnd]);
	}

	// Format as string
	const parts = ranges.map((r) => {
		if (typeof r === 'number') {
			return `${r}`;
		} else {
			const [start, end] = r;
			// Use hyphen for ranges of 3+, comma for just 2
			if (end - start >= 2) {
				return `${start}-${end}`;
			} else {
				return `${start},${end}`;
			}
		}
	});

	return `[${parts.join(',')}]`;
}

// Group segments for display
const groupedSegments = $derived.by(() => {
	return {
		paragraphs: parsedData.paragraphs.map((p) => ({
			segments: groupConsecutiveCitations(p.segments),
		})),
		formattedSegments: groupConsecutiveCitations(parsedData.formattedSegments),
	};
});

// State for showing citation sources
let showSources = $state(false);

// Check if any citations are common knowledge
const hasCommonKnowledge = $derived.by(() => {
	return parsedData.citations.some((citation) => citation.domain === 'common');
});

// Citation tooltip reference
let citationTooltip = $state<CitationTooltip | undefined>();

// Use external tooltip if provided, otherwise use internal one
const tooltipReference = $derived(externalTooltip || citationTooltip);

// Get only the articles that are cited in this text with their citation numbers
const citedArticlesWithNumbers = $derived.by(() => {
	return parsedData.citations.map((citation) => ({
		article:
			citation.domain === 'common'
				? null
				: citationMapping
					? citationMapping.numberToArticle.get(citation.number!)
					: articles[citation.number! - 1],
		number: citation.number!,
		isCommon: citation.domain === 'common',
	})) as Array<{
		article: Article | null;
		number: number;
		isCommon?: boolean;
	}>;
});

// Just the articles for backwards compatibility
const citedArticles = $derived.by(() => {
	return citedArticlesWithNumbers
		.filter((item): item is { article: Article; number: number } => !!item.article)
		.map((item) => item.article);
});
</script>

<div class="citation-wrapper">
  <!-- Main content -->
  <div class="citation-content {inline ? 'inline' : 'block'} {inline ? 'text-base' : ''}">
    {#if inline}
      <!-- Inline rendering for list items -->
      {#each groupedSegments.formattedSegments as segment}
        {#if segment.type === "text"}
          {segment.content}
        {:else if segment.type === "citation"}
          {#if showNumbers}
            <span
              class="citation-number text-gray-600 dark:text-gray-400 text-xs align-super cursor-help"
              title="Source: {segment.citation?.domain}"
            >
              {segment.content}
            </span>
          {:else}
            <!-- Show as clean numbered citation -->
            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
            <button
              type="button"
              class="citation-number text-gray-600 dark:text-gray-400 text-xs align-super cursor-help font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-0.5 transition-colors border-0 bg-transparent p-0"
              title={segment.citation?.domain === "common"
                ? "Common knowledge"
                : `Source ${segment.citation?.number}: ${segment.citation?.domain}`}
              onmouseover={(e) =>
                tooltipReference?.handleCitationInteraction(
                  e,
                  uniqueDomains,
                  segment.citation?.number,
                )}
              onmouseleave={(e) => tooltipReference?.handleCitationLeave(e)}
              onclick={(e) =>
                tooltipReference?.handleCitationInteraction(
                  e,
                  uniqueDomains,
                  segment.citation?.number,
                )}
              onkeydown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                tooltipReference?.handleCitationInteraction(
                  e,
                  uniqueDomains,
                  segment.citation?.number,
                )}
              ontouchstart={(e) => {
                e.stopPropagation();
                // Record touch time to ignore subsequent mouseover
                if (tooltipReference && "recordTouch" in tooltipReference) {
                  (tooltipReference as any).recordTouch();
                }
              }}
            ><span class="sr-only">{segment.citation?.domain === "common"
                ? "Common knowledge citation"
                : `Citation ${segment.citation?.number} from ${segment.citation?.domain}`}</span><span aria-hidden="true">{segment.content}</span></button>
          {/if}
        {:else if segment.type === "citation-group"}
          <!-- Collapsed citation group -->
          <!-- svelte-ignore a11y_mouse_events_have_key_events -->
          <button
            type="button"
            class="citation-number citation-group-badge text-gray-600 dark:text-gray-400 text-xs align-super cursor-help font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-0.5 transition-colors border-0 bg-transparent p-0"
            title={`${segment.group.numbers.length} sources: ${segment.group.numbers.join(', ')}`}
            onmouseover={(e) =>
              tooltipReference?.handleCitationInteraction(
                e,
                uniqueDomains,
                segment.group.numbers,
              )}
            onmouseleave={(e) => tooltipReference?.handleCitationLeave(e)}
            onclick={(e) =>
              tooltipReference?.handleCitationInteraction(
                e,
                uniqueDomains,
                segment.group.numbers,
              )}
            onkeydown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              tooltipReference?.handleCitationInteraction(
                e,
                uniqueDomains,
                segment.group.numbers,
              )}
            ontouchstart={(e) => {
              e.stopPropagation();
              if (tooltipReference && "recordTouch" in tooltipReference) {
                (tooltipReference as any).recordTouch();
              }
            }}
          ><span class="sr-only">{segment.group.numbers.length} citations from multiple sources</span><span aria-hidden="true">{segment.group.displayText}</span></button>
        {/if}
      {/each}
    {:else}
      <!-- Block rendering for paragraphs -->
      {#each groupedSegments.paragraphs as paragraph, paragraphIndex}
        <p class="text-base {paragraphIndex < groupedSegments.paragraphs.length - 1 ? 'mb-4' : 'mb-2'}" dir="auto">
          {#each paragraph.segments as segment}
            {#if segment.type === "text"}
              {segment.content}
            {:else if segment.type === "citation"}
              {#if showNumbers}
                <span
                  class="citation-number text-gray-600 dark:text-gray-400 text-xs align-super cursor-help"
                  title="Source: {segment.citation?.domain}"
                >
                  {segment.content}
                </span>
              {:else}
                <!-- Show as clean numbered citation -->
                <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                <button
                  type="button"
                  class="citation-number text-gray-600 dark:text-gray-400 text-xs align-super cursor-help font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-0.5 transition-colors border-0 bg-transparent p-0"
                  title={segment.citation?.domain === "common"
                    ? "Common knowledge"
                    : `Source ${segment.citation?.number}: ${segment.citation?.domain}`}
                  onmouseover={(e) =>
                    tooltipReference?.handleCitationInteraction(
                      e,
                      uniqueDomains,
                      segment.citation?.number,
                    )}
                  onmouseleave={(e) => tooltipReference?.handleCitationLeave(e)}
                  onclick={(e) =>
                    tooltipReference?.handleCitationInteraction(
                      e,
                      uniqueDomains,
                      segment.citation?.number,
                    )}
                  onkeydown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    tooltipReference?.handleCitationInteraction(
                      e,
                      uniqueDomains,
                      segment.citation?.number,
                    )}
                  ontouchstart={(e) => {
                    e.stopPropagation();
                    // Record touch time to ignore subsequent mouseover
                    if (tooltipReference && "recordTouch" in tooltipReference) {
                      (tooltipReference as any).recordTouch();
                    }
                  }}
                ><span class="sr-only">{segment.citation?.domain === "common"
                    ? "Common knowledge citation"
                    : `Citation ${segment.citation?.number} from ${segment.citation?.domain}`}</span><span aria-hidden="true">{segment.content}</span></button>
              {/if}
            {:else if segment.type === "citation-group"}
              <!-- Collapsed citation group -->
              <!-- svelte-ignore a11y_mouse_events_have_key_events -->
              <button
                type="button"
                class="citation-number citation-group-badge text-gray-600 dark:text-gray-400 text-xs align-super cursor-help font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-0.5 transition-colors border-0 bg-transparent p-0"
                title={`${segment.group.numbers.length} sources: ${segment.group.numbers.join(', ')}`}
                onmouseover={(e) =>
                  tooltipReference?.handleCitationInteraction(
                    e,
                    uniqueDomains,
                    segment.group.numbers,
                  )}
                onmouseleave={(e) => tooltipReference?.handleCitationLeave(e)}
                onclick={(e) =>
                  tooltipReference?.handleCitationInteraction(
                    e,
                    uniqueDomains,
                    segment.group.numbers,
                  )}
                onkeydown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  tooltipReference?.handleCitationInteraction(
                    e,
                    uniqueDomains,
                    segment.group.numbers,
                  )}
                ontouchstart={(e) => {
                  e.stopPropagation();
                  if (tooltipReference && "recordTouch" in tooltipReference) {
                    (tooltipReference as any).recordTouch();
                  }
                }}
              ><span class="sr-only">{segment.group.numbers.length} citations from multiple sources</span><span aria-hidden="true">{segment.group.displayText}</span></button>
            {/if}
          {/each}
        </p>
      {/each}
    {/if}
  </div>

  <!-- Citation sources with favicons (appears on next line for both inline and block) -->
  {#if showFavicons && uniqueDomains.length > 0}
    <!-- svelte-ignore a11y_mouse_events_have_key_events -->
    <div
      class="citation-sources flex items-center cursor-pointer"
      onmouseover={(e) =>
        tooltipReference?.handleCitationInteraction(e, uniqueDomains)}
      onmouseleave={(e) => tooltipReference?.handleCitationLeave(e)}
      onfocus={() => {}}
      onblur={() => {}}
      onclick={(e) =>
        tooltipReference?.handleCitationInteraction(e, uniqueDomains)}
      onkeydown={(e) =>
        (e.key === "Enter" || e.key === " ") &&
        tooltipReference?.handleCitationInteraction(e, uniqueDomains)}
      ontouchstart={(e) => {
        e.stopPropagation();
        // Record touch time to ignore subsequent mouseover
        if (tooltipReference && "recordTouch" in tooltipReference) {
          (tooltipReference as any).recordTouch();
        }
      }}
      role="button"
      tabindex="0"
      aria-label="View sources: {uniqueDomains.join(', ')}"
    >
      <span class="text-xs text-gray-500 dark:text-gray-400 me-2">
        {storyLocalizer(uniqueDomains.length === 1 ? "citation.source" : "citation.sources")}
      </span>
      <div class="flex items-center -space-x-3">
        {#each uniqueDomains.slice(0, 5) as domain, index}
          <div
            class="favicon-wrapper relative size-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:z-10 transition-all hover:scale-110"
            style="z-index: {5 - index}"
            title={domain}
          >
            <FaviconImage
              {domain}
              alt="{domain} favicon"
              class="size-5 rounded-sm"
              loading="lazy"
            />
          </div>
        {/each}
        {#if uniqueDomains.length > 5}
          <div class="ms-3 text-xs text-gray-500 dark:text-gray-400">
            +{uniqueDomains.length - 5} more
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Numbered citations list (if using numbered format) -->
  {#if showNumbers && parsedData.citations.length > 0 && !inline}
    <button
      class="mt-2 text-xs text-gray-600 dark:text-gray-400 hover:underline"
      onclick={() => (showSources = !showSources)}
    >
      {showSources ? "Hide" : "Show"} sources
    </button>

    {#if showSources}
      <div class="citation-list mt-2 text-sm text-gray-600 dark:text-gray-400">
        {#each parsedData.citations as citation, index}
          <div class="citation-item" dir="auto">
            [{index + 1}] {citation.domain}
            {#if citation.domain !== "common"}
              <FaviconImage
                domain={citation.domain}
                alt="{citation.domain} favicon"
                class="inline-block size-3 ms-1 rounded-sm"
                loading="lazy"
              />
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Citation Tooltip (only if no external tooltip provided) -->
{#if !externalTooltip}
  <CitationTooltip
    bind:this={citationTooltip}
    articles={citedArticles}
    citationNumbers={citedArticlesWithNumbers.map((item) => item.number)}
    {hasCommonKnowledge}
    citedItems={citedArticlesWithNumbers}
    {storyLocalizer}
  />
{/if}

<style>
  .citation-wrapper {
    display: block;
  }

  .citation-wrapper:has(.citation-content.inline) {
    display: inline;
  }

  .citation-content {
    display: block;
  }

  .citation-content.inline {
    display: inline;
  }

  .citation-sources {
    margin-top: 0.25rem;
  }

  .citation-number {
    font-weight: 500;
    margin: 0;
    margin-right: -2px;
  }

  .favicon-wrapper {
    transition:
      transform 0.2s,
      z-index 0.2s;
  }

  .citation-list {
    border-left: 2px solid;
    padding-left: 0.75rem;
    margin-top: 0.5rem;
  }

  .citation-item {
    display: flex;
    align-items: center;
    margin-bottom: 0.25rem;
  }
</style>
