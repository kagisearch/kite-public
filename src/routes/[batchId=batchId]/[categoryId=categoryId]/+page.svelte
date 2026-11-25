<!-- This route handles URLs like /batchId/categoryId -->
<!-- It simply renders the main page component which will parse the URL -->

<script lang="ts">
import Page from '../../+page.svelte';

let { data } = $props();
</script>

<Page {data} />
