<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Category } from '$lib/types';
import SettingsCategories from '../settings/SettingsCategories.svelte';

// Props
interface Props {
	categories?: Category[];
}

let { categories = [] }: Props = $props();
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      {s("onboarding.categories.title") || "Choose Your Topics"}
    </h2>
    <p class="text-gray-600 dark:text-gray-300 mb-2">
      {s("onboarding.categories.subtitle") ||
        "Kagi News follows news from around the world, covering national, regional, and local events. Select the categories you're interested in:"}
    </p>
  </div>

  <!-- Reuse the existing SettingsCategories component -->
  <SettingsCategories {categories} />
</div>
