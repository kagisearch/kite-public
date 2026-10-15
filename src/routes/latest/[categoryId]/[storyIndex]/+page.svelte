<!-- This route handles URLs like /latest/categoryId/storyIndex -->

<script lang="ts">
import Page from '../../../+page.svelte';

let { data } = $props();
</script>

<Page {data} />
