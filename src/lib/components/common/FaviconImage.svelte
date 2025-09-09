<script lang="ts">
  import {
    fetchFavicon,
    getImmediateFaviconUrl,
  } from "$lib/services/faviconService";
  import { onMount } from "svelte";
  import { base } from "$app/paths";

  interface Props {
    domain: string;
    alt?: string;
    class?: string;
    loading?: "lazy" | "eager";
  }

  // biome-ignore lint/style/useConst: Svelte props must remain let to stay reactive
  let {
    domain,
    alt = "",
    class: className = "h-5 w-5 rounded-full",
    loading = "lazy",
  }: Props = $props();

  // State for favicon URL
  let faviconUrl = $state(getImmediateFaviconUrl(domain));
  let isHighQuality = $state(false);

  // Fetch favicon with progressive enhancement
  onMount(() => {
    if (!domain) return;

    // Fetch favicon with callback for updates
    fetchFavicon(domain, (result) => {
      faviconUrl = result.url;
      isHighQuality = result.quality === "high";
    }).then((initialResult) => {
      // Initial result
      faviconUrl = initialResult.url;
      isHighQuality = initialResult.quality === "high";
    });
  });

  // Update when domain changes
  $effect(() => {
    if (domain) {
      // Get immediate URL first
      faviconUrl = getImmediateFaviconUrl(domain);
      isHighQuality = false;

      // Then fetch with updates
      fetchFavicon(domain, (result) => {
        faviconUrl = result.url;
        isHighQuality = result.quality === "high";
      });
    }
  });
</script>

<img
  src={faviconUrl}
  alt={alt || `${domain} favicon`}
  class={className}
  class:high-quality={isHighQuality}
  {loading}
  onerror={(e) => {
    // Fallback to placeholder on error
    const target = e.currentTarget as HTMLImageElement;
    target.src = `${base}/svg/placeholder.svg`;
  }}
/>

<style>
  img {
    transition: filter 0.2s ease-in-out;
  }

  img.high-quality {
    /* Subtle indication that high quality version loaded */
    filter: contrast(1.05);
  }
</style>
