<!-- This route handles URLs like /world/latest -->

<script lang="ts">
import Page from '../../+page.svelte';

let { data } = $props();
</script>

<Page {data} />
