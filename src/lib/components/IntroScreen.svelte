<script lang="ts">
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import 'overlayscrollbars/overlayscrollbars.css';

// Props
interface Props {
	visible?: boolean;
	onClose?: () => void;
}

let { visible = false, onClose }: Props = $props();

// OverlayScrollbars setup
let scrollableElement: HTMLElement | undefined = $state(undefined);
let [initialize, instance] = useOverlayScrollbars({
	defer: true,
});

function handleClose() {
	// Scroll to top of the page
	if (browser) {
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
	if (onClose) onClose();
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && visible) {
		handleClose();
	}
}

// Close on escape key
$effect(() => {
	if (browser) {
		if (visible) {
			document.addEventListener('keydown', handleKeydown);
		} else {
			document.removeEventListener('keydown', handleKeydown);
		}

		// Cleanup
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	}
});

// Initialize OverlayScrollbars
$effect(() => {
	if (scrollableElement) {
		initialize(scrollableElement);
	}
});
</script>

{#if visible}
  <div
    bind:this={scrollableElement}
    class="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-gray-900"
    data-overlayscrollbars-initialize
  >
    <div class="flex min-h-full items-center justify-center p-4 sm:p-8">
      <div class="w-full max-w-3xl rounded-lg bg-white p-8 dark:bg-gray-800">
        <div class="mb-8 flex items-start justify-between">
          <div class="w-full">
            <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              {s("app.title") || "Kite"}
            </h1>
            <p class="text-gray-600 dark:text-gray-300">
              {s("about.subtitle") || "News app by Kagi"}
            </p>
          </div>
        </div>

        <div class="space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2
              class="mb-3 text-xl font-semibold text-gray-900 dark:text-white"
            >
              {@html s("about.why.title") || "Why Kite?"}
            </h2>
            <p class="mb-4">
              {@html s("about.why.description") ||
                "Kite provides a better way to read news."}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-xl font-semibold text-gray-900 dark:text-white"
            >
              {@html s("about.approach.title") || "Our Approach"}
            </h2>
            <p class="mb-4 text-gray-700 dark:text-gray-300">
              {@html s("about.approach.description1") ||
                "We aggregate news from multiple sources."}
            </p>
            <p class="mb-4 text-gray-700 dark:text-gray-300">
              {@html s("about.approach.description2") ||
                "We provide summaries and context."}
            </p>
            <p class="mb-4 text-gray-700 dark:text-gray-300">
              {@html s("about.approach.description3") ||
                "We respect your privacy."}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-xl font-semibold text-gray-900 dark:text-white"
            >
              {@html s("about.principles.title") || "Our Principles"}
            </h2>
            <ul class="space-y-2">
              <li>
                • {s("about.principles.item1") || "No tracking or cookies"}
              </li>
              <li>
                • {s("about.principles.item2") || "No ads or sponsored content"}
              </li>
              <li>
                • {s("about.principles.item3") || "Multiple perspectives"}
              </li>
              <li>• {s("about.principles.item4") || "Source transparency"}</li>
              <li>• {s("about.principles.item5") || "Fast and lightweight"}</li>
              <li>• {s("about.principles.item6") || "Open source"}</li>
            </ul>
          </section>

          <section>
            <h2
              class="mb-3 text-xl font-semibold text-gray-900 dark:text-white"
            >
              {@html s("about.customization.title") || "Customization"}
            </h2>
            <p>
              {@html s("about.customization.description") ||
                "Customize Kite to fit your reading preferences."}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-xl font-semibold text-gray-900 dark:text-white"
            >
              {@html s("about.contact.title") || "Contact"}
            </h2>
            <p>
              {@html s("about.contact.description") ||
                "Questions or feedback? Contact us at news@kagi.com"}
            </p>
          </section>

          <!-- Disclaimer -->
          <section class="mt-6 rounded-lg bg-gray-100 dark:bg-gray-700 p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
              {s("app.disclaimerAutoGenerated") ||
                "Summaries are AI-generated and Kite can make mistakes."}
              {" "}
              {s("app.disclaimerVerify") ||
                "Please verify important information."}
            </p>
          </section>

          <div class="mt-8 flex justify-center">
            <button
              onclick={handleClose}
              class="focus:ring-opacity-75 rounded-lg bg-black px-6 py-3 font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:outline-none"
            >
              {@html s("about.understand.button") || "Got it!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
