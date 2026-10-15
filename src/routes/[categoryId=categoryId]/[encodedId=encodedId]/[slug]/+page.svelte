<!-- This route handles URLs like /world/2025101914/story-slug -->

<script lang="ts">
import Page from '../../../+page.svelte';

let { data } = $props();
</script>

<Page {data} />
