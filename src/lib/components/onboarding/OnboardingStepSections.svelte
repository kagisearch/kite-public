<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import SectionsList from '$lib/components/settings/snippets/SectionsList.svelte';
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold text-primary mb-2">
			{s('onboarding.sections.title') || 'Content Preferences'}
		</h2>
		<p class="text-primary-600">
			{s('onboarding.sections.subtitle') ||
				'Choose which sections to display in your news stories:'}
		</p>
	</div>

	<!-- Reuse the shared SectionsList component -->
	<SectionsList showHeader={false} showResetButton={false} />
</div>
