<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to homepage on any error (including 404)
		goto('/', { replaceState: true });
	});
</script>

<!-- This component redirects all errors to the homepage -->
