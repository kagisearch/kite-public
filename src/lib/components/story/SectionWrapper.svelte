<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
	title: string;
	className?: string;
	children?: Snippet;
}

let { title, className = '', children }: Props = $props();
</script>

<section class="mt-6 {className}">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {title}
  </h3>
  {#if children}
    {@render children()}
  {/if}
</section>
