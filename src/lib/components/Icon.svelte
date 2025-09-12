<script lang="ts">
  import { iconService, type IconData } from "$lib/services/iconService";

  // Props
  interface Props {
    icon: string;
    class?: string;
    size?: string;
    width?: number | string;
    height?: number | string;
  }

  let { icon, class: className = "", size, width, height }: Props = $props();

  // State for the fetched icon data
  let iconData = $state<IconData | null>(null);
  let loadingState = $state<"idle" | "loading" | "success" | "error">("idle");

  // Reactive effect to fetch icon data when the icon name changes
  $effect(() => {
    if (!icon) {
      iconData = null;
      loadingState = "idle";
      return;
    }

    // IMMEDIATE synchronous check for cached icons
    const cachedIcon = iconService.getCachedIcon(icon);
    if (cachedIcon) {
      iconData = cachedIcon;
      loadingState = "success";
      return;
    }

    // For uncached icons, start loading immediately
    loadingState = "loading";
    iconData = null;

    let isCancelled = false;

    // Start fetching the icon
    iconService
      .getIcon(icon)
      .then((data) => {
        if (!isCancelled) {
          iconData = data;
          loadingState = data ? "success" : "error";
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          // Only log warnings for unexpected errors, not missing icons
          if (!(error instanceof Error) || !error.message.includes('not found')) {
            console.warn(`Failed to load icon: ${icon}`, error);
          }
          iconData = null;
          loadingState = "error";
        }
      });

    // Cleanup function to prevent state updates on unmounted components
    return () => {
      isCancelled = true;
    };
  });

  // Compute final class string
  const finalClass = $derived(() => {
    let classes = className;
    if (size) {
      classes += ` ${size}`;
    }
    return classes;
  });
</script>

{#if loadingState === "success" && iconData}
  <!-- Render the icon as an inline SVG with a dynamic viewBox -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="{iconData.left} {iconData.top} {iconData.width} {iconData.height}"
    class={finalClass()}
    width={width}
    height={height}
    aria-hidden="true"
    role="img"
    fill="currentColor"
  >
    {@html iconData.body}
  </svg>
{:else if loadingState === "loading"}
  <!-- Reserve space to avoid layout shift while loading -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class="{finalClass()} opacity-0"
    aria-hidden="true"
    role="img"
  />
{:else if loadingState === "error"}
  <!-- Show fallback globe icon for errors -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class="{finalClass()} opacity-50"
    aria-hidden="true"
    role="img"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9zm0 0c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3s4.5 4.03 4.5 9-2.015 9-4.5 9zm-9-9a9 9 0 1118 0 9 9 0 01-18 0z"
    />
  </svg>
{/if}
