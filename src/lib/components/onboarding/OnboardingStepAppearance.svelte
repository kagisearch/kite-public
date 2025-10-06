<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import DataLanguageSelector from '../settings/snippets/DataLanguageSelector.svelte';
import LanguageSelector from '../settings/snippets/LanguageSelector.svelte';
import StoryCountSlider from '../settings/snippets/StoryCountSlider.svelte';
import ThemeSelector from '../settings/snippets/ThemeSelector.svelte';
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      {s("onboarding.welcome.title") || "Welcome to Kagi News!"}
    </h2>
    <p class="text-gray-600 dark:text-gray-300">
      {s("onboarding.welcome.subtitle") ||
        "Let's personalize your news experience. First, choose your preferences:"}
    </p>
  </div>

  <!-- Theme Setting -->
  <ThemeSelector />

  <!-- Language Setting -->
  <LanguageSelector showTooltip={true} />

  <!-- Data Language Setting -->
  <DataLanguageSelector showTooltip={true} />

  <!-- Story Count Setting -->
  <StoryCountSlider id="onboarding-story-count" />
</div>
