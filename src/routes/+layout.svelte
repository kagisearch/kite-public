<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { categories } from "$lib/stores/categories.svelte.js";
  import { dataLanguage } from "$lib/stores/dataLanguage.svelte.js";
  import { experimental } from "$lib/stores/experimental.svelte.js";
  import { fontSize } from "$lib/stores/fontSize.svelte.js";
  import { language } from "$lib/stores/language.svelte.js";
  import { pageMetadata } from "$lib/stores/pageMetadata.svelte.js";
  import { settings } from "$lib/stores/settings.svelte.js";
  import { storyCount } from "$lib/stores/storyCount.svelte.js";
  import { theme } from "$lib/stores/theme.svelte.js";
  import "../styles/index.css";
  import type { PageData } from "./$types";
  import { useOverlayScrollbars } from "overlayscrollbars-svelte";
  import "overlayscrollbars/overlayscrollbars.css";
  import { onMount, type Snippet } from "svelte";
  import { PUBLIC_MAINTENANCE_MODE, PUBLIC_MAINTENANCE_START, PUBLIC_MAINTENANCE_END, PUBLIC_MAINTENANCE_AUTO, PUBLIC_MAINTENANCE_MESSAGE } from '$env/static/public';
  import MaintenanceScreen from '$lib/components/MaintenanceScreen.svelte';
  import { MetaTags, deepMerge } from "svelte-meta-tags";

  // Props from layout load
  const { data, children }: { data: PageData & {
    maintenanceMode?: boolean;
    maintenanceStart?: string;
    maintenanceEnd?: string;
    maintenanceAuto?: boolean;
    maintenanceMessage?: string;
  }; children: Snippet } = $props();

  // Merge base meta tags with page-specific ones
  // Use pageMetadata store for client-side updates, fallback to page.data for SSR
  const metaTags = $derived(
    deepMerge(data.baseMetaTags, pageMetadata || page.data.pageMetaTags || {}),
  );

  // Minimal maintenance gating derived from server-provided flags and PUBLIC env
  const maintenanceActive = $derived.by(() => {
    const serverMaintenance = data.maintenanceMode;
    const maintenanceAuto = (data.maintenanceAuto ?? false) || PUBLIC_MAINTENANCE_AUTO === 'true';
    const maintenanceStart = data.maintenanceStart || PUBLIC_MAINTENANCE_START;
    const maintenanceEnd = data.maintenanceEnd || PUBLIC_MAINTENANCE_END;

    if (maintenanceStart && maintenanceEnd) {
      const now = new Date();
      const startTime = new Date(maintenanceStart);
      const endTime = new Date(maintenanceEnd);
      const hasStarted = now >= startTime;
      const hasEnded = now >= endTime;

      if (hasStarted && hasEnded) {
        return serverMaintenance || PUBLIC_MAINTENANCE_MODE === 'true';
      }

      return maintenanceAuto ? (hasStarted && !hasEnded) : (hasStarted || serverMaintenance);
    }

    return serverMaintenance || PUBLIC_MAINTENANCE_MODE === 'true';
  });

  onMount(async () => {
    // Initialize all stores
    theme.init();
    language.init();
    language.initStrings(data.strings); // Initialize with page data
    dataLanguage.init();
    fontSize.init();
    categories.init();
    settings.init();
    storyCount.init();
    experimental.init();

    // Initialize OverlayScrollbars on the body element
    if (browser && document.body) {
      // Check if we're on mobile
      const isMobile = window.innerWidth < 768;

      // Add the initialization attribute to prevent flickering
      document.body.setAttribute("data-overlayscrollbars-initialize", "");
      document.documentElement.setAttribute(
        "data-overlayscrollbars-initialize",
        "",
      );

      // OverlayScrollbars setup with mobile-specific options
      const [initialize] = useOverlayScrollbars({
        defer: true,
        options: {
          scrollbars: {
            visibility: isMobile ? "hidden" : "auto", // Hide scrollbar on mobile, show on desktop
          },
        },
      });

      // Initialize OverlayScrollbars on the body
      initialize(document.body);
    }
  });
</script>

<MetaTags {...metaTags} />

{#if maintenanceActive}
  <MaintenanceScreen />
{:else}
  {@render children()}
{/if}
