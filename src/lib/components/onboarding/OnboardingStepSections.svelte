<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import SettingsSections from '../settings/SettingsSections.svelte';
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      {s("onboarding.sections.title") || "Content Preferences"}
    </h2>
    <p class="text-gray-600 dark:text-gray-300">
      {s("onboarding.sections.subtitle") ||
        "Choose which sections to display in your news stories:"}
    </p>
  </div>

  <!-- Reuse the existing SettingsSections component -->
  <SettingsSections />
</div>
