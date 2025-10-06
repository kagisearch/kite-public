<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { sections } from '$lib/stores/sections.svelte.js';
import { aggregateCitationsFromTexts } from '$lib/utils/citationAggregator';
import {
	buildCitationMapping,
	type CitationMapping,
	replaceWithNumberedCitations,
} from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';
import CitationTooltip from './CitationTooltip.svelte';
import StoryActionItems from './StoryActionItems.svelte';
import StoryDidYouKnow from './StoryDidYouKnow.svelte';
import StoryHighlights from './StoryHighlights.svelte';
import StoryImage from './StoryImage.svelte';
import StoryInternationalReactions from './StoryInternationalReactions.svelte';
import StoryListSection from './StoryListSection.svelte';
import StoryPerspectives from './StoryPerspectives.svelte';
import StoryQuote from './StoryQuote.svelte';
import StorySources from './StorySources.svelte';
import StorySuggestedQnA from './StorySuggestedQnA.svelte';
import StorySummary from './StorySummary.svelte';
import StoryTextSection from './StoryTextSection.svelte';
import StoryTimeline from './StoryTimeline.svelte';

// Props
interface Props {
	story: any;
	imagesPreloaded?: boolean;
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	storyLocalizer?: (key: string) => string;
}

let {
	story,
	imagesPreloaded = false,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	storyLocalizer = s, // Use regular localization if not provided
}: Props = $props();

// Get enabled sections in the correct order
const enabledSections = $derived(
	sections.list.filter((section) => section.enabled).sort((a, b) => a.order - b.order),
);

// Check if a section has content
function hasContent(sectionId: string): boolean {
	switch (sectionId) {
		case 'summary':
			return !!story.short_summary;
		case 'primaryImage':
			// Use new primary_image field if available, fallback to first article with image
			return !!story.primary_image || !!story.articles?.find((a: any) => a.image);
		case 'highlights':
			return !!story.talking_points?.length;
		case 'quotes':
			return !!story.quote;
		case 'secondaryImage':
			// Use new secondary_image field if available, fallback to checking if we have 2+ articles with images
			return (
				!!story.secondary_image || (story.articles?.filter((a: any) => a.image)?.length ?? 0) >= 2
			);
		case 'perspectives':
			return !!story.perspectives?.length;
		case 'historicalBackground':
			return !!story.historical_background;
		case 'humanitarianImpact':
			return !!story.humanitarian_impact;
		case 'technicalDetails':
			return !!story.technical_details?.length;
		case 'businessAngle':
			return !!(story.business_angle_text || story.business_angle_points?.length);
		case 'scientificSignificance':
			return !!story.scientific_significance?.length;
		case 'travelAdvisory':
			return !!story.travel_advisory?.length;
		case 'performanceStatistics':
			return !!story.performance_statistics?.length;
		case 'leagueStandings':
			return !!story.league_standings;
		case 'designPrinciples':
			return !!story.design_principles;
		case 'userExperienceImpact':
			return !!story.user_experience_impact?.length;
		case 'gameplayMechanics':
			return !!story.gameplay_mechanics?.length;
		case 'industryImpact':
			return !!story.gaming_industry_impact?.length;
		case 'technicalSpecifications':
			return !!story.technical_specifications;
		case 'timeline':
			return !!story.timeline?.length;
		case 'internationalReactions':
			return !!story.international_reactions?.length;
		case 'suggestedQnA':
			return !!story.suggested_qna?.length;
		case 'actionItems':
			return !!story.user_action_items?.length;
		case 'didYouKnow':
			return !!story.did_you_know;
		case 'sources':
			return !!story.domains?.length;
		default:
			return false;
	}
}

// Get the sections to render (enabled and have content)
const sectionsToRender = $derived(enabledSections.filter((section) => hasContent(section.id)));

// Build global citation mapping for the story
const citationMapping = $derived.by(() => {
	return buildCitationMapping(story, story.articles || []);
});

// Shared tooltip reference for business angle section
let businessAngleCitationTooltip = $state<CitationTooltip | undefined>();

// Get all cited articles from business angle section
const businessAngleCitedArticles = $derived.by(() => {
	const texts = [];
	if (story.business_angle_text) {
		texts.push(
			citationMapping
				? replaceWithNumberedCitations(story.business_angle_text, citationMapping)
				: story.business_angle_text,
		);
	}
	if (story.business_angle_points?.length > 0) {
		story.business_angle_points.forEach((point: string) => {
			texts.push(citationMapping ? replaceWithNumberedCitations(point, citationMapping) : point);
		});
	}

	return aggregateCitationsFromTexts(texts, citationMapping, story.articles || []);
});
</script>

{#each sectionsToRender as section}
  {#if section.id === "summary"}
    <StorySummary {story} {citationMapping} {storyLocalizer} />
  {:else if section.id === "primaryImage"}
    {#if story.primary_image}
      <!-- New data with primary_image field -->
      {@const sourceArticle = story.articles?.find(
        (a: any) => a.image === story.primary_image.url,
      )}
      <StoryImage
        article={{
          image: story.primary_image.url,
          image_caption: story.primary_image.caption,
          link: sourceArticle?.link,
          domain: story.primary_image.credit || sourceArticle?.domain || "",
        }}
        {imagesPreloaded}
        showCaption={true}
      />
    {:else}
      <!-- Fallback for old data -->
      {@const imageArticle = story.articles?.find((a: any) => a.image)}
      {#if imageArticle}
        <StoryImage article={imageArticle} {imagesPreloaded} />
      {/if}
    {/if}
  {:else if section.id === "highlights"}
    <StoryHighlights
      points={story.talking_points}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "quotes"}
    <StoryQuote
      quote={story.quote}
      author={story.quote_author}
      attribution={story.quote_attribution}
      sourceUrl={story.quote_source_url}
      sourceDomain={story.quote_source_domain}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "secondaryImage"}
    {#if story.secondary_image}
      <!-- New data with secondary_image field -->
      {@const sourceArticle = story.articles?.find(
        (a: any) => a.image === story.secondary_image.url,
      )}
      <StoryImage
        article={{
          image: story.secondary_image.url,
          image_caption: story.secondary_image.caption,
          link: sourceArticle?.link,
          domain: story.secondary_image.credit || sourceArticle?.domain || "",
        }}
        {imagesPreloaded}
        showCaption={true}
      />
    {:else}
      <!-- Fallback for old data -->
      {@const secondaryImage = story.articles?.filter((a: any) => a.image)[1]}
      {#if secondaryImage}
        <StoryImage article={secondaryImage} {imagesPreloaded} />
      {/if}
    {/if}
  {:else if section.id === "perspectives"}
    <StoryPerspectives
      perspectives={story.perspectives}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "historicalBackground"}
    <StoryTextSection
      title={storyLocalizer("section.historicalBackground") || "Historical Background"}
      content={story.historical_background}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "humanitarianImpact"}
    <StoryTextSection
      title={storyLocalizer("section.humanitarianImpact") || "Humanitarian Impact"}
      content={story.humanitarian_impact}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "technicalDetails"}
    <StoryListSection
      title={storyLocalizer("section.technicalDetails") || "Technical Details"}
      items={story.technical_details}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "businessAngle"}
    <section class="mt-6">
      <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
        {storyLocalizer("section.businessAngle") || "Business Angle"}
      </h3>
      {#if story.business_angle_text}
        <p class="mb-4 text-base text-gray-700 dark:text-gray-300">
          <CitationText
            text={citationMapping
              ? replaceWithNumberedCitations(
                  story.business_angle_text,
                  citationMapping,
                )
              : story.business_angle_text}
            showFavicons={false}
            showNumbers={false}
            inline={false}
            articles={businessAngleCitedArticles.citedArticles}
            {citationMapping}
            citationTooltip={businessAngleCitationTooltip}
            {storyLocalizer}
          />
        </p>
      {/if}
      {#if story.business_angle_points?.length > 0}
        <ul
          class="mb-4 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300"
        >
          {#each story.business_angle_points as point}
            <li>
              <CitationText
                text={citationMapping
                  ? replaceWithNumberedCitations(point, citationMapping)
                  : point}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={businessAngleCitedArticles.citedArticles}
                {citationMapping}
                citationTooltip={businessAngleCitationTooltip}
                {storyLocalizer}
              />
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Shared Citation Tooltip for Business Angle -->
      <CitationTooltip
        bind:this={businessAngleCitationTooltip}
        articles={businessAngleCitedArticles.citedArticles}
        citationNumbers={businessAngleCitedArticles.citedNumbers}
        hasCommonKnowledge={businessAngleCitedArticles.hasCommonKnowledge}
        citedItems={businessAngleCitedArticles.citedItems}
      />
    </section>
  {:else if section.id === "scientificSignificance"}
    <StoryListSection
      title={storyLocalizer("section.scientificSignificance") || "Scientific Significance"}
      items={story.scientific_significance}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "travelAdvisory"}
    <StoryListSection
      title={storyLocalizer("section.travelAdvisory") || "Travel Advisory"}
      items={story.travel_advisory}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "performanceStatistics"}
    <StoryListSection
      title={storyLocalizer("section.performanceStatistics") || "Performance Statistics"}
      items={story.performance_statistics}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "leagueStandings"}
    <StoryTextSection
      title={storyLocalizer("section.leagueStandings") || "League Standings"}
      content={story.league_standings}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "designPrinciples"}
    <StoryTextSection
      title={storyLocalizer("section.designPrinciples") || "Design Principles"}
      content={story.design_principles}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "userExperienceImpact"}
    <StoryListSection
      title={storyLocalizer("section.userExperienceImpact") || "User Experience Impact"}
      items={story.user_experience_impact}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "gameplayMechanics"}
    <StoryListSection
      title={storyLocalizer("section.gameplayMechanics") || "Gameplay Mechanics"}
      items={story.gameplay_mechanics}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "industryImpact"}
    <StoryListSection
      title={storyLocalizer("section.industryImpact") || "Industry Impact"}
      items={story.gaming_industry_impact}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "technicalSpecifications"}
    <StoryTextSection
      title={storyLocalizer("section.technicalSpecifications") || "Technical Specifications"}
      content={story.technical_specifications}
      articles={story.articles}
      {citationMapping}
    />
  {:else if section.id === "timeline"}
    <StoryTimeline
      timeline={story.timeline}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "internationalReactions"}
    <StoryInternationalReactions
      reactions={story.international_reactions}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "suggestedQnA"}
    <StorySuggestedQnA
      qna={story.suggested_qna}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "actionItems"}
    <StoryActionItems
      actionItems={story.user_action_items}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "didYouKnow"}
    <StoryDidYouKnow
      content={story.did_you_know}
      articles={story.articles}
      {citationMapping}
      {storyLocalizer}
    />
  {:else if section.id === "sources"}
    <StorySources
      domains={story.domains}
      articles={story.articles}
      bind:showSourceOverlay
      bind:currentSource
      bind:sourceArticles
      bind:currentMediaInfo
      bind:isLoadingMediaInfo
      {storyLocalizer}
    />
  {/if}
{/each}
