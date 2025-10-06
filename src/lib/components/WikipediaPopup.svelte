<script lang="ts">
import BaseModal from './BaseModal.svelte';

// Props
interface Props {
	visible: boolean;
	title: string;
	content: string;
	imageUrl?: string;
	onClose: () => void;
}

let { visible, title, content, imageUrl, onClose }: Props = $props();
</script>

<BaseModal
  isOpen={visible}
  {onClose}
  {title}
  size="md"
  position="center"
  ariaLabel="Wikipedia article information"
>
  <div class="p-6">
    {#if imageUrl}
      <img
        src={imageUrl}
        alt={title}
        class="mb-4 w-full rounded-lg h-full object-contain"
      />
    {/if}
    <p class="text-gray-700 dark:text-gray-300">{content}</p>
    <a
      href="https://en.wikipedia.org/wiki/{encodeURIComponent(title)}"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-4 inline-block text-blue-500 hover:underline"
    >
      Read more on Wikipedia →
    </a>
  </div>
</BaseModal>
