<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

onMount(() => {
	// Redirect to homepage on any error (including 404)
	goto('/', { replaceState: true });
});
</script>

<!-- This component redirects all errors to the homepage -->
